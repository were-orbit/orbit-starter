import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ParticleField } from "@orbit/ui/particle-field";
import emptyRoomSrc from "@/assets/figures/empty-room.png";

/**
 * Full-viewport landing shown when the API rejects sign-in because the
 * email isn't on the accepted waitlist. Mirrors the post-onboarding
 * `WaitlistThankYou` screen in `pages/onboarding.tsx` — same empty-room
 * particle figure and scrims — with a single CTA into the request-access
 * flow so the dead-end becomes a soft entry point instead of raw JSON.
 *
 * The login page and the `_auth/login` route redirect here on detection
 * of the waitlist-blocked server error (see `lib/waitlist-error.ts`).
 */
export function WaitlistPage() {
  const typingImpulse = useRef(0);
  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-background">
      <ParticleField
        src={emptyRoomSrc}
        sampleStep={3}
        threshold={38}
        dotSize={0.95}
        renderScale={1}
        align="center"
        typingImpulseRef={typingImpulse}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 800px at 50% 55%, transparent 40%, color-mix(in srgb, var(--background) 85%, transparent) 95%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--background) 55%, transparent) 38%, color-mix(in srgb, var(--background) 88%, transparent) 70%, var(--background) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%]"
        style={{
          background:
            "radial-gradient(420px 220px at 50% 78%, color-mix(in srgb, var(--background) 85%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6 pb-16 text-center">
        <div
          className="pointer-events-none font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/55"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
        >
          Invite-only, for now
        </div>
        <h1
          className="pointer-events-none max-w-xl font-heading text-3xl leading-tight md:text-4xl"
          style={{ textShadow: "0 1px 24px rgba(0,0,0,0.65)" }}
        >
          This room's full.
        </h1>
        <p
          className="pointer-events-none max-w-md text-sm leading-relaxed text-foreground/70"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
        >
          Orbit is invite-only right now. Join the waitlist and we'll email
          you when there's space.
        </p>
        <Link
          to="/request-access"
          className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background text-sm transition-opacity hover:opacity-90"
        >
          Join the waitlist
        </Link>
      </div>
    </div>
  );
}
