import type { ServerEvent } from "@orbit/shared/realtime";

export type ChannelId = string;

export interface SocketHandle {
  id: string;
  send: (event: ServerEvent) => void;
  close: () => void;
  workspaceId: string;
  workspaceMemberId: string;
  userId: string;
}

export interface RealtimeHub {
  subscribe(socket: SocketHandle, channels: readonly ChannelId[]): void;
  unsubscribe(socket: SocketHandle, channels: readonly ChannelId[]): void;
  registerSocket(socket: SocketHandle, channels: readonly ChannelId[]): void;
  unregisterSocket(socket: SocketHandle): void;
  broadcast(channel: ChannelId, event: ServerEvent): void;
  broadcastMany(channels: readonly ChannelId[], event: ServerEvent): void;
  socketsForMember(workspaceMemberId: string): number;
  listChannelsForSocket(socket: SocketHandle): ReadonlySet<ChannelId>;
  /** Subscribes every open socket for the member (e.g. after an @mention adds them to a room). */
  subscribeMemberToChannel(workspaceMemberId: string, channel: ChannelId): void;
}

export const channels = {
  workspace: (id: string): ChannelId => `workspace:${id}`,
  room: (id: string): ChannelId => `room:${id}`,
  member: (id: string): ChannelId => `member:${id}`,
};

export class InProcessRealtimeHub implements RealtimeHub {
  private readonly byChannel = new Map<ChannelId, Set<SocketHandle>>();
  private readonly bySocket = new Map<SocketHandle, Set<ChannelId>>();
  private readonly byMember = new Map<string, Set<SocketHandle>>();

  registerSocket(socket: SocketHandle, channels: readonly ChannelId[]): void {
    if (!this.bySocket.has(socket)) this.bySocket.set(socket, new Set());
    let members = this.byMember.get(socket.workspaceMemberId);
    if (!members) {
      members = new Set();
      this.byMember.set(socket.workspaceMemberId, members);
    }
    members.add(socket);
    this.subscribe(socket, channels);
  }

  unregisterSocket(socket: SocketHandle): void {
    const subs = this.bySocket.get(socket);
    if (subs) {
      for (const ch of subs) this.byChannel.get(ch)?.delete(socket);
    }
    this.bySocket.delete(socket);
    const members = this.byMember.get(socket.workspaceMemberId);
    if (members) {
      members.delete(socket);
      if (members.size === 0) this.byMember.delete(socket.workspaceMemberId);
    }
  }

  subscribe(socket: SocketHandle, chans: readonly ChannelId[]): void {
    let subs = this.bySocket.get(socket);
    if (!subs) {
      subs = new Set();
      this.bySocket.set(socket, subs);
    }
    for (const ch of chans) {
      subs.add(ch);
      let set = this.byChannel.get(ch);
      if (!set) {
        set = new Set();
        this.byChannel.set(ch, set);
      }
      set.add(socket);
    }
  }

  unsubscribe(socket: SocketHandle, chans: readonly ChannelId[]): void {
    const subs = this.bySocket.get(socket);
    for (const ch of chans) {
      subs?.delete(ch);
      this.byChannel.get(ch)?.delete(socket);
    }
  }

  broadcast(channel: ChannelId, event: ServerEvent): void {
    const sockets = this.byChannel.get(channel);
    if (!sockets) return;
    for (const s of sockets) {
      try {
        s.send(event);
      } catch {
        // ignore send errors
      }
    }
  }

  broadcastMany(chans: readonly ChannelId[], event: ServerEvent): void {
    const seen = new Set<SocketHandle>();
    for (const ch of chans) {
      const set = this.byChannel.get(ch);
      if (!set) continue;
      for (const s of set) {
        if (seen.has(s)) continue;
        seen.add(s);
        try {
          s.send(event);
        } catch {
          // ignore
        }
      }
    }
  }

  socketsForMember(workspaceMemberId: string): number {
    return this.byMember.get(workspaceMemberId)?.size ?? 0;
  }

  listChannelsForSocket(socket: SocketHandle): ReadonlySet<ChannelId> {
    return this.bySocket.get(socket) ?? new Set();
  }

  subscribeMemberToChannel(workspaceMemberId: string, channel: ChannelId): void {
    const sockets = this.byMember.get(workspaceMemberId);
    if (!sockets) return;
    for (const socket of sockets) {
      this.subscribe(socket, [channel]);
    }
  }
}
