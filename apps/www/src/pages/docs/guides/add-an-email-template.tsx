import {
  DocsCallout,
  DocsCode,
  DocsCodeBlock,
  DocsH2,
  DocsLayout,
  DocsP,
} from "@/components/docs-layout";

export const meta = {
  title: "Write a React Email template",
  description:
    "New .tsx template, new Mailer method, one line in each adapter, one projector to fire it.",
};

export function AddAnEmailTemplatePage() {
  return (
    <DocsLayout
      kicker="03 · Guides"
      title={meta.title}
      description={meta.description}
      path="/docs/guides/add-an-email-template"
    >
      <DocsP>
        Walking example: an <strong>invite-expired</strong> email that fires
        when a <DocsCode>WorkspaceInvite</DocsCode> passes its TTL and the
        system garbage-collects it. Same five steps for any new transactional
        email.
      </DocsP>

      <DocsH2>1. Design the template</DocsH2>
      <DocsP>
        Templates live in <DocsCode>apps/api/src/emails/</DocsCode> as{" "}
        <DocsCode>.tsx</DocsCode> files. Start by copying an existing one —{" "}
        <DocsCode>workspace-invite-email.tsx</DocsCode> is the shortest — and
        swap the content. Shared styles live in{" "}
        <DocsCode>orbit-email-styles.ts</DocsCode>, so every email looks like
        it came from the same brand.
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/emails/invite-expired-email.tsx">
        {`import {
  Body, Button, Container, Head, Heading,
  Html, Preview, Section, Text,
} from "@react-email/components";
import { orbitEmailStyles } from "./orbit-email-styles.ts";

export interface InviteExpiredEmailProps {
  workspaceName: string;
  resendInviteUrl: string;
}

export function InviteExpiredEmail({
  workspaceName,
  resendInviteUrl,
}: InviteExpiredEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your invitation to {workspaceName} expired</Preview>
      <Body style={orbitEmailStyles.page}>
        <Container style={orbitEmailStyles.container}>
          <Section style={orbitEmailStyles.card}>
            <Text style={orbitEmailStyles.eyebrow}>Orbit</Text>
            <Heading as="h1">Your invitation expired</Heading>
            <Text>
              Your invite to <strong>{workspaceName}</strong> expired before
              you used it. Ask whoever invited you for a fresh link.
            </Text>
            <Button href={resendInviteUrl}>Request a new invite</Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}`}
      </DocsCodeBlock>
      <DocsCallout>
        React Email renders to HTML + plain-text at build time. The
        <DocsCode>{"<Preview>"}</DocsCode> element is the inbox-preview line;
        it doesn't render in the body. Keep it informative and shorter than
        100 characters.
      </DocsCallout>

      <DocsH2>2. Extend the Mailer port</DocsH2>
      <DocsP>
        Open <DocsCode>apps/api/src/infrastructure/mailer.ts</DocsCode> and
        add the new method signature plus its input type:
      </DocsP>
      <DocsCodeBlock>
        {`export interface InviteExpiredEmail {
  to: string;
  workspaceName: string;
  resendInviteUrl: string;
}

export interface Mailer {
  sendMagicLink(email: MagicLinkEmail): Promise<void>;
  sendInvite(email: InviteEmail): Promise<void>;
  sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void>;
  sendChangeEmailNotice(email: ChangeEmailNoticeEmail): Promise<void>;
  sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void>;
  sendEmailVerification(email: EmailVerificationEmail): Promise<void>;
  sendInviteExpired(email: InviteExpiredEmail): Promise<void>; // ← new
}`}
      </DocsCodeBlock>

      <DocsH2>3. Implement it on both adapters</DocsH2>

      <DocsP>
        Both implementations need the new method. The ConsoleMailer is a
        two-liner:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/infrastructure/mailer.ts (ConsoleMailer)">
        {`async sendInviteExpired(email: InviteExpiredEmail): Promise<void> {
  console.log(\`[console-mailer] invite-expired -> \${email.to} (\${email.workspaceName})\`);
}`}
      </DocsCodeBlock>

      <DocsP>
        The ResendMailer renders the template and ships it:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/infrastructure/resend-mailer.tsx">
        {`async sendInviteExpired(email: InviteExpiredEmail): Promise<void> {
  const { html, text } = await renderEmail(InviteExpiredEmail, {
    workspaceName: email.workspaceName,
    resendInviteUrl: email.resendInviteUrl,
  });
  await this.client.emails.send({
    from: this.from,
    to: email.to,
    subject: \`Your invitation to \${email.workspaceName} expired\`,
    html,
    text,
  });
}`}
      </DocsCodeBlock>
      <DocsCallout kind="warn">
        TypeScript enforces this — once you've extended the{" "}
        <DocsCode>Mailer</DocsCode> interface, both adapters fail to compile
        until they implement the new method. Don't <DocsCode>// @ts-ignore</DocsCode>{" "}
        it; the one you forget will be the one you need.
      </DocsCallout>

      <DocsH2>4. Fire it from a projector</DocsH2>
      <DocsP>
        Assuming the cleanup job emits a{" "}
        <DocsCode>WorkspaceInviteExpired</DocsCode> domain event, write a
        projector that subscribes to it and calls the mailer. Projectors
        live alongside services in <DocsCode>application/</DocsCode>:
      </DocsP>
      <DocsCodeBlock caption="apps/api/src/workspaces/application/invite-expired-mailer.projector.ts">
        {`import type { EventBus } from "@/kernel/events.ts";
import type { UnitOfWork } from "@/kernel/uow.ts";
import type { Mailer } from "@/infrastructure/mailer.ts";
import type { WorkspaceInviteExpired } from "../domain/invite.ts";

export class InviteExpiredMailerProjector {
  constructor(
    private readonly bus: EventBus,
    private readonly uow: UnitOfWork,
    private readonly mailer: Mailer,
    private readonly webOrigin: string,
  ) {}

  start(): void {
    this.bus.subscribe<WorkspaceInviteExpired>(
      "workspaces.invite.expired",
      async (event) => {
        const data = await this.uow.read(async (tx) => {
          const invite = await tx.workspaceInvites.findById(event.inviteId);
          if (!invite) return null;
          const workspace = await tx.workspaces.findById(invite.workspaceId);
          if (!workspace) return null;
          return { email: invite.email, workspaceName: workspace.name };
        });
        if (!data) return;

        await this.mailer.sendInviteExpired({
          to: data.email,
          workspaceName: data.workspaceName,
          resendInviteUrl: \`\${this.webOrigin}/invites/request?workspace=\${encodeURIComponent(data.workspaceName)}\`,
        });
      },
    );
  }
}`}
      </DocsCodeBlock>

      <DocsH2>5. Wire it in composition</DocsH2>
      <DocsP>
        Projectors only matter if something boots them. Add one line in{" "}
        <DocsCode>composition.ts</DocsCode> right next to the realtime
        publisher:
      </DocsP>
      <DocsCodeBlock>
        {`const inviteExpiredProjector = new InviteExpiredMailerProjector(
  bus,
  uow,
  mailer,
  config.webOrigin,
);
inviteExpiredProjector.start();`}
      </DocsCodeBlock>
      <DocsCallout>
        Projectors are subscribers — forgetting to call{" "}
        <DocsCode>start()</DocsCode> produces silent no-ops. If a new email
        isn't firing, check composition first.
      </DocsCallout>

      <DocsH2>Previewing during development</DocsH2>
      <DocsP>
        React Email has a preview server:{" "}
        <DocsCode>npx react-email dev</DocsCode> in{" "}
        <DocsCode>apps/api</DocsCode>. It renders every{" "}
        <DocsCode>.tsx</DocsCode> in <DocsCode>src/emails/</DocsCode> in a
        web UI with live reload, so you can iterate on layout without
        sending real mail.
      </DocsP>
      <DocsP>
        For inbox QA: set <DocsCode>RESEND_SEND_IN_DEV=1</DocsCode> in your{" "}
        <DocsCode>apps/api/.env</DocsCode>, restart the API, and the
        ResendMailer replaces the ConsoleMailer in dev. Trigger the event
        (cause an invite to expire, or call the projector handler directly)
        and the email lands in the inbox you configured as{" "}
        <DocsCode>RESEND_FROM</DocsCode>.
      </DocsP>

      <DocsH2>Style notes</DocsH2>
      <DocsP>
        <DocsCode>orbit-email-styles.ts</DocsCode> centralizes typography,
        spacing, and button styling. Don't inline hex colors; reach for the
        shared object. Apple Mail, Gmail, and every enterprise client behave
        slightly differently — staying within the vocabulary already in use
        means you're on tested ground.
      </DocsP>
    </DocsLayout>
  );
}
