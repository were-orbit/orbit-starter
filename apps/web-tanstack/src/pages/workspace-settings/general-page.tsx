import { Label } from "@orbit/ui/label";
import { useWorkspaceSlug } from "@/lib/use-workspace-slug";
import { useWorkspace } from "@/lib/workspace";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function WorkspaceGeneralPage() {
  const ws = useWorkspace();
  const workspaceSlug = useWorkspaceSlug() ?? ws?.slug;
  if (!ws || !workspaceSlug) return null;

  return (
    <div className="space-y-10">
      <SettingsSection title="General" description="How this workspace appears in Orbit.">
        <div className="space-y-4 rounded-xl bg-card/40 p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Name</Label>
            <p className="text-[15px] font-medium">{ws.name}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">URL slug</Label>
            <p className="font-mono text-[13px] text-muted-foreground">/d/{ws.slug}</p>
            <p className="text-[12px] text-muted-foreground leading-snug [text-wrap:pretty]">
              Slug and billing are not editable here yet; they will live in this screen as we wire up
              the API.
            </p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
