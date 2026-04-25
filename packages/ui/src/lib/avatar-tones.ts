/**
 * Shared 6-tone palette used by seeded avatars (rooms, workspaces, members).
 * Keeping one source of truth so a given slug/id always maps to the same hue
 * whether it's rendered as a dot cluster, a member pill, or a logo tile.
 */
export const AVATAR_TONE_COUNT = 6;

/** Pill classes: background tint + text + ring. Used by the app's MemberAvatar. */
export const AVATAR_PILL_TONES = [
  "bg-emerald-500/15 text-emerald-200 ring-emerald-500/20",
  "bg-sky-500/15 text-sky-200 ring-sky-500/20",
  "bg-amber-500/15 text-amber-200 ring-amber-500/20",
  "bg-violet-500/15 text-violet-200 ring-violet-500/20",
  "bg-rose-500/15 text-rose-200 ring-rose-500/20",
  "bg-teal-500/15 text-teal-200 ring-teal-500/20",
] as const;

/**
 * Text color classes used as the `color` of the dot SVG/canvas — dots paint with
 * `fill="currentColor"` so this drives hue while letting alpha do the work.
 */
export const AVATAR_DOT_TONES = [
  "text-emerald-600 dark:text-emerald-300",
  "text-sky-600 dark:text-sky-300",
  "text-amber-600 dark:text-amber-300",
  "text-violet-600 dark:text-violet-300",
  "text-rose-600 dark:text-rose-300",
  "text-teal-600 dark:text-teal-300",
] as const;

/** FNV-1a 32-bit — tiny, no deps, good enough for visual hashing. */
export function hashAvatarSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Stable tone index (0..AVATAR_TONE_COUNT-1) for a given seed. */
export function pickAvatarToneIndex(seed: string): number {
  return hashAvatarSeed(seed) % AVATAR_TONE_COUNT;
}
