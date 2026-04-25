import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
  DocsTable,
} from "@/components/docs-layout";

export const meta = {
  title: "Secrets & rotation",
  description:
    "Which keys are load-bearing, what happens when you rotate each, and what you can do zero-downtime.",
};

export function DeploySecretsPage() {
  return (
    <DocsLayout
      kicker="06 · Deploy"
      title={meta.title}
      description={meta.description}
      path="/docs/deploy/secrets"
    >
      <DocsP>
        Orbit doesn't do anything clever with secrets — they're plain env
        vars read at boot time. What matters is knowing, per secret, what
        breaks when you rotate it and whether users get logged out.
      </DocsP>

      <DocsH2>The quick reference</DocsH2>
      <DocsTable
        columns={["Secret", "Rotation cost", "Approach"]}
        rows={[
          [
            <DocsCode>BETTER_AUTH_SECRET</DocsCode>,
            <strong>All sessions invalidated</strong>,
            "Rotate only when compromised. Expect every user to re-auth.",
          ],
          [
            <DocsCode>STRIPE_WEBHOOK_SECRET</DocsCode>,
            "Stripe queues retries",
            "Rotate via Stripe dashboard; update env; redeploy.",
          ],
          [
            <DocsCode>POLAR_WEBHOOK_SECRET</DocsCode>,
            "Polar queues retries",
            "Same shape as Stripe.",
          ],
          [
            <DocsCode>DODO_PAYMENTS_WEBHOOK_KEY</DocsCode>,
            "Dodo queues retries",
            "Same shape.",
          ],
          [
            <DocsCode>QSTASH_CURRENT_SIGNING_KEY</DocsCode>,
            "Zero downtime",
            "Shift current → next, set new next. Both are checked.",
          ],
          [
            <DocsCode>RESEND_API_KEY</DocsCode>,
            "Zero downtime",
            "Create new key, swap env, delete old key.",
          ],
          [
            <DocsCode>GOOGLE_CLIENT_SECRET</DocsCode>,
            "Brief OAuth outage",
            <>
              Google supports one secret at a time. Rotate during a low-traffic
              window.
            </>,
          ],
          [
            <DocsCode>APPLE_CLIENT_SECRET</DocsCode>,
            "Expires every 6 months",
            "Regenerate from your .p8; automate it.",
          ],
          [
            <DocsCode>UPLOADTHING_TOKEN</DocsCode>,
            "Zero downtime",
            "New token, swap env, redeploy.",
          ],
          [
            <DocsCode>DATABASE_URL</DocsCode>,
            <em>varies</em>,
            "Provider-specific. Neon/Supabase do user rotation in-UI.",
          ],
        ]}
      />

      <DocsH2>The load-bearing one: <DocsCode>BETTER_AUTH_SECRET</DocsCode></DocsH2>
      <DocsP>
        Every session token in the database is signed with this. Rotate it
        and:
      </DocsP>
      <DocsList>
        <li>Every active session fails to verify on the next request.</li>
        <li>Every user sees a redirect to <DocsCode>/login</DocsCode>.</li>
        <li>Magic link tokens issued under the old secret stop working.</li>
      </DocsList>
      <DocsCallout kind="warn">
        Generate it once with{" "}
        <DocsCode>openssl rand -hex 32</DocsCode>. Treat it like a database
        password: store in a secret manager, limit who can read it, don't
        check it into git. If you leak it, rotate — even though every user
        gets kicked out.
      </DocsCallout>

      <DocsH2>QStash's rolling keys</DocsH2>
      <DocsP>
        QStash is the only secret in the stack with a built-in zero-downtime
        rotation story:
      </DocsP>
      <DocsCodeBlock caption="apps/api/.env (prod)">
        {`QSTASH_CURRENT_SIGNING_KEY="sk_current..."
QSTASH_NEXT_SIGNING_KEY="sk_next..."`}
      </DocsCodeBlock>
      <DocsP>
        The API verifies inbound webhook signatures against <em>both</em>{" "}
        keys. To rotate:
      </DocsP>
      <DocsList ordered>
        <li>Upstash dashboard → rotate signing keys.</li>
        <li>
          Shift the env: old <DocsCode>next</DocsCode> becomes{" "}
          <DocsCode>current</DocsCode>; take the new key from Upstash as the
          new <DocsCode>next</DocsCode>.
        </li>
        <li>Redeploy. Zero dropped deliveries.</li>
      </DocsList>

      <DocsH2>Billing webhook secrets</DocsH2>
      <DocsP>
        Stripe, Polar, and Dodo each hold one secret at a time per endpoint.
        The pattern is the same for all three:
      </DocsP>
      <DocsList ordered>
        <li>Add a <em>second</em> webhook endpoint at the same URL in the provider dashboard.</li>
        <li>Copy the new secret; update the env var; redeploy.</li>
        <li>Delete the old endpoint once the new one is verified.</li>
      </DocsList>
      <DocsP>
        Providers retry failed deliveries — even if a delivery lands on an
        API that has the wrong secret cached, it'll be retried against the
        updated instance. No lost events, but a brief window of signature
        failures in your logs during the swap.
      </DocsP>

      <DocsH2>OAuth client secrets</DocsH2>
      <DocsH3>Google</DocsH3>
      <DocsP>
        Google's console only lets you hold one active client secret per
        client. Strategy: do the rotation during a quiet window.{" "}
        <DocsCode>GOOGLE_CLIENT_SECRET</DocsCode> is only used during the
        OAuth callback — users already signed in via Google aren't affected;
        new sign-ins retry automatically.
      </DocsP>

      <DocsH3>Apple</DocsH3>
      <DocsP>
        Apple's "client secret" is a JWT you sign with your{" "}
        <DocsCode>.p8</DocsCode> key. It expires at most every 6 months.
        Keep a script that regenerates it and writes to your secret manager;
        your deploy pipeline should pick it up and restart the API. If you
        forget, sign-in-with-Apple breaks silently while other providers keep
        working.
      </DocsP>

      <DocsH2>Where to store secrets</DocsH2>
      <DocsTable
        columns={["Target", "Recommended store"]}
        rows={[
          [
            "Railway",
            <>
              Per-service env vars in the dashboard. Use{" "}
              <em>shared variables</em> for things consumed by multiple
              services.
            </>,
          ],
          [
            "Fly",
            <>
              <DocsCode>fly secrets set</DocsCode> — encrypted at rest,
              available as env vars in the VM.
            </>,
          ],
          [
            "Vercel",
            "Environment Variables UI — scope to Production / Preview separately.",
          ],
          [
            "Self-hosted / Kamal",
            "SOPS + age, or Vault, or AWS Secrets Manager.",
          ],
          [
            "Anywhere",
            <>
              <em>Not</em> <DocsCode>.env</DocsCode> in git. Always.
            </>,
          ],
        ]}
      />

      <DocsH2>What's safe to commit</DocsH2>
      <DocsP>
        The <DocsCode>.env.example</DocsCode> files committed to the repo
        never hold real values. The dev-defaults (<DocsCode>change-me-in-prod</DocsCode>,{" "}
        <DocsCode>http://localhost:*</DocsCode>) are fine to check in.
        Everything provider-specific — API keys, webhook secrets, database
        URLs — lives only in the local <DocsCode>.env</DocsCode>, which{" "}
        <DocsCode>.gitignore</DocsCode> excludes.
      </DocsP>
      <DocsCallout>
        If a secret ever lands in a commit: rotate it, then use{" "}
        <DocsCode>git filter-repo</DocsCode> (or a contained migration branch)
        to scrub history. Force-pushing an edited history has its own
        tradeoffs — talk to your team before doing it on main.
      </DocsCallout>

      <DocsH2>Incident checklist</DocsH2>
      <DocsP>Something leaked. In order:</DocsP>
      <DocsList ordered>
        <li>
          Rotate the affected secret at the source (provider dashboard or{" "}
          <DocsCode>openssl</DocsCode>).
        </li>
        <li>
          Update your secret manager / deploy target env.
        </li>
        <li>
          Redeploy the API (and the web shells if the secret was a{" "}
          <DocsCode>VITE_*</DocsCode> — those are baked at build time).
        </li>
        <li>
          Grep the repo history (<DocsCode>git log -p -S &lt;partial&gt;</DocsCode>)
          to confirm the leak's blast radius.
        </li>
        <li>
          If it was <DocsCode>BETTER_AUTH_SECRET</DocsCode>: inform users that
          they'll need to sign in again.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
