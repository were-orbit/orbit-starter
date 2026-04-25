import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { ConnectGithubForm } from "@/components/connect-github-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export function ConnectGithubPage({
  initialCheckoutId = "",
}: {
  initialCheckoutId?: string;
}) {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-10 md:px-12 md:pt-16 md:pb-14">
        <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
          Connect GitHub
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Claim your access.{" "}
          <span className="text-muted-foreground">One form.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Paste your checkout ID and the GitHub username you want added to
          were-orbit/orbit. We send an invitation you can accept from
          GitHub — no license keys, no copying secrets into a terminal.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-2xl px-6 pb-24 md:px-12">
        <ConnectGithubForm initialCheckoutId={initialCheckoutId} />

        <p className="mt-6 text-muted-foreground text-xs leading-relaxed">
          Lost your checkout ID? Open the confirmation link from Polar in
          your inbox — the ID is in the URL. Still stuck? Reply to that
          email and we'll sort it.
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
