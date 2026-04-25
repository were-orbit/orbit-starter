import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";

export const meta = {
  title: "Audit log",
  description:
    "Append-only ledger at two scopes — tenant and app-wide. Entries are projected from the domain event bus so services never write audit rows directly.",
};

export function AuditLogIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/audit-log"
    >
      <DocsP>
        Orbit ships a first-class audit log bounded context in{" "}
        <DocsCode>apps/api/src/audit/</DocsCode>. It exposes two entry types
        that share one interface — a tenant-scoped log read by workspace
        admins, and an app-wide log read by platform admins. Entries are
        materialised by a post-commit projector subscribed to the domain
        event bus, so services do not touch audit rows and cannot forget to
        log.
      </DocsP>

      <DocsCallout kind="note">
        <strong>Paid feature.</strong> The audit log ships with the paid
        track. Scaffold with <DocsCode>--audit-log=yes</DocsCode> (the
        default when any paid feature is on) to keep it, or{" "}
        <DocsCode>--audit-log=no</DocsCode> to strip the bounded context,
        its repositories, the two Prisma models, and the{" "}
        <DocsCode>workspace.audit_log.*</DocsCode> /{" "}
        <DocsCode>team.audit_log.view</DocsCode> permissions.
      </DocsCallout>

      <DocsH2>Two scopes, one shape</DocsH2>
      <DocsTable
        columns={["Entry", "Scope", "Who reads it"]}
        rows={[
          [
            <DocsCode>AppAuditEntry</DocsCode>,
            "App-wide",
            <>
              Platform admins (<DocsCode>user.role === "admin"</DocsCode>).
              Moderation-class events: bans, impersonations, cross-tenant
              admin operations.
            </>,
          ],
          [
            <DocsCode>WorkspaceAuditEntry</DocsCode>,
            "Per workspace (optionally narrowed by team)",
            <>
              Members with <DocsCode>workspace.audit_log.view</DocsCode>, or{" "}
              <DocsCode>team.audit_log.view</DocsCode> when{" "}
              <DocsCode>teamId</DocsCode> is set. Lifecycle of the
              workspace's own aggregates — members, roles, teams, billing.
            </>,
          ],
        ]}
      />
      <DocsP>
        Both entry types extend one <DocsCode>AuditEntry</DocsCode>{" "}
        interface in <DocsCode>audit/domain/audit-entry.ts</DocsCode>, so
        filters, pagination, and cursors behave identically across the two.
      </DocsP>

      <DocsH2>How entries get written</DocsH2>
      <DocsP>
        The audit log is a <strong>projection</strong>, not a side effect
        services opt into. When a domain event is dispatched after a
        successful commit, the projector in{" "}
        <DocsCode>audit/application/audit-projector.ts</DocsCode> maps it
        to an audit row via{" "}
        <DocsCode>audit-event-mapper.ts</DocsCode> and writes through the
        matching repository. Services stay free of audit concerns.
      </DocsP>
      <DocsCodeBlock caption="a service changes state — nothing audit-shaped in sight">
        {`await uow.run(async (tx) => {
  const workspace = await tx.workspaces.findById(workspaceId);
  workspace.rename("Acme Rocket Division");
  await tx.workspaces.save(workspace);
  tx.events.add(new WorkspaceRenamed(workspaceId, actor));
});`}
      </DocsCodeBlock>
      <DocsP>
        The <DocsCode>WorkspaceRenamed</DocsCode> event is queued on the
        Unit of Work, dispatched post-commit, and translated by the
        projector into a <DocsCode>WorkspaceAuditEntry</DocsCode> row with{" "}
        <DocsCode>action = "workspace.renamed"</DocsCode> and the relevant
        target + metadata.
      </DocsP>

      <DocsCallout kind="note">
        <strong>Post-commit only.</strong> The projector runs after the
        transaction commits, not inside it. A rolled-back transaction
        produces no audit entry — by design. Audit rows never disagree with
        business state.
      </DocsCallout>

      <DocsH2>Metadata sanitisation</DocsH2>
      <DocsP>
        Domain events carry whatever payload the aggregate needs. Before an
        entry is persisted, payloads pass through{" "}
        <DocsCode>audit/application/sanitize-metadata.ts</DocsCode>, which
        strips known PII-flavoured keys (tokens, secrets, raw credentials)
        and truncates oversized blobs. Unit-tested in{" "}
        <DocsCode>sanitize-metadata.test.ts</DocsCode>.
      </DocsP>

      <DocsH2>Permissions</DocsH2>
      <DocsTable
        columns={["Permission", "Scope", "Grants"]}
        rows={[
          [
            <DocsCode>workspace.audit_log.view</DocsCode>,
            "Workspace",
            "Read the workspace's audit stream with filters and pagination.",
          ],
          [
            <DocsCode>workspace.audit_log.export</DocsCode>,
            "Workspace",
            "Export audit entries (CSV/JSON) for compliance review.",
          ],
          [
            <DocsCode>team.audit_log.view</DocsCode>,
            "Team (requires the teams feature)",
            <>
              Read workspace entries narrowed by{" "}
              <DocsCode>teamId</DocsCode>. Granted to team admins by default.
            </>,
          ],
        ]}
      />
      <DocsP>
        Declared once in <DocsCode>packages/shared/src/permissions.ts</DocsCode>,
        guarded server-side by <DocsCode>requirePermission(...)</DocsCode>{" "}
        and <DocsCode>requireTeamPermission(...)</DocsCode>, and surfaced
        on the client via <DocsCode>useCan()</DocsCode> /{" "}
        <DocsCode>useCanTeam()</DocsCode>.
      </DocsP>

      <DocsH2>Query surface</DocsH2>
      <DocsP>
        Two application services are registered in the composition root:{" "}
        <DocsCode>ListAppAuditService</DocsCode> and{" "}
        <DocsCode>ListWorkspaceAuditService</DocsCode>. Both accept the
        same <DocsCode>AuditFilter</DocsCode> shape and return a forward-only
        cursor page.
      </DocsP>
      <DocsCodeBlock caption="AuditFilter (audit/domain/audit-entry.ts)">
        {`export interface AuditFilter {
  actorUserId?: UserId;
  action?: string | readonly string[];
  from?: Date;
  to?: Date;
  cursor?: string; // opaque, forward-only
  limit?: number;  // clamped by the repository
}`}
      </DocsCodeBlock>

      <DocsH3>Storage</DocsH3>
      <DocsList>
        <li>
          Two tables, <DocsCode>app_audit_entries</DocsCode> and{" "}
          <DocsCode>workspace_audit_entries</DocsCode>, with composite
          indexes on <DocsCode>(scope_id, occurred_at)</DocsCode> plus
          per-action and per-actor indexes for common queries.
        </li>
        <li>
          Two adapters per table — Prisma and Drizzle — so the audit log
          works on either ORM track with no service code changes.
        </li>
        <li>
          Pagination uses an opaque cursor built from{" "}
          <DocsCode>(occurredAt, id)</DocsCode> — see{" "}
          <DocsCode>audit/infrastructure/cursor.ts</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>Turning it off</DocsH2>
      <DocsP>
        Passing <DocsCode>--audit-log=no</DocsCode> at scaffold time
        removes:
      </DocsP>
      <DocsList>
        <li>
          The entire <DocsCode>apps/api/src/audit/</DocsCode> bounded
          context.
        </li>
        <li>
          The <DocsCode>AppAuditEntry</DocsCode> and{" "}
          <DocsCode>WorkspaceAuditEntry</DocsCode> models in the Prisma
          schema (and their Drizzle mirrors on the Drizzle track).
        </li>
        <li>
          The <DocsCode>appAudit</DocsCode> and{" "}
          <DocsCode>workspaceAudit</DocsCode> repositories on the Unit of
          Work, plus the projector wiring in{" "}
          <DocsCode>composition.ts</DocsCode>.
        </li>
        <li>
          The <DocsCode>workspace.audit_log.view</DocsCode>,{" "}
          <DocsCode>workspace.audit_log.export</DocsCode>, and{" "}
          <DocsCode>team.audit_log.view</DocsCode> permissions, including
          the system-role seeds that grant them.
        </li>
        <li>
          The integration test suite at{" "}
          <DocsCode>apps/api/src/__tests__/audit.integration.test.ts</DocsCode>.
        </li>
      </DocsList>

      <DocsCallout kind="note">
        <strong>Domain events keep firing.</strong> Stripping the audit log
        does not remove any events from the domain layer — it just removes
        the projector that was listening. Other projectors (realtime,
        mailer, billing reconciliation) are untouched.
      </DocsCallout>
    </DocsLayout>
  );
}
