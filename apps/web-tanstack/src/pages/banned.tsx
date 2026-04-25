import { useRef } from "react";
import { ParticleField } from "@orbit/ui/particle-field";
import emptyRoomSrc from "@/assets/figures/empty-room.png";

/**
 * Full-viewport landing shown when the API rejects sign-in because the
 * account has been banned by an app admin (`BANNED_USER`). Mirrors the
 * waitlist screen so the dead-end feels intentional instead of dropping
 * the visitor on the raw better-auth JSON response.
 *
 * The login route and the magic-link verify interceptor (in
 * `apps/api/src/app.ts`) redirect here on detection of the banned-user
 * server error (see `lib/banned-error.ts`).
 */
export function BannedPage() {
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
          Access revoked
        </div>
        <h1
          className="pointer-events-none max-w-xl font-heading text-3xl leading-tight md:text-4xl"
          style={{ textShadow: "0 1px 24px rgba(0,0,0,0.65)" }}
        >
          You're outside the orbit.
        </h1>
        <p
          className="pointer-events-none max-w-md text-sm leading-relaxed text-foreground/70"
          style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
        >
          This account has been suspended. If you think it's a mistake,
          reach out to support and we'll take another look.
        </p>
      </div>
    </div>
  );
}
