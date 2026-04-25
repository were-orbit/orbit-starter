import { describe, expect, it } from "vitest";
import { generateSecret, shouldAutoGenerate } from "./secret-gen.ts";

describe("shouldAutoGenerate", () => {
  it.each([
    "BETTER_AUTH_SECRET",
    "WAITLIST_ADMIN_SECRET",
    "FOO_SECRET",
    "QSTASH_CURRENT_SIGNING_KEY",
  ])("returns true for %s", (key) => {
    expect(shouldAutoGenerate(key)).toBe(true);
  });

  it.each(["DATABASE_URL", "STRIPE_SECRET_KEY", "API_ORIGIN"])(
    "returns false for %s",
    (key) => {
      expect(shouldAutoGenerate(key)).toBe(false);
    },
  );

  it("is case-sensitive — only upper-snake matches", () => {
    expect(shouldAutoGenerate("foo_secret")).toBe(false);
  });
});

describe("generateSecret", () => {
  it("returns a 64-char hex string by default (32 bytes)", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });

  it("honours a custom byte length", () => {
    expect(generateSecret(16)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is unique across calls", () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });
});
