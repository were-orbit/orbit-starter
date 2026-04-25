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
  title: "Mailer port & Resend",
  description:
    "Six methods. One dev-friendly stub. React Email templates for anything fancier.",
};

export function MailerIntegrationsPage() {
  return (
    <DocsLayout
      kicker="05 · Integrations"
      title={meta.title}
      description={meta.description}
      path="/docs/integrations/mailer"
    >
      <DocsP>
        Email is the only system effect that fires from projectors, not from
        services. That keeps the domain layer free of "send email" side
        effects and makes switching providers a drop-in change.
      </DocsP>

      <DocsH2>The port</DocsH2>
      <DocsCodeBlock caption="apps/api/src/infrastructure/mailer.ts">
        {`export interface Mailer {
  sendMagicLink(email: MagicLinkEmail): Promise<void>;
  sendInvite(email: InviteEmail): Promise<void>;
  sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void>;
  sendChangeEmailNotice(email: ChangeEmailNoticeEmail): Promise<void>;
  sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void>;
  sendEmailVerification(email: EmailVerificationEmail): Promise<void>;
}`}
      </DocsCodeBlock>
      <DocsP>
        Six methods covering the transactional emails the domain produces
        today — magic-link sign-in, workspace invites, the three
        verification flows (signup, email change, account deletion), and a
        best-effort FYI notice to the previous address when an email is
        changed. When you add a new email — export ready, plan downgraded,
        support reply — extend the interface, add an implementation on each
        adapter, and have a projector call it.
      </DocsP>
      <DocsCallout kind="note">
        <DocsCode>sendEmailVerification</DocsCode> is the hook better-auth
        calls during password signup. Password accounts can't sign in until
        the address is verified, so the mailer is part of the kit's account-
        takeover defence — a misconfigured provider is a sign-in blocker,
        not a silent drop.
      </DocsCallout>

      <DocsH2>Two implementations</DocsH2>

      <DocsH3>ConsoleMailer (dev default)</DocsH3>
      <DocsP>
        Logs every send to stdout and stashes the most recent magic link in
        memory for the dev helper endpoint. Nothing actually leaves the
        process:
      </DocsP>
      <DocsCodeBlock>
        GET http://localhost:4002/v1/dev/last-magic-link?email=owner@wereorbit.com
      </DocsCodeBlock>
      <DocsP>
        This returns{" "}
        <DocsCode>{"{ link: string | null }"}</DocsCode> — always 404 when{" "}
        <DocsCode>NODE_ENV=production</DocsCode>, so it can't leak in prod
        even if accidentally left mounted.
      </DocsP>

      <DocsH3>ResendMailer (prod default)</DocsH3>
      <DocsCodeBlock caption="apps/api/src/infrastructure/resend-mailer.tsx">
        {`export class ResendMailer implements Mailer {
  private readonly client: Resend;
  constructor(apiKey: string, private readonly from: string) {
    this.client = new Resend(apiKey);
  }

  async sendMagicLink(email: MagicLinkEmail): Promise<void> {
    const { html, text } = await renderEmail(SignInMagicLinkEmail, { ... });
    await this.client.emails.send({
      from: this.from,
      to: email.to,
      subject: "Sign in to Orbit",
      html, text,
    });
  }
  // sendInvite follows the same shape
}`}
      </DocsCodeBlock>

      <DocsH2>Which one gets used?</DocsH2>
      <DocsP>
        The factory in <DocsCode>resend-mailer.tsx</DocsCode> picks at boot
        time:
      </DocsP>
      <DocsCodeBlock>
        {`const useResend =
  Boolean(RESEND_API_KEY) &&
  (NODE_ENV === "production" || RESEND_SEND_IN_DEV === "1");

return useResend ? new ResendMailer(apiKey, from) : new ConsoleMailer();`}
      </DocsCodeBlock>
      <DocsList>
        <li>
          <strong>Prod + key set</strong> → Resend. If the key is set but{" "}
          <DocsCode>RESEND_FROM</DocsCode> isn't, the factory throws — fail
          loud rather than silently drop emails.
        </li>
        <li>
          <strong>Dev</strong> → ConsoleMailer by default. Set{" "}
          <DocsCode>RESEND_SEND_IN_DEV=1</DocsCode> to force real sends —
          handy for template QA.
        </li>
        <li>
          <strong>Prod + no key</strong> → ConsoleMailer. Yes, you're flying
          blind. Check your env.
        </li>
      </DocsList>

      <DocsH2>How projectors use it</DocsH2>
      <DocsP>
        Services collect domain events via the Unit of Work; projectors pick
        them up post-commit and ask the mailer to send. The invite flow is the
        canonical example:
      </DocsP>
      <DocsCodeBlock>
        {`// application: InviteMemberService
await uow.run(async (tx) => {
  const invite = WorkspaceInvite.create({ ... }, clock);
  await tx.workspaceInvites.save(invite);
  tx.events.addMany(invite.pullEvents());  // WorkspaceInvited
});

// application/projectors: InviteMailerProjector
bus.subscribe<WorkspaceInvited>("workspaces.invite.created", async (event) => {
  const invite = await uow.read(tx => tx.workspaceInvites.findById(event.inviteId));
  if (!invite) return;
  await mailer.sendInvite({
    to: invite.email,
    inviteUrl: \`\${webOrigin}/invites/accept?token=\${invite.token}\`,
    workspaceName,
  });
});`}
      </DocsCodeBlock>
      <DocsCallout>
        Projectors run after commit, so a failed email send doesn't roll back
        the invite row. The trade-off: if Resend throws, you lose the send.
        For recoverable sends (scheduled reminders, digests), enqueue a job
        instead — see the <em>Jobs</em> integration page.
      </DocsCallout>

      <DocsH2>Magic links via better-auth</DocsH2>
      <DocsP>
        The magic-link plugin for better-auth calls the mailer directly — no
        projector needed, because the token is short-lived and the user
        initiated it:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/interfaces/http/better-auth.ts">
        {`magicLink({
  expiresIn: config.magicLinkTtlMinutes * 60,
  sendMagicLink: async ({ email, token, url }) => {
    await mailer.sendMagicLink({
      to: email,
      token,
      link: url,
      expiresAt: new Date(Date.now() + ttlMs),
    });
  },
})`}
      </DocsCodeBlock>

      <DocsH2>React Email templates</DocsH2>
      <DocsP>
        Templates live in <DocsCode>apps/api/src/emails/</DocsCode> as{" "}
        <DocsCode>.tsx</DocsCode> files. Each exports a React component plus
        a props type, and shares typography via{" "}
        <DocsCode>orbit-email-styles.ts</DocsCode>.
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/emails/magic-link-email.tsx">
        {`export function SignInMagicLinkEmail({ magicLinkUrl, expiresAtLabel }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Sign in to Orbit</Preview>
      <Body style={orbitEmailStyles.page}>
        <Container style={orbitEmailStyles.container}>
          <Section style={orbitEmailStyles.card}>
            <Text style={orbitEmailStyles.eyebrow}>Orbit</Text>
            <Heading as="h1">Sign in to your workspace</Heading>
            <Button href={magicLinkUrl}>Sign in to Orbit</Button>
            <Text>Expires around {expiresAtLabel}.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}`}
      </DocsCodeBlock>
      <DocsP>
        The adapter renders these via{" "}
        <DocsCode>@react-email/components</DocsCode> — HTML and plain-text
        versions both come out, and the mailer ships both to Resend so
        everything from CLI clients to Apple Mail renders it correctly.
      </DocsP>

      <DocsH2>Swapping to a different provider</DocsH2>
      <DocsP>Three files, in order:</DocsP>
      <DocsList ordered>
        <li>
          Implement <DocsCode>Mailer</DocsCode> in a new file —{" "}
          <DocsCode>postmark-mailer.ts</DocsCode>,{" "}
          <DocsCode>smtp-mailer.ts</DocsCode>, whatever. All six methods —
          TypeScript will fail the build until they're all there.
        </li>
        <li>
          Update the factory (<DocsCode>createDefaultMailer</DocsCode>) — or
          keep Resend and dispatch at a higher level by reading your own env
          var.
        </li>
        <li>
          Replace <DocsCode>RESEND_API_KEY</DocsCode> with your provider's
          secret.
        </li>
      </DocsList>
      <DocsCallout>
        Projectors don't need to know the adapter changed. They call{" "}
        <DocsCode>mailer.sendInvite(...)</DocsCode> — whatever's plugged in
        speaks the same shape.
      </DocsCallout>
    </DocsLayout>
  );
}
