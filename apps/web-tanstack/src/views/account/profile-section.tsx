import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { toastManager } from "@orbit/ui/toast";
import { authClient } from "@/lib/auth-client";
import { useMeUser } from "@/lib/use-me-user";
import { meQueryOptions } from "@/lib/queries/session";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function ProfileSection(): React.ReactElement | null {
  const me = useMeUser();
  const qc = useQueryClient();
  const [name, setName] = useState(me?.name ?? "");
  const [saving, setSaving] = useState(false);

  if (!me) return null;

  async function save() {
    setSaving(true);
    const res = await authClient.updateUser({ name });
    if (res.error) {
      toastManager.add({
        type: "error",
        title: "Could not save name",
        description: res.error.message,
        timeout: 5000,
      });
    } else {
      await qc.invalidateQueries({ queryKey: meQueryOptions.queryKey });
    }
    setSaving(false);
  }

  const trimmed = name.trim();
  const dirty = trimmed.length > 0 && trimmed !== me.name;

  return (
    <SettingsSection
      title="Profile"
      description="Update your display name."
    >
      <div className="max-w-sm space-y-3">
        <Label htmlFor="account-name">Name</Label>
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </SettingsSection>
  );
}
