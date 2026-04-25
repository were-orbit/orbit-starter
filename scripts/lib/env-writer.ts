import type { EnvLine } from "./env-parser.ts";

function formatVarLine(
  key: string,
  value: string,
  quoted: boolean,
  commentedOut: boolean,
): string {
  const prefix = commentedOut ? "# " : "";
  const body = quoted ? `${key}="${value}"` : `${key}=${value}`;
  return `${prefix}${body}`;
}

export function serializeEnvFile(lines: EnvLine[]): string {
  const out: string[] = [];
  for (const line of lines) {
    if (line.kind === "blank") {
      out.push("");
    } else if (line.kind === "comment") {
      out.push(line.text);
    } else {
      out.push(
        formatVarLine(line.key, line.value, line.quoted, line.commentedOut),
      );
    }
  }
  // Match the convention of a trailing newline, which matches dotenv norms.
  return `${out.join("\n")}\n`;
}

/**
 * Set `key` to `value` in the given line structure:
 *   - If the key exists uncommented, overwrite its value.
 *   - If the key exists commented-out (`# KEY=...`), uncomment and overwrite.
 *   - Otherwise, append a new `KEY="value"` line at the end.
 *
 * Returns a new array — input is not mutated.
 */
export function setEnvValue(
  lines: EnvLine[],
  key: string,
  value: string,
): EnvLine[] {
  const idx = lines.findIndex(
    (l) => l.kind === "var" && l.key === key,
  );
  if (idx === -1) {
    return [
      ...lines,
      { kind: "var", key, value, quoted: true, commentedOut: false },
    ];
  }
  const existing = lines[idx] as Extract<EnvLine, { kind: "var" }>;
  const updated: EnvLine = {
    kind: "var",
    key,
    value,
    quoted: existing.quoted,
    commentedOut: false,
  };
  return [...lines.slice(0, idx), updated, ...lines.slice(idx + 1)];
}
