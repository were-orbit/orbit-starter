import { timingSafeEqual } from "node:crypto";

/** Constant-time compare for long random shared secrets. */
export function secureStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}
