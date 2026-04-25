import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsList,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "OAuth providers",
  description:
    "Magic links are always on. Google and Apple only register when their credentials are both set.",
};

export function OAuthIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/oauth"
    >
      <DocsP>
        Auth in Orbit is handled by{" "}
        <a
          href="https://better-auth.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 transition-colors hover:text-foreground"
        >
          better-auth
        </a>
        . Magic-link sign-in is the default and is always on. OAuth is
        additive: Google and Apple get registered as providers only when both
        their client id <em>and</em> client secret are present in env, so a
        half-configured provider never shows up on the login page.
      </DocsP>

      <DocsH2>Conditional registration</DocsH2>
      <DocsCodeBlock caption="apps/api/src/composition.ts">
        {`const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;

const social: NonNullable<AppConfig["social"]> = {};
if (googleClientId && googleClientSecret) {
  social.google = { clientId: googleClientId, clientSecret: googleClientSecret };
}
if (appleClientId && appleClientSecret) {
  social.apple = { clientId: appleClientId, clientSecret: appleClientSecret };
}`}
      </DocsCodeBlock>
      <DocsP>
        The <DocsCode>social</DocsCode> object is handed to better-auth only
        if it has at least one key:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/better-auth.ts">
        {`socialProviders:
  Object.keys(socialProviders).length > 0 ? socialProviders : undefined,`}
      </DocsCodeBlock>
      <DocsCallout>
        The web shell renders Google and Apple buttons unconditionally — if
        the server never registered the provider, clicking the button just
        surfaces an error in the form. The buttons in the scaffolded login
        page (<DocsCode>apps/web-tanstack/src/pages/login.tsx</DocsCode>,{" "}
        <DocsCode>apps/web-next/src/views/login.tsx</DocsCode>) ship with{" "}
        <DocsCode>disabled={"{true}"}</DocsCode> so an unconfigured project
        can't dead-end users on a half-broken flow. Drop that flag once
        you've wired the credentials below.
      </DocsCallout>

      <DocsH2>Callback URLs</DocsH2>
      <DocsP>
        better-auth mounts OAuth under{" "}
        <DocsCode>/v1/auth</DocsCode>, so the redirect URIs you register with
        each provider are:
      </DocsP>
      <DocsCodeBlock>
        {`\${API_ORIGIN}/v1/auth/callback/google
\${API_ORIGIN}/v1/auth/callback/apple`}
      </DocsCodeBlock>
      <DocsP>
        <DocsCode>API_ORIGIN</DocsCode> has to match exactly — including
        protocol and port. In local dev that's{" "}
        <DocsCode>http://localhost:4002</DocsCode>; in prod it's whatever
        public hostname the API answers on.
      </DocsP>

      <DocsH2>Google</DocsH2>
      <DocsList ordered>
        <li>
          Create a project in the{" "}
          <a
            href="https://console.cloud.google.com"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Google Cloud Console
          </a>
          , then enable the OAuth consent screen.
        </li>
        <li>
          Create an OAuth 2.0 Client ID of type "Web application".
        </li>
        <li>
          Authorized redirect URI:{" "}
          <DocsCode>{"${API_ORIGIN}/v1/auth/callback/google"}</DocsCode>. Add
          both dev and prod if you need them.
        </li>
        <li>
          Copy the client id and secret into{" "}
          <DocsCode>GOOGLE_CLIENT_ID</DocsCode> and{" "}
          <DocsCode>GOOGLE_CLIENT_SECRET</DocsCode> in your API env.
        </li>
      </DocsList>

      <DocsH2>Apple</DocsH2>
      <DocsP>
        Sign in with Apple has more steps but the same shape. You'll need a
        Services ID, a Key, and the resulting JWT-signed client secret
        better-auth expects.
      </DocsP>
      <DocsList ordered>
        <li>
          In the Apple Developer portal, create a Services ID. Enable "Sign in
          with Apple".
        </li>
        <li>
          Add the return URL:{" "}
          <DocsCode>{"${API_ORIGIN}/v1/auth/callback/apple"}</DocsCode>.
        </li>
        <li>
          Generate a Key (type: Sign in with Apple) and download the{" "}
          <DocsCode>.p8</DocsCode>.
        </li>
        <li>
          Produce the short-lived client secret JWT (Apple rotates every 6
          months; scripts exist in the ecosystem). Store it as{" "}
          <DocsCode>APPLE_CLIENT_SECRET</DocsCode>; the Services ID goes in{" "}
          <DocsCode>APPLE_CLIENT_ID</DocsCode>.
        </li>
      </DocsList>
      <DocsCallout kind="warn">
        Apple's client secret expires. Plan a rotation: script the
        regeneration, feed it to your secret manager, and restart the API.
        Nothing in Orbit manages this for you.
      </DocsCallout>

      <DocsH2>Linked vs. separate accounts</DocsH2>
      <DocsP>
        better-auth's default behaviour: if someone signs in with Google
        using an email that already has an account (via magic link or another
        provider), the accounts are linked on the{" "}
        <DocsCode>Account</DocsCode> table. Orbit doesn't override this. A
        user can therefore have multiple <DocsCode>Account</DocsCode> rows
        (one per provider) but a single <DocsCode>User</DocsCode>.
      </DocsP>

      <DocsH2>Origins and CORS</DocsH2>
      <DocsP>
        better-auth's cookie policy and CORS guard are driven by the same
        origin config we use elsewhere. The{" "}
        <DocsCode>trustedOrigins</DocsCode> list includes{" "}
        <DocsCode>WEB_ORIGIN</DocsCode>, <DocsCode>WWW_ORIGIN</DocsCode>,{" "}
        <DocsCode>API_ORIGIN</DocsCode>, and{" "}
        <DocsCode>ADDITIONAL_WEB_ORIGINS</DocsCode>. If you see "CSRF check
        failed" after an OAuth round-trip in a new environment, check that
        the initiating origin is in that list.
      </DocsP>

      <DocsH2>Adding another provider</DocsH2>
      <DocsP>better-auth supports more than Google and Apple. To add one:</DocsP>
      <DocsList ordered>
        <li>
          Add the secret pair to <DocsCode>.env.example</DocsCode> and env
          validation in <DocsCode>composition.ts</DocsCode>.
        </li>
        <li>
          Extend the conditional block that builds{" "}
          <DocsCode>social</DocsCode> with the new provider key.
        </li>
        <li>
          Register the callback URI with the provider:{" "}
          <DocsCode>{"${API_ORIGIN}/v1/auth/callback/<provider>"}</DocsCode>.
        </li>
        <li>
          The web sign-in page reads the registered provider list from the
          API — no client code change needed.
        </li>
      </DocsList>
    </DocsLayout>
  );
}
