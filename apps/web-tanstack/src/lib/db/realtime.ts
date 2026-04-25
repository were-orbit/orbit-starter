import type { ClientEvent, ServerEvent } from "@orbit/shared/realtime";
import { WS_URL } from "@/lib/urls";
import {
  invitesStore,
  membersStore,
  presenceStore,
  rolesStore,
} from "@/lib/stores/workspace-stores";

export interface RealtimeClient {
  send: (event: ClientEvent) => void;
  close: () => void;
}

export function connectRealtime(workspaceSlug: string): RealtimeClient {
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let closed = false;
  const outbox: ClientEvent[] = [];

  const open = () => {
    if (closed) return;
    const url = `${WS_URL}/v1/ws?workspace=${encodeURIComponent(workspaceSlug)}`;
    ws = new WebSocket(url);

    ws.addEventListener("open", () => {
      reconnectAttempts = 0;
      for (const ev of outbox.splice(0)) ws?.send(JSON.stringify(ev));
    });

    ws.addEventListener("message", (e) => {
      let event: ServerEvent | null = null;
      try {
        event = JSON.parse(e.data as string) as ServerEvent;
      } catch {
        return;
      }
      if (event) applyServerEvent(event);
    });

    ws.addEventListener("close", () => {
      if (closed) return;
      const delay = Math.min(1000 * 2 ** reconnectAttempts, 15000);
      reconnectAttempts += 1;
      setTimeout(open, delay);
    });

    ws.addEventListener("error", () => {
      ws?.close();
    });
  };

  open();

  return {
    send(event) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
      } else {
        outbox.push(event);
      }
    },
    close() {
      closed = true;
      ws?.close();
    },
  };
}

function applyServerEvent(event: ServerEvent): void {
  switch (event.type) {
    case "hello":
      return;

    case "workspace.member.joined":
      membersStore.insert(event.member);
      return;
    case "workspace.member.left":
      if (membersStore.get(event.workspaceMemberId)) {
        membersStore.delete(event.workspaceMemberId);
      }
      return;
    case "workspace.member.role_changed":
      membersStore.insert(event.member);
      return;

    case "workspace.role.created":
      rolesStore.insert(event.role);
      return;
    case "workspace.role.updated":
      rolesStore.insert(event.role);
      return;
    case "workspace.role.deleted":
      if (rolesStore.get(event.roleId)) rolesStore.delete(event.roleId);
      return;


    case "presence.update": {
      presenceStore.insert({
        workspaceMemberId: event.workspaceMemberId,
        status: event.status,
        lastSeenAt: event.lastSeenAt,
      });
      return;
    }
  }
}

// Force-use to avoid "unused import" in the initial stub: invitesStore
// is populated purely by REST responses (no realtime invite events are
// emitted today), and is kept here so callers have a single import site.
void invitesStore;
