import { ValidationError } from "@/kernel/errors.ts";

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;

export class WorkspaceSlug {
  private constructor(public readonly value: string) {}

  static parse(raw: string): WorkspaceSlug {
    const clean = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-+|-+$)/g, "");
    if (!SLUG_RE.test(clean)) {
      throw new ValidationError(
        "workspace_slug.invalid",
        "slug must be 3-32 chars, lowercase letters, digits, or dashes",
      );
    }
    return new WorkspaceSlug(clean);
  }

  toString(): string {
    return this.value;
  }
}
