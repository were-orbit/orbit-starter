import { AppearancePicker } from "@orbit/ui/appearance-picker";
import { useUpdatePreferencesMutation } from "@/lib/mutations";
import { SettingsSection } from "@/pages/workspace-settings/shared";

export function WorkspaceAppearancePage() {
  const mutation = useUpdatePreferencesMutation();

  return (
    <div className="space-y-10">
      <SettingsSection
        title="Appearance"
        description="Customize how Orbit looks across your devices. Changes apply immediately."
      >
        <AppearancePicker
          onPersist={(input) => {
            mutation.mutate(input);
          }}
        />
      </SettingsSection>
    </div>
  );
}
