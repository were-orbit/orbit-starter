import { readFile } from "node:fs/promises";

export type EnvLine =
  | { kind: "blank" }
  | { kind: "comment"; text: string }
  | {
      kind: "var";
      key: string;
      value: string;
      /** True if the raw line wrapped the value in single or double quotes. */
      quoted: boolean;
      /** True for `# KEY=value` lines — still parsed so the writer can uncomment. */
      commentedOut: boolean;
    };

const VAR_RE = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/;
const COMMENTED_VAR_RE = /^\s*#\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/;

function stripQuotes(raw: string): { value: string; quoted: boolean } {
  const trimmed = raw.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return { value: trimmed.slice(1, -1), quoted: true };
  }
  return { value: trimmed, quoted: false };
}

export function parseEnvFile(raw: string): EnvLine[] {
  const result: EnvLine[] = [];
  const lines = raw.split(/\r?\n/);
  // Trailing newline produces an empty final element — ignore.
  const effective =
    lines.length > 0 && lines.at(-1) === "" ? lines.slice(0, -1) : lines;

  for (const line of effective) {
    if (line.trim() === "") {
      result.push({ kind: "blank" });
      continue;
    }
    const commented = line.match(COMMENTED_VAR_RE);
    if (commented) {
      const { value, quoted } = stripQuotes(commented[2] ?? "");
      result.push({
        kind: "var",
        key: commented[1]!,
        value,
        quoted,
        commentedOut: true,
      });
      continue;
    }
    const uncommented = line.match(VAR_RE);
    if (uncommented) {
      const { value, quoted } = stripQuotes(uncommented[2] ?? "");
      result.push({
        kind: "var",
        key: uncommented[1]!,
        value,
        quoted,
        commentedOut: false,
      });
      continue;
    }
    result.push({ kind: "comment", text: line });
  }
  return result;
}

export async function readEnvFile(path: string): Promise<EnvLine[]> {
  const raw = await readFile(path, "utf8");
  return parseEnvFile(raw);
}
