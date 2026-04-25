import { randomBytes } from "node:crypto";

/**
 * True when the env key names a local HMAC secret the script can
 * safely auto-generate. Intentionally suffix-based so external
 * credentials like `STRIPE_SECRET_KEY` are excluded — those are
 * provisioned outside the project and must be pasted in.
 */
export function shouldAutoGenerate(key: string): boolean {
  return /_(SECRET|SIGNING_KEY)$/.test(key) && /^[A-Z_]+$/.test(key);
}

export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}
