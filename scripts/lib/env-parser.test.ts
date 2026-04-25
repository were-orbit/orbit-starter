import { describe, expect, it } from "vitest";
import { parseEnvFile } from "./env-parser.ts";

describe("parseEnvFile", () => {
  it("parses blank lines, comments, and vars", () => {
    const raw = `# header comment\n\nDATABASE_URL="postgres://x"\n# help for FOO\nFOO=bar\n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      { kind: "comment", text: "# header comment" },
      { kind: "blank" },
      {
        kind: "var",
        key: "DATABASE_URL",
        value: "postgres://x",
        quoted: true,
        commentedOut: false,
      },
      { kind: "comment", text: "# help for FOO" },
      {
        kind: "var",
        key: "FOO",
        value: "bar",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("recognises a commented-out var (# KEY=value)", () => {
    const raw = `# OPTIONAL="leave blank in dev"\n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      {
        kind: "var",
        key: "OPTIONAL",
        value: "leave blank in dev",
        quoted: true,
        commentedOut: true,
      },
    ]);
  });

  it("ignores whitespace around keys and values", () => {
    const raw = `  KEY  =  value  \n`;
    const lines = parseEnvFile(raw);
    expect(lines).toEqual([
      {
        kind: "var",
        key: "KEY",
        value: "value",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("keeps an empty value", () => {
    const raw = `EMPTY=\n`;
    expect(parseEnvFile(raw)).toEqual([
      {
        kind: "var",
        key: "EMPTY",
        value: "",
        quoted: false,
        commentedOut: false,
      },
    ]);
  });

  it("treats lines that aren't var-shaped as plain comments even without '#'", () => {
    const raw = `random words\n`;
    expect(parseEnvFile(raw)).toEqual([
      { kind: "comment", text: "random words" },
    ]);
  });
});
