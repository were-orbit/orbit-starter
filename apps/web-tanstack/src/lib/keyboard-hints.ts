/**
 * Tiny helpers for form submit affordances: the "⌘↵" / "Ctrl+↵"
 * hint string shown next to primary buttons, and the matching keyup
 * detection. Kept platform-agnostic behind a single boolean (`isMac`).
 */

function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const p = navigator.platform ?? "";
  if (p) return /Mac|iPhone|iPod|iPad/i.test(p);
  return /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent ?? "");
}

/**
 * Returns the primary "submit this form" shortcut hint (either
 * "⌘↵" on macOS or "Ctrl+↵" elsewhere). Safe to call during SSR —
 * returns the mac variant as a stable default.
 */
export function primarySubmitShortcutHint(): string {
  return isMacPlatform() ? "\u2318\u21B5" : "Ctrl+\u21B5";
}

/**
 * Returns true when the event is the primary "submit this form"
 * shortcut: ⌘+Enter on macOS, Ctrl+Enter elsewhere.
 */
export function isModEnter(
  e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">,
): boolean {
  if (e.key !== "Enter") return false;
  return isMacPlatform() ? e.metaKey : e.ctrlKey;
}
