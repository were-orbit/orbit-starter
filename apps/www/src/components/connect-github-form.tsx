import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@orbit/ui/button";
import { PLATFORM_URL } from "@/lib/platform";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | {
      kind: "success";
      state: "added" | "already-collaborator";
      email: string;
    }
  | { kind: "error"; message: string };

export function ConnectGithubForm({
  initialCheckoutId = "",
}: {
  initialCheckoutId?: string;
}) {
  const [checkoutId, setCheckoutId] = useState(initialCheckoutId);
  const [githubUsername, setGithubUsername] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch(`${PLATFORM_URL}/v1/connect-github`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ checkoutId, githubUsername }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          body.error === "order-not-found"
            ? "We couldn't find that checkout. Double-check the ID from your confirmation email."
            : body.error === "order-not-paid"
              ? "This checkout hasn't been paid yet. If you just purchased, try again in a moment."
              : body.error === "invalid_body"
                ? "That doesn't look like a valid GitHub username."
                : "Something went wrong. Try again in a minute.";
        setStatus({ kind: "error", message });
        return;
      }
      setStatus({
        kind: "success",
        state: body.state,
        email: body.email,
      });
    } catch {
      setStatus({
        kind: "error",
        message:
          "Couldn't reach the platform service. Check your connection and try again.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <div className="rounded-xl border border-border/60 bg-card/40 p-6 not-dark:bg-clip-padding md:p-8">
        <div className="flex items-center gap-2 text-[11px] text-emerald-400 uppercase tracking-[0.25em]">
          <Check className="h-4 w-4" strokeWidth={2} />
          {status.state === "already-collaborator"
            ? "Already connected"
            : "Invitation sent"}
        </div>
        <h2 className="mt-3 font-medium text-foreground text-xl">
          Check your GitHub notifications.
        </h2>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          {status.state === "already-collaborator"
            ? `You already have access to were-orbit/orbit under ${githubUsername}.`
            : `We sent an invitation to collaborate on were-orbit/orbit. Accept it from GitHub and you're in. A receipt went to ${status.email}.`}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="lg"
            render={
              <a
                href="https://github.com/were-orbit/orbit/invitations"
                target="_blank"
                rel="noreferrer"
              >
                Open invitation
                <ExternalLink />
              </a>
            }
          />
          <Button
            variant="outline"
            size="lg"
            render={<a href="/docs">Read the docs</a>}
          />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border/60 bg-card/40 p-6 not-dark:bg-clip-padding md:p-8"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="checkout-id"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
          >
            Checkout ID
          </label>
          <input
            id="checkout-id"
            value={checkoutId}
            onChange={(e) => setCheckoutId(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Paste from your Polar confirmation email"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="github-username"
            className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
          >
            GitHub username
          </label>
          <input
            id="github-username"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value.trim())}
            spellCheck={false}
            autoComplete="off"
            className="rounded-lg border border-border/70 bg-background/60 px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. octocat"
            required
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We add this account as a collaborator on{" "}
            <span className="text-foreground">were-orbit/orbit</span>. You'll
            get an invitation email from GitHub.
          </p>
        </div>

        {status.kind === "error" && (
          <div className="rounded-lg border border-destructive/60 bg-destructive/5 px-3 py-2 text-destructive text-xs">
            {status.message}
          </div>
        )}

        <Button
          variant="default"
          size="lg"
          type="submit"
          loading={status.kind === "submitting"}
          disabled={status.kind === "submitting"}
        >
          Connect GitHub
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
