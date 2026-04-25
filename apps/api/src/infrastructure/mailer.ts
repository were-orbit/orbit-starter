// +feature:auth-magic-link
export interface MagicLinkEmail {
  to: string;
  token: string;
  link: string;
  expiresAt: Date;
}
// -feature:auth-magic-link

export interface InviteEmail {
  to: string;
  workspaceName: string;
  workspaceSlug: string;
  token: string;
  link: string;
}

export interface ChangeEmailVerificationEmail {
  to: string;
  currentEmail: string;
  link: string;
}

// FYI sent to the CURRENT address so a stolen session can't silently
// flip the email without the real owner seeing anything.
export interface ChangeEmailNoticeEmail {
  to: string;
  newEmail: string;
  supportLink?: string;
}

export interface AccountDeletionVerificationEmail {
  to: string;
  link: string;
}


export interface Mailer {
  // +feature:auth-magic-link
  sendMagicLink(email: MagicLinkEmail): Promise<void>;
  // -feature:auth-magic-link
  sendInvite(email: InviteEmail): Promise<void>;
  sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void>;
  sendChangeEmailNotice(email: ChangeEmailNoticeEmail): Promise<void>;
  sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void>;
}

// +feature:auth-magic-link
/** Filled in non-production for local sign-in UX (any mailer). */
let devMagicLinkLast: { to: string; link: string } | null = null;

export function getDevMagicLinkLast(): { to: string; link: string } | null {
  return devMagicLinkLast;
}

export function captureDevMagicLink(to: string, link: string): void {
  if (process.env.NODE_ENV !== "production") {
    devMagicLinkLast = { to: to.trim().toLowerCase(), link };
  }
}
// -feature:auth-magic-link

export class ConsoleMailer implements Mailer {
  // +feature:auth-magic-link
  async sendMagicLink(email: MagicLinkEmail): Promise<void> {
    captureDevMagicLink(email.to, email.link);
    console.log(
      `[mailer] magic-link → ${email.to}\n         token=${email.token}\n         link=${email.link}\n         expires=${email.expiresAt.toISOString()}`,
    );
  }
  // -feature:auth-magic-link

  async sendInvite(email: InviteEmail): Promise<void> {
    console.log(
      `[mailer] invite → ${email.to} to ${email.workspaceSlug} (${email.workspaceName})\n         token=${email.token}\n         link=${email.link}`,
    );
  }

  async sendChangeEmailVerification(email: ChangeEmailVerificationEmail): Promise<void> {
    console.log(
      `[mailer] change-email verification -> ${email.to} (current: ${email.currentEmail})\n         link=${email.link}`,
    );
  }

  async sendChangeEmailNotice(email: ChangeEmailNoticeEmail): Promise<void> {
    console.log(
      `[mailer] change-email notice (FYI to current address) -> ${email.to}\n         newEmail=${email.newEmail}`,
    );
  }

  async sendAccountDeletionVerification(email: AccountDeletionVerificationEmail): Promise<void> {
    console.log(
      `[mailer] account-deletion verification -> ${email.to}\n         link=${email.link}`,
    );
  }

}
