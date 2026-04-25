import { SettingsSection } from "@/pages/workspace-settings/shared";

export function WorkspaceIntegrationsPage() {
  return (
    <div className="space-y-10">
      <SettingsSection
        title="Integrations"
        description="Connect Orbit to the tools your team already uses."
      >
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-6 text-center text-[13px] text-muted-foreground [text-wrap:pretty]">
          Integrations will appear here as we ship them.
        </div>
      </SettingsSection>
    </div>
  );
}
