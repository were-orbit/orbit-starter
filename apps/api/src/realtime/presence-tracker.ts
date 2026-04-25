import type { Clock } from "@/kernel/clock.ts";
import type { WorkspaceMemberId } from "@/workspaces/domain/workspace-member.ts";
import type { WorkspaceId } from "@/workspaces/domain/workspace.ts";
import { channels, type RealtimeHub, type SocketHandle } from "./hub.ts";

type Status = "online" | "away";

interface PresenceEntry {
  sockets: Set<SocketHandle>;
  status: Status;
  lastSeenAt: Date;
  offlineTimer?: NodeJS.Timeout;
  workspaceId: WorkspaceId;
}

const OFFLINE_GRACE_MS = 30_000;

export class PresenceTracker {
  private readonly byMember = new Map<WorkspaceMemberId, PresenceEntry>();

  constructor(
    private readonly hub: RealtimeHub,
    private readonly clock: Clock,
  ) {}

  attach(socket: SocketHandle): void {
    const memberId = socket.workspaceMemberId as WorkspaceMemberId;
    const workspaceId = socket.workspaceId as WorkspaceId;
    const now = this.clock.now();
    const entry = this.byMember.get(memberId);
    if (entry) {
      entry.sockets.add(socket);
      entry.lastSeenAt = now;
      if (entry.offlineTimer) {
        clearTimeout(entry.offlineTimer);
        entry.offlineTimer = undefined;
      }
      if (entry.status !== "online") {
        entry.status = "online";
        this.emit(workspaceId, memberId, "online", now);
      }
    } else {
      this.byMember.set(memberId, {
        sockets: new Set([socket]),
        status: "online",
        lastSeenAt: now,
        workspaceId,
      });
      this.emit(workspaceId, memberId, "online", now);
    }
  }

  detach(socket: SocketHandle): void {
    const memberId = socket.workspaceMemberId as WorkspaceMemberId;
    const entry = this.byMember.get(memberId);
    if (!entry) return;
    entry.sockets.delete(socket);
    entry.lastSeenAt = this.clock.now();
    if (entry.sockets.size === 0) {
      entry.offlineTimer = setTimeout(() => {
        const current = this.byMember.get(memberId);
        if (current && current.sockets.size === 0) {
          this.byMember.delete(memberId);
          this.emit(entry.workspaceId, memberId, "offline", this.clock.now());
        }
      }, OFFLINE_GRACE_MS);
    }
  }

  markAway(socket: SocketHandle): void {
    const memberId = socket.workspaceMemberId as WorkspaceMemberId;
    const entry = this.byMember.get(memberId);
    if (!entry || entry.status === "away") return;
    entry.status = "away";
    this.emit(entry.workspaceId, memberId, "away", this.clock.now());
  }

  markBack(socket: SocketHandle): void {
    const memberId = socket.workspaceMemberId as WorkspaceMemberId;
    const entry = this.byMember.get(memberId);
    if (!entry || entry.status === "online") return;
    entry.status = "online";
    this.emit(entry.workspaceId, memberId, "online", this.clock.now());
  }

  snapshotForWorkspace(workspaceId: WorkspaceId): Array<{
    workspaceMemberId: WorkspaceMemberId;
    status: Status;
    lastSeenAt: Date;
  }> {
    const out: Array<{
      workspaceMemberId: WorkspaceMemberId;
      status: Status;
      lastSeenAt: Date;
    }> = [];
    for (const [memberId, entry] of this.byMember) {
      if (entry.workspaceId !== workspaceId) continue;
      out.push({ workspaceMemberId: memberId, status: entry.status, lastSeenAt: entry.lastSeenAt });
    }
    return out;
  }

  private emit(
    workspaceId: WorkspaceId,
    memberId: WorkspaceMemberId,
    status: "online" | "away" | "offline",
    at: Date,
  ): void {
    this.hub.broadcast(channels.workspace(workspaceId), {
      type: "presence.update",
      workspaceMemberId: memberId,
      status,
      lastSeenAt: at.toISOString(),
    });
  }
}
