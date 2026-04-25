import { ValidationError } from "@/kernel/errors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(public readonly value: string) {}

  static parse(raw: string): Email {
    const trimmed = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      throw new ValidationError("email.invalid", "invalid email address");
    }
    return new Email(trimmed);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
