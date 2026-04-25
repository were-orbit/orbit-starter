import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { log } from "evlog";
import { WebSocketServer, type WebSocket } from "ws";
import type { ClientEvent, ServerEvent } from "@orbit/shared/realtime";
import type { AppContainer } from "@/composition.ts";
import type { UserId } from "@/identity/domain/user.ts";
import { channels, type SocketHandle } from "@/realtime/hub.ts";
import type { WorkspaceMemberId } from "@/workspaces/domain/workspace-member.ts";

const WS_PATH = "/v1/ws";
const HEARTBEAT_MS = 25_000;

function toRequestHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
      continue;
    }
    if (typeof value === "string") headers.set(key, value);
  }
  return headers;
}

interface ConnectionContext {
  workspaceId: string;
  workspaceMemberId: WorkspaceMemberId;
  userId: UserId;
}

/**
 * Workspace-scoped WebSocket endpoint. The kit uses realtime for
 * presence + fan-out of workspace, team, and billing events only —
 * feature modules built on top of the kit can layer their own event
 * kinds on the same socket by extending `ServerEvent` / `ClientEvent`
 * in `@orbit/shared/realtime`.
 */
export class WebSocketController {
  private readonly wss: WebSocketServer;
  private heartbeat?: NodeJS.Timeout;

  constructor(private readonly container: AppContainer) {
    this.wss = new WebSocketServer({ noServer: true });
  }

  attachTo(server: Server): void {
    server.on("upgrade", (req, socket, head) => {
      const url = req.url ?? "";
      const pathOnly = url.split("?")[0];
      if (pathOnly !== WS_PATH) {
        socket.destroy();
        return;
      }
      this.handleUpgrade(req, socket, head);
    });

    this.heartbeat = setInterval(() => {
      for (const client of this.wss.clients) {
        const ws = client as WebSocket & { isAlive?: boolean };
        if (ws.isAlive === false) {
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, HEARTBEAT_MS);
  }

  close(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.wss.close();
  }

  private async handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
  ): Promise<void> {
    try {
      const ctx = await this.authenticate(req);
      if (!ctx) {
        log.warn({ action: "ws.upgrade_rejected", reason: "unauthenticated" });
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.onConnection(ws, ctx);
      });
    } catch (err) {
      log.error({
        action: "ws.upgrade_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      try {
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      } finally {
        socket.destroy();
      }
    }
  }

  private async authenticate(req: IncomingMessage): Promise<ConnectionContext | null> {
    const authSession = await this.container.auth.api.getSession({
      headers: toRequestHeaders(req),
    });
    const userId = authSession?.user?.id as UserId | undefined;
    if (!userId) return null;

    const url = new URL(req.url ?? "/", "http://localhost");
    const workspaceSlug = url.searchParams.get("workspace");
    if (!workspaceSlug) return null;

    return this.container.uow.read(async (tx) => {
      const ws = await tx.workspaces.findBySlug(workspaceSlug);
      if (!ws) return null;

      const member = await tx.workspaceMembers.findByWorkspaceAndUser(
        ws.id,
        userId,
      );
      if (!member) return null;

      return {
        workspaceId: ws.id,
        workspaceMemberId: member.id,
        userId,
      };
    });
  }

  private onConnection(ws: WebSocket, ctx: ConnectionContext): void {
    const tracked = ws as WebSocket & { isAlive?: boolean };
    tracked.isAlive = true;
    tracked.on("pong", () => {
      tracked.isAlive = true;
    });

    const send = (event: ServerEvent) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    };

    const handle: SocketHandle = {
      id: randomUUID(),
      send,
      close: () => ws.close(),
      workspaceId: ctx.workspaceId,
      workspaceMemberId: ctx.workspaceMemberId,
      userId: ctx.userId,
    };

    const subscriptions = [
      channels.workspace(ctx.workspaceId),
      channels.member(ctx.workspaceMemberId),
    ];
    this.container.hub.registerSocket(handle, subscriptions);
    this.container.presence.attach(handle);

    log.info({
      action: "ws.connected",
      socketId: handle.id,
      workspace: { id: ctx.workspaceId },
      member: { id: ctx.workspaceMemberId },
      user: { id: ctx.userId },
    });

    send({
      type: "hello",
      workspaceMemberId: ctx.workspaceMemberId,
      serverTime: this.container.clock.now().getTime(),
    });

    ws.on("message", (raw) => {
      let event: ClientEvent | null = null;
      try {
        event = JSON.parse(raw.toString()) as ClientEvent;
      } catch {
        return;
      }
      this.handleClientEvent(handle, event);
    });

    const cleanup = (reason: "close" | "error", err?: Error) => {
      this.container.hub.unregisterSocket(handle);
      this.container.presence.detach(handle);
      const evt = {
        action: "ws.disconnected",
        socketId: handle.id,
        workspace: { id: ctx.workspaceId },
        member: { id: ctx.workspaceMemberId },
        reason,
        error: err?.message,
      };
      if (reason === "error") log.warn(evt);
      else log.info(evt);
    };
    ws.on("close", () => cleanup("close"));
    ws.on("error", (err) => cleanup("error", err));
  }

  private handleClientEvent(socket: SocketHandle, event: ClientEvent): void {
    if (!event || typeof event !== "object" || typeof event.type !== "string") {
      return;
    }
    switch (event.type) {
      case "ping":
        return;
      case "presence.away":
        this.container.presence.markAway(socket);
        return;
      case "presence.back":
        this.container.presence.markBack(socket);
        return;
    }
  }
}
