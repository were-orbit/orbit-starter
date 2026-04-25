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
  title: "Production webhook routing",
  description:
    "One public URL per provider, signature verification on every call, dedupe in the ledger, nothing else fancy.",
};

export function DeployWebhooksPage() {
  return (
    <DocsLayout
      kicker="06 · Deploy"
      title={meta.title}
      description={meta.description}
      path="/docs/deploy/webhooks"
    >
      <DocsP>
        Three features in Orbit receive inbound webhooks: billing (Stripe /
        Polar / Dodo), jobs (QStash, when you use it), and nothing else. All
        of them follow the same three rules — raw body preserved, signature
        verified, event deduped — so the production routing story is mostly
        about picking the right public URL and not breaking those three.
      </DocsP>

      <DocsH2>The endpoints</DocsH2>
      <DocsTable
        columns={["Provider", "Endpoint", "When"]}
        rows={[
          [
            "Stripe",
            <DocsCode>POST /v1/billing/webhooks/stripe</DocsCode>,
            <><DocsCode>BILLING_PROVIDER=stripe</DocsCode></>,
          ],
          [
            "Polar",
            <DocsCode>POST /v1/billing/webhooks/polar</DocsCode>,
            <><DocsCode>BILLING_PROVIDER=polar</DocsCode></>,
          ],
          [
            "Dodo",
            <DocsCode>POST /v1/billing/webhooks/dodo</DocsCode>,
            <><DocsCode>BILLING_PROVIDER=dodo</DocsCode></>,
          ],
          [
            "Upstash QStash",
            <DocsCode>POST /v1/jobs/run/:name</DocsCode>,
            <><DocsCode>JOBS_PROVIDER=qstash</DocsCode></>,
          ],
        ]}
      />
      <DocsP>
        All four are public, unauthenticated, signature-verified. Don't put
        them behind basic auth or IP allowlists — you'll block legitimate
        deliveries.
      </DocsP>

      <DocsH2>What to register with each provider</DocsH2>

      <DocsH3>Stripe</DocsH3>
      <DocsList ordered>
        <li>
          Stripe Dashboard → Developers → Webhooks → Add endpoint.
        </li>
        <li>
          URL: <DocsCode>{"https://api.example.com/v1/billing/webhooks/stripe"}</DocsCode>.
        </li>
        <li>
          Events to listen for (minimum):{" "}
          <DocsCode>checkout.session.completed</DocsCode>,{" "}
          <DocsCode>customer.subscription.created</DocsCode>,{" "}
          <DocsCode>customer.subscription.updated</DocsCode>,{" "}
          <DocsCode>customer.subscription.deleted</DocsCode>,{" "}
          <DocsCode>invoice.payment_failed</DocsCode>.
        </li>
        <li>
          Copy the signing secret into{" "}
          <DocsCode>STRIPE_WEBHOOK_SECRET</DocsCode>.
        </li>
      </DocsList>

      <DocsH3>Polar</DocsH3>
      <DocsList ordered>
        <li>
          Polar dashboard → Settings → Webhooks → Add endpoint.
        </li>
        <li>
          URL:{" "}
          <DocsCode>{"https://api.example.com/v1/billing/webhooks/polar"}</DocsCode>.
        </li>
        <li>
          Events: <DocsCode>subscription.created</DocsCode>,{" "}
          <DocsCode>subscription.updated</DocsCode>,{" "}
          <DocsCode>subscription.canceled</DocsCode>.
        </li>
        <li>
          Copy the secret into <DocsCode>POLAR_WEBHOOK_SECRET</DocsCode>.
        </li>
      </DocsList>

      <DocsH3>Dodo</DocsH3>
      <DocsList ordered>
        <li>
          Dodo dashboard → Webhooks → Add.
        </li>
        <li>
          URL:{" "}
          <DocsCode>{"https://api.example.com/v1/billing/webhooks/dodo"}</DocsCode>.
        </li>
        <li>
          Events: subscription lifecycle + payment.
        </li>
        <li>
          Copy the signing key into <DocsCode>DODO_PAYMENTS_WEBHOOK_KEY</DocsCode>.
        </li>
      </DocsList>

      <DocsH3>QStash</DocsH3>
      <DocsP>
        QStash is different — you don't register anything; the{" "}
        <DocsCode>QSTASH_CALLBACK_URL</DocsCode> env var <em>is</em> the
        registration, and each <DocsCode>enqueue()</DocsCode> tells QStash
        where to deliver. In prod, point it at your public API:
      </DocsP>
      <DocsCodeBlock>
        {`QSTASH_CALLBACK_URL="https://api.example.com"`}
      </DocsCodeBlock>
      <DocsP>
        QStash will POST to{" "}
        <DocsCode>{"${QSTASH_CALLBACK_URL}/v1/jobs/run/<name>"}</DocsCode> with
        a signature header. Both current and next signing keys are checked —
        rotate them in the Upstash console without downtime.
      </DocsP>

      <DocsH2>Signature verification (what the API does for you)</DocsH2>
      <DocsP>
        The webhook controller reads the raw body as <em>text</em> (not JSON)
        and forwards it to the provider-specific receiver. Each receiver uses
        the SDK's native verifier, so you inherit every correctness property
        the provider's SDK has:
      </DocsP>
      <DocsList>
        <li>
          <strong>Stripe</strong> —{" "}
          <DocsCode>stripe.webhooks.constructEvent(rawBody, signature, secret)</DocsCode>.
        </li>
        <li>
          <strong>Polar</strong> — Standard Webhooks spec, verified via{" "}
          <DocsCode>validateEvent</DocsCode> with{" "}
          <DocsCode>webhook-id</DocsCode>,{" "}
          <DocsCode>webhook-timestamp</DocsCode>, and{" "}
          <DocsCode>webhook-signature</DocsCode> headers.
        </li>
        <li>
          <strong>Dodo</strong> — Standard Webhooks spec via{" "}
          <DocsCode>client.webhooks.unwrap</DocsCode>.
        </li>
        <li>
          <strong>QStash</strong> —{" "}
          <DocsCode>Receiver.verify()</DocsCode> against current + next keys.
        </li>
      </DocsList>
      <DocsCallout kind="warn">
        Don't insert any middleware between the ingress and the controller
        that parses JSON or mutates headers — the raw body must arrive byte-
        identical to what the provider signed. Cloudflare, Fastly, and some
        API gateways modify bodies by default; turn those transforms off for
        webhook paths.
      </DocsCallout>

      <DocsH2>Dedupe</DocsH2>
      <DocsP>
        Providers retry aggressively — on any 5xx, timeout, or non-2xx
        response. Orbit dedupes via the{" "}
        <DocsCode>BillingEvent</DocsCode> ledger: every verified webhook
        writes a row keyed by <DocsCode>providerEventId</DocsCode> before the
        domain update runs. A replay finds the existing row and short-circuits
        with <DocsCode>{"{ ok: true, processed: false }"}</DocsCode>.
      </DocsP>
      <DocsP>
        Jobs dedupe via <DocsCode>jobKey</DocsCode> on enqueue (providers do
        the work) and via natural keys in the handler's write. Both together
        mean "at-least-once delivery + idempotent handlers" is the posture, not
        "exactly-once".
      </DocsP>

      <DocsH2>HTTPS, TLS, and timeouts</DocsH2>
      <DocsList>
        <li>
          <strong>HTTPS required.</strong> Every provider rejects{" "}
          <DocsCode>http://</DocsCode> endpoints in prod. Your deploy target
          should terminate TLS before the API; the API itself speaks HTTP on
          its internal port.
        </li>
        <li>
          <strong>Respond fast.</strong> Providers have short timeout windows
          (Stripe: ~30s before treating it as failed). The webhook controller
          does the minimum inline — verify, dedupe, upsert, respond — then
          everything else happens via domain events + projectors.
        </li>
        <li>
          <strong>Return 2xx on dedupe.</strong> Don't return 4xx for a
          replayed event; providers would stop delivering. The service
          returns <DocsCode>{"{ ok: true, processed: false }"}</DocsCode> as a
          200.
        </li>
      </DocsList>

      <DocsH2>Local dev with real webhooks</DocsH2>
      <DocsP>
        See <em>npm run dev</em> for the short version. Long version: get a
        smee.io URL, register it with your provider, set{" "}
        <DocsCode>SMEE_URL</DocsCode> and{" "}
        <DocsCode>SMEE_TARGET_PATH</DocsCode> in{" "}
        <DocsCode>apps/api/.env</DocsCode>, and{" "}
        <DocsCode>apps/webhook-tunnel</DocsCode> will forward real deliveries
        to your local API with signatures intact.
      </DocsP>
    </DocsLayout>
  );
}
