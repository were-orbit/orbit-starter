import { type FormEvent, useRef, useState } from "react";
// +feature:auth-admin
import { isBannedUserError } from "@/lib/banned-error";
// -feature:auth-admin
// +feature:auth-magic-link
import { Kbd } from "@orbit/ui/kbd";
// -feature:auth-magic-link
import {
  // +feature:auth-magic-link
  useRequestMagicLinkMutation,
  // -feature:auth-magic-link
  // +feature:auth-oauth
  useSignInSocialMutation,
  // -feature:auth-oauth
} from "@/lib/mutations";
import { ApiError } from "@/lib/api/client";
import { Button } from "@orbit/ui/button";
import { Input } from "@orbit/ui/input";
import { Label } from "@orbit/ui/label";
import { Separator } from "@orbit/ui/separator";
import {
  bumpParticleTypingImpulse,
  pulseParticleSubmitImpulse,
} from "@orbit/ui/particle-field";
// +feature:auth-magic-link
import { isModEnter, primarySubmitShortcutHint } from "@/lib/keyboard-hints";
// -feature:auth-magic-link
import { API_URL, WWW_URL } from "@/lib/urls";
// +feature:auth-magic-link
import { api } from "@/lib/api/client";
// -feature:auth-magic-link
import { useAuthTypingImpulse } from "@/lib/auth-layout-context";

export function LoginPage() {
  return (
    <>
      <a
        href={`${WWW_URL}/`}
        className="absolute top-6 left-6 flex items-center gap-2 font-mono text-sm lg:hidden"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
        <span className="tracking-[0.2em] uppercase">Orbit</span>
      </a>

      <div className="w-full max-w-lg">
        <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.3em]">
          Welcome back
        </div>
        <h1 className="mt-2 font-heading text-3xl leading-tight">
          Enter your orbit
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">Sign in to continue.</p>

        {/* +feature:auth-magic-link */}
        <MagicLinkForm />
        {/* -feature:auth-magic-link */}


        {/* +feature:auth-oauth */}
        <OrSeparator />
        <OAuthButtons />
        {/* -feature:auth-oauth */}

      </div>
    </>
  );
}

function OrSeparator() {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
        or
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

// +feature:auth-magic-link
function MagicLinkForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const typingImpulse = useAuthTypingImpulse();
  const magicLink = useRequestMagicLinkMutation();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    pulseParticleSubmitImpulse(typingImpulse);
    setError(null);
    const callbackURL = `${window.location.origin}/auth/callback`;
    const normalized = email.trim().toLowerCase();
    magicLink.mutate(
      { email: normalized, callbackURL },
      {
        onSuccess: () => {
          setSentTo(normalized);
          if (import.meta.env.DEV) {
            void api.dev
              .getLastMagicLink(normalized)
              .then(({ link }) => setDevMagicLink(link ?? null))
              .catch(() => setDevMagicLink(null));
          }
        },
        onError: (err) => {
          // +feature:auth-admin
          if (isBannedUserError(err)) {
            window.location.href = "/banned";
            return;
          }
          // -feature:auth-admin
          if (import.meta.env.DEV) {
            if (
              err instanceof TypeError &&
              (err.message === "Failed to fetch" ||
                err.message === "Load failed")
            ) {
              setError(
                `Could not reach the API at ${API_URL}. Start the API (apps/api, default port 4002) and ensure CORS allows this origin.`,
              );
              return;
            }
            if (
              (err instanceof ApiError || err instanceof Error) &&
              err.message
            ) {
              setError(err.message);
              return;
            }
          }
          setError("Unable to send sign-in link right now.");
        },
      },
    );
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={(e) => {
          bumpParticleTypingImpulse(typingImpulse, e);
          if (isModEnter(e)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="magic-link-email">Email</Label>
          <Input
            id="magic-link-email"
            type="email"
            required
            placeholder="you@wereorbit.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            nativeInput
          />
        </div>

        <Button
          type="submit"
          size="lg"
          loading={magicLink.isPending}
          className="mt-2"
        >
          Send sign-in link
        </Button>
        {!sentTo ? (
          <p className="text-center text-muted-foreground text-xs">
            <Kbd className="font-mono">{primarySubmitShortcutHint()}</Kbd> to
            submit
          </p>
        ) : null}
      </form>

      {sentTo ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-muted-foreground text-sm">
            Link sent to <span className="text-foreground">{sentTo}</span>. Open
            your inbox to continue.
          </div>
          {import.meta.env.DEV && devMagicLink ? (
            <div
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-amber-950 text-sm dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-50"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-80">
                Dev — magic link
              </div>
              <a
                href={devMagicLink}
                className="mt-2 inline-block font-medium text-foreground underline-offset-4 hover:underline"
              >
                Open sign-in link
              </a>
              <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap break-all rounded border border-amber-500/25 bg-background/50 p-2 font-mono text-[11px] leading-snug opacity-90 dark:border-amber-400/20">
                {devMagicLink}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </div>
      ) : null}
    </>
  );
}
// -feature:auth-magic-link


// +feature:auth-oauth
function OAuthButtons() {
  const socialSignIn = useSignInSocialMutation();
  const [pendingProvider, setPendingProvider] = useState<
    "google" | "apple" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const onSocial = (provider: "google" | "apple") => {
    setError(null);
    setPendingProvider(provider);
    const callbackURL = `${window.location.origin}/auth/callback`;
    socialSignIn.mutate(
      { provider, callbackURL },
      {
        // Happy path: better-auth redirects the browser before this resolves, so
        // onSuccess almost never fires in practice. onError catches misconfigured
        // providers (e.g. GOOGLE_CLIENT_ID not set on the server).
        onError: (err) => {
          setPendingProvider(null);
          const label = provider === "google" ? "Google" : "Apple";
          setError(
            err instanceof Error && err.message
              ? `${label} sign-in failed: ${err.message}`
              : `${label} sign-in isn't available right now.`,
          );
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="lg"
          type="button"
          loading={pendingProvider === "google"}
          disabled={true || socialSignIn.isPending}
          onClick={() => onSocial("google")}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          size="lg"
          type="button"
          loading={pendingProvider === "apple"}
          disabled={true || socialSignIn.isPending}
          onClick={() => onSocial("apple")}
        >
          <AppleIcon />
          Continue with Apple
        </Button>
      </div>
      {error ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          {error}
        </div>
      ) : null}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.64 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.95s2.63-5.95 5.85-5.95c1.84 0 3.07.78 3.77 1.45l2.57-2.5C16.71 3.8 14.59 2.9 12 2.9 6.97 2.9 2.9 6.97 2.9 12s4.07 9.1 9.1 9.1c5.26 0 8.74-3.69 8.74-8.89 0-.6-.06-1.05-.14-1.51Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M16.37 1.43c.06 1.2-.39 2.37-1.17 3.2-.8.85-2.08 1.5-3.28 1.41-.09-1.19.5-2.37 1.21-3.13.8-.88 2.16-1.52 3.24-1.48ZM20.5 17.33c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.94-1-4.03-.99-2.1.01-2.54 1-4.08.98-1.73-.02-3.06-1.78-4.05-3.35-2.77-4.4-3.06-9.56-1.35-12.31 1.21-1.95 3.12-3.1 4.91-3.1 1.82 0 2.97.99 4.47.99 1.46 0 2.35-1 4.45-1 1.59 0 3.27.86 4.47 2.36-3.93 2.15-3.29 7.76 1.06 9.92Z"
      />
    </svg>
  );
}
// -feature:auth-oauth
