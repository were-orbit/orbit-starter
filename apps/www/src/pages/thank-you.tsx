import { AmbientGrain } from "@orbit/ui/ambient-grain";
import { ConnectGithubForm } from "@/components/connect-github-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export function ThankYouPage({
  initialCheckoutId = "",
}: {
  initialCheckoutId?: string;
}) {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-background font-mono text-foreground">
      <AmbientGrain />
      <SiteHeader />

      <section className="relative z-10 mx-auto max-w-3xl px-6 pt-10 pb-10 md:px-12 md:pt-16 md:pb-14">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1 text-[11px] text-muted-foreground uppercase tracking-[0.2em] backdrop-blur">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
          Payment received
        </div>
        <h1 className="mt-4 font-medium text-4xl leading-[1.05] tracking-tight md:text-[52px]">
          Thanks — you're in.{" "}
          <span className="text-muted-foreground">One more step.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-muted-foreground text-sm leading-relaxed md:text-base">
          Pop your GitHub username in below and we'll invite you to
          were-orbit/orbit. You'll get a GitHub notification within a few
          seconds. Then run{" "}
          <code className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-foreground">
            npx create-orb@latest
          </code>{" "}
          and you're off.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-2xl px-6 pb-16 md:px-12">
        <ConnectGithubForm initialCheckoutId={initialCheckoutId} />
      </section>

      <section className="relative z-10 mx-auto max-w-2xl px-6 pb-24 md:px-12">
        <div className="rounded-xl border border-dashed border-border/60 p-6">
          <div className="text-[11px] text-muted-foreground uppercase tracking-[0.25em]">
            What you just bought
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {INCLUDED.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[1rem_1fr] items-baseline gap-3"
              >
                <span className="text-muted-foreground">›</span>
                <span className="text-foreground/90 leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

const INCLUDED = [
  "Full access to were-orbit/orbit — the private monorepo",
  "Every paid feature in the configurator: billing, teams, uploads, waitlist, jobs, email",
  "Lifetime updates — every release pushes to the same repo",
  "Scaffold unlimited products from the CLI",
];
