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
  title: "Billing providers",
  description:
    "One BillingProvider port. Three interchangeable adapters. The master switch is a single env var.",
};

export function BillingIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/billing"
    >
      <DocsP>
        Billing follows the adapter pattern that runs through every external
        dependency in Orbit: a <strong>port</strong> lives in{" "}
        <DocsCode>application/</DocsCode>, concrete adapters live in{" "}
        <DocsCode>infrastructure/</DocsCode>, and{" "}
        <DocsCode>composition.ts</DocsCode> picks one based on env. Swap the
        provider by changing <DocsCode>BILLING_PROVIDER</DocsCode> and the
        associated secrets — zero code changes, zero domain changes.
      </DocsP>

      <DocsH2>The port</DocsH2>
      <DocsCodeBlock caption="apps/api/src/billing/application/billing-provider.ts">
        {`export interface BillingProvider {
  listPlans(): Promise<BillingPlan[]>;
  findCustomer(providerCustomerId: string): Promise<ProviderCustomer | null>;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  startCheckout(input: StartCheckoutInput): Promise<{ redirectUrl: string; sessionId: string }>;
  openPortal(input: OpenPortalInput): Promise<{ redirectUrl: string }>;
  cancelSubscription(input: CancelInput): Promise<void>;
  fetchSubscription(providerSubscriptionId: string): Promise<ProviderSubscription | null>;
}`}
      </DocsCodeBlock>
      <DocsP>
        All seven methods are provider-agnostic. The domain layer never sees
        Stripe's <DocsCode>checkout.sessions</DocsCode>, Polar's product model,
        or Dodo's snake_case fields — adapters translate at the boundary.
      </DocsP>

      <DocsH2>The three adapters</DocsH2>
      <DocsTable
        columns={["Provider", "SDK", "Pricing model", "Webhook verification"]}
        rows={[
          [
            <DocsCode>stripe</DocsCode>,
            <DocsCode>stripe</DocsCode>,
            <>
              <DocsCode>priceId</DocsCode> (you're the merchant of record)
            </>,
            <>
              <DocsCode>webhooks.constructEvent</DocsCode> (STRIPE_WEBHOOK_SECRET)
            </>,
          ],
          [
            <DocsCode>polar</DocsCode>,
            <DocsCode>@polar-sh/sdk</DocsCode>,
            <>
              <DocsCode>productId</DocsCode> (Polar is the MoR)
            </>,
            <>
              Standard Webhooks (<DocsCode>validateEvent</DocsCode>)
            </>,
          ],
          [
            <DocsCode>dodo</DocsCode>,
            <DocsCode>dodopayments</DocsCode>,
            "Product-based, Dodo is the MoR",
            <>
              Standard Webhooks (<DocsCode>webhooks.unwrap</DocsCode>)
            </>,
          ],
        ]}
      />

      <DocsH3>StripeBillingProvider</DocsH3>
      <DocsCodeBlock caption="apps/api/src/billing/infrastructure/stripe-billing-provider.ts">
        {`constructor(config, listPlans) {
  this.client = new Stripe(config.apiKey, { apiVersion: config.apiVersion });
}

startCheckout(input) {
  return this.client.checkout.sessions.create({
    customer: input.providerCustomerId,
    mode: "subscription",
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
}`}
      </DocsCodeBlock>

      <DocsH3>PolarBillingProvider</DocsH3>
      <DocsP>
        Polar uses <DocsCode>productId</DocsCode> instead of{" "}
        <DocsCode>priceId</DocsCode>, and <DocsCode>externalId</DocsCode> for
        your-side customer mapping. The{" "}
        <DocsCode>POLAR_SERVER</DocsCode> env var switches between{" "}
        <DocsCode>"sandbox"</DocsCode> and <DocsCode>"production"</DocsCode>{" "}
        targets.
      </DocsP>

      <DocsH3>DodoBillingProvider</DocsH3>
      <DocsP>
        Dodo's SDK is Stainless-generated. The adapter translates snake_case
        response fields (<DocsCode>customer_id</DocsCode>,{" "}
        <DocsCode>checkout_url</DocsCode>) into the camelCase domain types.{" "}
        <DocsCode>DODO_PAYMENTS_ENVIRONMENT</DocsCode> toggles{" "}
        <DocsCode>"test_mode"</DocsCode> vs <DocsCode>"live_mode"</DocsCode>.
      </DocsP>

      <DocsH2>How the adapter is selected</DocsH2>
      <DocsCodeBlock caption="apps/api/src/billing/feature.ts">
        {`function buildProvider(config, catalog): BillingProvider {
  if (config.provider === "stripe" && config.stripe) {
    return new StripeBillingProvider(
      { apiKey: config.stripe.apiKey },
      () => catalog.list(),
    );
  }
  if (config.provider === "polar" && config.polar) {
    return new PolarBillingProvider(
      { accessToken: config.polar.accessToken, server: config.polar.server },
      () => catalog.list(),
    );
  }
  if (config.provider === "dodo" && config.dodo) {
    return new DodoBillingProvider(
      { apiKey: config.dodo.apiKey, environment: config.dodo.environment },
      () => catalog.list(),
    );
  }
  return new NoopBillingProvider();
}`}
      </DocsCodeBlock>
      <DocsCallout>
        When <DocsCode>BILLING_PROVIDER</DocsCode> is unset, the feature
        resolves to <DocsCode>NoopBillingProvider</DocsCode>. The billing routes
        still mount, but they return a stable disabled-state response — no SDK
        is constructed, no secrets are read.
      </DocsCallout>

      <DocsH2>The webhook flow</DocsH2>
      <DocsP>
        Every provider calls the same route pattern:
      </DocsP>
      <DocsCodeBlock>POST /v1/billing/webhooks/:provider</DocsCodeBlock>
      <DocsP>
        Four things happen inside the handler, in order:
      </DocsP>
      <DocsList ordered>
        <li>
          <strong>Raw-body preservation.</strong> The controller reads{" "}
          <DocsCode>c.req.text()</DocsCode>, not <DocsCode>.json()</DocsCode>,
          and forwards lowercased headers — signature verification needs the
          exact bytes.
        </li>
        <li>
          <strong>Signature verification.</strong> Each provider has a{" "}
          <DocsCode>WebhookReceiver</DocsCode> adapter that uses the SDK's
          native verifier:{" "}
          <DocsCode>StripeWebhookReceiver</DocsCode>,{" "}
          <DocsCode>PolarWebhookReceiver</DocsCode>,{" "}
          <DocsCode>DodoWebhookReceiver</DocsCode>. Failure throws{" "}
          <DocsCode>InvalidWebhookSignatureError</DocsCode> → 400.
        </li>
        <li>
          <strong>Dedupe.</strong>{" "}
          <DocsCode>HandleBillingWebhookService</DocsCode> records every event
          in a <DocsCode>BillingEvent</DocsCode> ledger row, keyed by{" "}
          <DocsCode>providerEventId</DocsCode>. Replays short-circuit with{" "}
          <DocsCode>{"{ ok: true, processed: false }"}</DocsCode>.
        </li>
        <li>
          <strong>Apply.</strong> The service resolves the workspace via{" "}
          <DocsCode>BillingCustomer</DocsCode>, then upserts the{" "}
          <DocsCode>Subscription</DocsCode> aggregate. Domain events fire
          post-commit — the realtime publisher broadcasts{" "}
          <DocsCode>subscription.updated</DocsCode> to every socket on the
          workspace channel.
        </li>
      </DocsList>

      <DocsCallout kind="warn">
        The signature verification step is non-negotiable. Without the raw
        body preserved exactly as sent, HMAC comparison fails and legitimate
        webhooks get rejected. Hono's default JSON parser would mutate the
        bytes — the controller deliberately reads text instead.
      </DocsCallout>

      <DocsH2>The plan catalog</DocsH2>
      <DocsP>
        <DocsCode>BILLING_PLANS_JSON</DocsCode> is the source of truth for
        which plans render on the billing settings page. It's read at boot
        into a <DocsCode>BillingCatalog</DocsCode> and handed to the provider
        via <DocsCode>listPlans()</DocsCode>. Keep it small; when you outgrow
        a handful of plans, replace the env-backed source in{" "}
        <DocsCode>composition.ts</DocsCode> with a DB-backed provider.
      </DocsP>
      <DocsP>
        For Polar and Dodo, <DocsCode>priceId</DocsCode> holds the provider's
        product id — the adapter translates the naming, you don't have to.
      </DocsP>

      <DocsH2>Swapping providers</DocsH2>
      <DocsList ordered>
        <li>
          Set <DocsCode>BILLING_PROVIDER</DocsCode> to the new value.
        </li>
        <li>
          Replace the provider-specific secrets (see{" "}
          <em>Environment variables</em>).
        </li>
        <li>
          Update <DocsCode>BILLING_PLANS_JSON</DocsCode> —{" "}
          <DocsCode>priceId</DocsCode> values change per provider.
        </li>
        <li>
          Register a new webhook endpoint with the provider, pointing at{" "}
          <DocsCode>/v1/billing/webhooks/&lt;name&gt;</DocsCode>.
        </li>
        <li>
          Restart the API. Existing{" "}
          <DocsCode>BillingCustomer</DocsCode> rows are scoped to the previous
          provider — you'll want to nullify them or re-provision customers on
          the new side.
        </li>
      </DocsList>

      <DocsH2>Adding a fourth provider</DocsH2>
      <DocsP>It's a file, not a refactor:</DocsP>
      <DocsList ordered>
        <li>
          Implement <DocsCode>BillingProvider</DocsCode> and{" "}
          <DocsCode>BillingWebhookReceiver</DocsCode> in{" "}
          <DocsCode>billing/infrastructure/&lt;name&gt;-billing-provider.ts</DocsCode>.
        </li>
        <li>
          Extend <DocsCode>readBillingConfig()</DocsCode> in{" "}
          <DocsCode>composition.ts</DocsCode> to recognize the new name and
          parse its secrets.
        </li>
        <li>
          Add the <DocsCode>new_provider === "..." </DocsCode> branch to{" "}
          <DocsCode>buildProvider()</DocsCode> in{" "}
          <DocsCode>billing/feature.ts</DocsCode>.
        </li>
      </DocsList>
      <DocsP>
        No changes to the domain layer, no changes to{" "}
        <DocsCode>HandleBillingWebhookService</DocsCode>, no changes to the
        HTTP controller. The port shape is the contract — the domain doesn't
        care what speaks it.
      </DocsP>
    </DocsLayout>
  );
}
