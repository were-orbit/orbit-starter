import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";

export const meta = {
  title: "Realtime events & presence",
  description:
    "One WebSocket connection per tab. A channel-based pub/sub hub. Domain events in, ServerEvent DTOs out.",
};

export function RealtimeEventsPage() {
  return (
    <DocsLayout
      kicker="02 · Concepts"
      title={meta.title}
      description={meta.description}
      path="/docs/concepts/realtime-events"
    >
      <DocsP>
        Orbit ships realtime out of the box: every open tab holds a WebSocket
        to the API, and every domain event that happens — a member joining, a
        role changing, a subscription updating — lands in every other tab
        within a tick. The mechanism is deliberately small: no external broker,
        no Redis, no Pusher — an in-process pub/sub hub that reads from the
        event bus.
      </DocsP>

      <DocsCallout kind="warn">
        In-process means in-process: one API node equals one hub. Scale beyond
        a single node by replacing <DocsCode>InProcessRealtimeHub</DocsCode>{" "}
        with a Redis or NATS-backed implementation of the same interface, or
        by sticky-routing WebSockets to the node that owns the workspace.
      </DocsCallout>

      <DocsH2>Channels</DocsH2>
      <DocsP>
        The hub is pub/sub over string channel IDs. Three helpers name them
        consistently:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/realtime/hub.ts">
        {`export const channels = {
  workspace: (id: string) => \`workspace:\${id}\`,
  room:      (id: string) => \`room:\${id}\`,
  member:    (id: string) => \`member:\${id}\`,
};`}
      </DocsCodeBlock>
      <DocsTable
        columns={["Channel", "Who subscribes", "What lands here"]}
        rows={[
          [
            <DocsCode>workspace:{"{id}"}</DocsCode>,
            "Every socket for members of the workspace",
            "Members, roles, teams, subscriptions — anything workspace-wide.",
          ],
          [
            <DocsCode>room:{"{id}"}</DocsCode>,
            "Only sockets subscribed to that room",
            "Room-scoped events. Useful for feature folders that add their own channels.",
          ],
          [
            <DocsCode>member:{"{id}"}</DocsCode>,
            "Every socket for one workspace-member",
            "Direct signals to one member across their open tabs.",
          ],
        ]}
      />

      <DocsH2>The connection lifecycle</DocsH2>
      <DocsP>
        The WebSocket controller lives at{" "}
        <DocsCode>apps/api/src/interfaces/ws/</DocsCode>. Each connection
        follows the same four steps:
      </DocsP>
      <DocsList ordered>
        <li>
          <strong>Upgrade at <DocsCode>/v1/ws</DocsCode>.</strong> The handler
          resolves the session from cookies, reads{" "}
          <DocsCode>?workspace=&lt;slug&gt;</DocsCode>, and verifies the user
          is a member of the workspace. Authentication runs during the HTTP
          upgrade — a mismatch writes{" "}
          <DocsCode>HTTP/1.1 401 Unauthorized</DocsCode> back and aborts the
          handshake before any WebSocket is established.
        </li>
        <li>
          <strong>Register the socket.</strong> The controller builds a{" "}
          <DocsCode>SocketHandle</DocsCode> (id, send, close, workspaceId,
          workspaceMemberId, userId) and hands it to{" "}
          <DocsCode>hub.registerSocket(sock, [workspace, member])</DocsCode>.
          The member channel lets the presence tracker count sockets per
          member.
        </li>
        <li>
          <strong>Stream ServerEvents.</strong> Every{" "}
          <DocsCode>hub.broadcast(channel, event)</DocsCode> serializes to
          JSON and ships to matching sockets.
        </li>
        <li>
          <strong>Heartbeat &amp; cleanup.</strong> A 25-second ping loop
          terminates sockets that don't pong. On{" "}
          <DocsCode>close</DocsCode>, the hub unregisters the socket and the
          presence tracker emits a <DocsCode>presence.update</DocsCode> if
          this was the member's last connection.
        </li>
      </DocsList>

      <DocsH2>How domain events become ServerEvents</DocsH2>
      <DocsP>
        <DocsCode>RealtimeEventPublisher</DocsCode> is a projector. It
        subscribes to each event type on the bus and translates them, one by
        one, into <DocsCode>ServerEvent</DocsCode> DTOs (declared in{" "}
        <DocsCode>@orbit/shared/realtime</DocsCode>). A typical handler
        re-reads the committed aggregate, hydrates the DTO it needs, and
        broadcasts:
      </DocsP>
      <DocsCodeBlock>
        {`this.bus.subscribe<WorkspaceMemberJoined>(
  "workspaces.member.joined",
  async (event) => {
    const dto = await this.uow.read(async (tx) => {
      const m = await tx.workspaceMembers.findById(event.memberId);
      if (!m) return null;
      const [user, role] = await Promise.all([
        tx.users.findById(m.userId),
        tx.workspaceRoles.findById(m.roleSnapshot.id),
      ]);
      return workspaceMemberToDTO(m, user, role);
    });
    if (!dto) return;
    this.hub.broadcast(channels.workspace(event.workspaceId), {
      type: "workspace.member.joined",
      member: dto,
    });
  },
);`}
      </DocsCodeBlock>
      <DocsCallout>
        The projector's <DocsCode>uow.read()</DocsCode> can come back empty if
        the aggregate was deleted in a racing transaction between the commit
        and the broadcast. The handler silently drops that event — clients
        never see a broadcast about a row that no longer exists.
      </DocsCallout>

      <DocsH2>Presence</DocsH2>
      <DocsP>
        <DocsCode>PresenceTracker</DocsCode> keeps a per-workspace set of
        online members and flips them on/off based on socket counts:
      </DocsP>
      <DocsList>
        <li>
          First socket for a member → broadcast{" "}
          <DocsCode>presence.update</DocsCode> (online: true) on the workspace
          channel.
        </li>
        <li>
          Last socket closes → broadcast{" "}
          <DocsCode>presence.update</DocsCode> (online: false).
        </li>
        <li>
          Idle sockets between join/leave don't re-broadcast — presence only
          flips on transitions.
        </li>
      </DocsList>
      <DocsP>
        The client side keeps the current presence set in a dedicated store,
        so the sidebar "online now" indicators react without any polling.
      </DocsP>

      <DocsH2>On the client</DocsH2>
      <DocsP>
        <DocsCode>apps/web-tanstack/src/lib/db/realtime.ts</DocsCode> holds the
        whole client. It opens a WebSocket pointed at{" "}
        <DocsCode>{"${VITE_API_URL}/v1/ws?workspace=${slug}"}</DocsCode>, parses
        each message, and dispatches into a set of entity stores:
      </DocsP>
      <DocsCodeBlock>
        {`function applyServerEvent(event: ServerEvent): void {
  switch (event.type) {
    case "workspace.member.joined":
      membersStore.insert(event.member);
      return;
    case "workspace.member.role_changed":
      membersStore.update(event.member.id, event.member);
      return;
    case "workspace.role.created":
      rolesStore.insert(event.role);
      return;
    case "presence.update":
      presenceStore.set(event.memberId, event.online);
      return;
    // ...one case per ServerEvent type
  }
}`}
      </DocsCodeBlock>
      <DocsP>
        The stores are TanStack Stores keyed by entity id. Components read
        them via hooks (<DocsCode>useMember</DocsCode>,{" "}
        <DocsCode>useRoles</DocsCode>, etc.) and re-render on change — no
        React Query invalidations needed, no polling, no websocket logic in
        the component tree.
      </DocsP>
      <DocsCallout>
        React Query still handles initial hydration and the rare
        request-response call. Realtime owns the "something changed somewhere
        else" case; React Query owns "I asked for something."
      </DocsCallout>

      <DocsH2>Adding an event</DocsH2>
      <DocsList ordered>
        <li>
          Emit a new <DocsCode>DomainEvent</DocsCode> from the aggregate.
        </li>
        <li>
          Add a matching entry to the <DocsCode>ServerEvent</DocsCode> union in{" "}
          <DocsCode>@orbit/shared/realtime</DocsCode>.
        </li>
        <li>
          Subscribe to it in <DocsCode>RealtimeEventPublisher</DocsCode> and
          broadcast on the appropriate channel.
        </li>
        <li>
          Handle it on the client in <DocsCode>applyServerEvent</DocsCode> —
          TypeScript will complain until you've covered every case.
        </li>
      </DocsList>
      <DocsP>
        The full event catalog — every ServerEvent with its payload shape —
        will live under <em>Reference → Realtime event catalog</em>.
      </DocsP>
    </DocsLayout>
  );
}
