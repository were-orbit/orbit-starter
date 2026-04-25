import {
  createFileRoute,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import {
  ParticleField,
} from "@orbit/ui/particle-field";
import { AuthSplitLayout } from "@orbit/ui/auth-split-layout";
import teamSrc from "@/assets/figures/onboarding-team.png";
import welcomeSrc from "@/assets/figures/welcome.png";
import {
  AuthLayoutProvider,
  useAuthTypingImpulse,
} from "@/lib/auth-layout-context";
import { WWW_URL } from "@/lib/urls";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthLayoutProvider>
      <AuthLayoutShell />
    </AuthLayoutProvider>
  );
}

function AuthLayoutShell() {
  const typingImpulseRef = useAuthTypingImpulse();
  const { pathname } = useLocation();
  const isRequestAccess = pathname.startsWith("/request-access");
  const src = isRequestAccess ? teamSrc : welcomeSrc;

  return (
    <AuthSplitLayout
        rightClassName="lg:w-[620px]"
        left={
          <>
            <ParticleField
              src={src}
              sampleStep={3}
              threshold={34}
              dotSize={1}
              renderScale={1}
              align="center"
              typingImpulseRef={typingImpulseRef}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(900px 600px at 50% 50%, transparent 45%, color-mix(in srgb, var(--background) 88%, transparent) 92%)",
              }}
            />

            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-12">
              <a
                href={`${WWW_URL}/`}
                className="pointer-events-auto flex items-center gap-2 font-mono text-sm"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
                <span className="tracking-[0.2em] uppercase">Orbit</span>
              </a>
              {isRequestAccess ? (
                <div className="max-w-md">
                  <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                    We're letting teams in slowly
                  </div>
                  <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
                    Orbit is shaped by its earliest teams. Tell us about yours
                    and we'll reach out when there's space in the room.
                  </p>
                </div>
              ) : (
                <div className="max-w-md">
                  <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
                    A quieter internet
                  </div>
                  <p className="mt-3 font-heading text-xl leading-snug md:text-2xl">
                    "We built Orbit for the people we walk beside — the ones
                    whose dust settles into ours."
                  </p>
                  <div className="mt-6 font-mono text-muted-foreground text-xs uppercase tracking-[0.2em]">
                    — The founders
                  </div>
                </div>
              )}
            </div>
          </>
        }
        right={<Outlet />}
      />
  );
}
