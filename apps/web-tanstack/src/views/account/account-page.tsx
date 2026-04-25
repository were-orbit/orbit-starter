import { ArrowLeftIcon } from "lucide-react";
import { ProfileSection } from "./profile-section";
import { EmailSection } from "./email-section";
import { SessionsSection } from "./sessions-section";
import { DangerZoneSection } from "./danger-zone-section";

export function AccountPage({ backHref }: { backHref: string }): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">
      <header className="space-y-2">
        <a
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </a>
        <h1 className="text-2xl font-semibold">Account settings</h1>
      </header>
      <ProfileSection />
      <EmailSection />
      <SessionsSection />
      <DangerZoneSection />
    </div>
  );
}
