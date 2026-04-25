import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsH3,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "Add a plan + checkout button",
  description:
    "Create the product at your provider, list it in BILLING_PLANS_JSON, and the billing settings page renders it automatically.",
};

export function AddAPlanPage() {
  return (
    <DocsLayout
      kicker="03 · Guides"
      title={meta.title}
      description={meta.description}
      path="/docs/guides/add-a-plan"
    >
      <DocsP>
        Adding a plan is mostly a provider-dashboard task — Orbit's side is a
        single env-var edit. The billing settings page renders whatever's in{" "}
        <DocsCode>BILLING_PLANS_JSON</DocsCode>; the checkout flow is one
        generic service that works for all three billing providers.
      </DocsP>

      <DocsH2>1. Create the price at your provider</DocsH2>

      <DocsH3>Stripe</DocsH3>
      <DocsList ordered>
        <li>
          Dashboard → Products → Add product. Set name + description.
        </li>
        <li>
          Add a Price (recurring, monthly or yearly, the currency you want).
        </li>
        <li>
          Copy the price id —{" "}
          <DocsCode>price_1PAbc...</DocsCode>. That's what goes in{" "}
          <DocsCode>BILLING_PLANS_JSON</DocsCode>.
        </li>
      </DocsList>

      <DocsH3>Polar</DocsH3>
      <DocsList ordered>
        <li>
          Dashboard → Products → New product.
        </li>
        <li>
          Create a recurring price on it.
        </li>
        <li>
          Copy the <em>product</em> id (Polar bills by product, not price) —{" "}
          what Orbit calls <DocsCode>priceId</DocsCode> is the Polar product
          id. The adapter translates.
        </li>
      </DocsList>

      <DocsH3>Dodo</DocsH3>
      <DocsList ordered>
        <li>
          Dashboard → Products → Create, pick the recurring subscription
          type.
        </li>
        <li>
          Copy the product id —{" "}
          <DocsCode>pdt_...</DocsCode>. Same field as Polar.
        </li>
      </DocsList>

      <DocsH2>2. Add it to <DocsCode>BILLING_PLANS_JSON</DocsCode></DocsH2>
      <DocsP>
        The env var is a JSON array. Each entry is a{" "}
        <DocsCode>BillingPlan</DocsCode>. Add your new plan alongside the
        existing ones:
      </DocsP>
      <DocsCodeBlock caption="apps/api/.env">
        {`BILLING_PLANS_JSON='[
  {
    "key": "pro",
    "name": "Pro",
    "description": "For growing teams.",
    "priceId": "price_...",
    "unitAmount": 800,
    "currency": "usd",
    "interval": "month",
    "intervalCount": 1,
    "features": ["Unlimited teams", "Priority support"]
  },
  {
    "key": "scale",
    "name": "Scale",
    "description": "For teams going public.",
    "priceId": "price_...",
    "unitAmount": 2400,
    "currency": "usd",
    "interval": "month",
    "intervalCount": 1,
    "features": [
      "Everything in Pro",
      "SSO/SAML",
      "Audit log export"
    ]
  }
]'`}
      </DocsCodeBlock>
      <DocsP>The fields, in short:</DocsP>
      <DocsList>
        <li>
          <DocsCode>key</DocsCode> — stable identifier. The app reads this
          to match a subscription back to a plan.
        </li>
        <li>
          <DocsCode>priceId</DocsCode> — the provider-side id. Stripe's{" "}
          <DocsCode>price_...</DocsCode>, Polar/Dodo's product id.
        </li>
        <li>
          <DocsCode>unitAmount</DocsCode> — in cents.
        </li>
        <li>
          <DocsCode>interval</DocsCode> — <DocsCode>"month"</DocsCode> or{" "}
          <DocsCode>"year"</DocsCode>.
        </li>
        <li>
          <DocsCode>features</DocsCode> — bullet list rendered on the plan
          card. Marketing copy, not gating.
        </li>
      </DocsList>
      <DocsCallout kind="warn">
        <DocsCode>BILLING_PLANS_JSON</DocsCode> is read once at boot. Change
        it, restart the API, and the new plan appears. For zero-downtime plan
        rollouts across multiple instances: roll the fleet.
      </DocsCallout>

      <DocsH2>3. What happens on the frontend</DocsH2>
      <DocsP>
        The billing settings page calls{" "}
        <DocsCode>GET /v1/workspaces/:slug/billing/plans</DocsCode>, which
        returns what the provider's <DocsCode>listPlans()</DocsCode> hands
        back — in every adapter, that's the env-driven catalog.
      </DocsP>
      <DocsP>
        The plan card renders automatically. No component change, no client
        rebuild — it's data-driven end-to-end.
      </DocsP>

      <DocsH2>4. The checkout button</DocsH2>
      <DocsP>
        Each plan card shows a checkout button. Clicking it calls one
        endpoint:
      </DocsP>
      <DocsCodeBlock>
        {`POST /v1/workspaces/:slug/billing/checkout
  { "planKey": "pro", "successUrl": "...", "cancelUrl": "..." }
  → { "redirectUrl": "https://checkout.stripe.com/..." }`}
      </DocsCodeBlock>
      <DocsP>
        The service walks the same path regardless of provider:
      </DocsP>
      <DocsList ordered>
        <li>
          Look up the <DocsCode>BillingCustomer</DocsCode> for the workspace;
          if it doesn't exist, call{" "}
          <DocsCode>provider.createCustomer()</DocsCode> and save one.
        </li>
        <li>
          Find the plan in the catalog by <DocsCode>key</DocsCode>.
        </li>
        <li>
          Call <DocsCode>provider.startCheckout()</DocsCode> with the
          customer id, plan, and success/cancel URLs.
        </li>
        <li>
          Return the provider's redirect URL. The web app does a{" "}
          <DocsCode>window.location.href = redirectUrl</DocsCode>.
        </li>
      </DocsList>

      <DocsH2>5. The webhook closes the loop</DocsH2>
      <DocsP>
        When the checkout completes, the provider POSTs a{" "}
        <DocsCode>subscription.created</DocsCode> (or equivalent) to{" "}
        <DocsCode>/v1/billing/webhooks/&lt;provider&gt;</DocsCode>.{" "}
        <DocsCode>HandleBillingWebhookService</DocsCode> verifies the
        signature, dedupes, then upserts a{" "}
        <DocsCode>Subscription</DocsCode> aggregate with{" "}
        <DocsCode>planKey: "pro"</DocsCode> resolved from the price/product
        id.
      </DocsP>
      <DocsP>
        The realtime publisher broadcasts{" "}
        <DocsCode>subscription.updated</DocsCode> on the workspace channel —
        every open tab flips from "Start a trial" to "Pro plan" without a
        reload.
      </DocsP>

      <DocsH2>6. Gate a feature by plan</DocsH2>
      <DocsP>
        Orbit doesn't ship plan-gating helpers — by design, because what
        counts as "Pro" is app-specific. Read the subscription where you
        need it:
      </DocsP>
      <DocsCodeBlock>
        {`// In a controller, after resolving the workspace:
const sub = await uow.read(tx => tx.subscriptions.findByWorkspace(workspace.id));
if (sub?.planKey !== "pro" && sub?.planKey !== "scale") {
  throw new ForbiddenError("plan.insufficient");
}`}
      </DocsCodeBlock>
      <DocsP>
        For client-side rendering, the subscription is already in the store
        — just check <DocsCode>subscriptionStore.current?.planKey</DocsCode>{" "}
        and render accordingly. It updates in realtime, so an upgrade takes
        effect the instant the webhook arrives.
      </DocsP>

      <DocsH2>Testing locally</DocsH2>
      <DocsList>
        <li>
          <strong>Stripe.</strong> Use Stripe's dashboard "send test
          webhook", or run{" "}
          <DocsCode>stripe trigger checkout.session.completed</DocsCode> with
          the Stripe CLI pointed at your smee tunnel.
        </li>
        <li>
          <strong>Polar / Dodo.</strong> Both have a "replay" button on
          webhook delivery rows in their dashboards. Replay a recent event to
          exercise the path.
        </li>
        <li>
          <strong>End-to-end.</strong> Do a real checkout in test mode. Every
          provider has test-card numbers that succeed or fail predictably —{" "}
          <DocsCode>4242 4242 4242 4242</DocsCode> is the universal "works".
        </li>
      </DocsList>
    </DocsLayout>
  );
}
