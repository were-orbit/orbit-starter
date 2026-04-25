import { describe, expect, it } from "vitest";
import { parseEnvFile } from "./env-parser.ts";
import { serializeEnvFile, setEnvValue } from "./env-writer.ts";

describe("serializeEnvFile", () => {
  it("round-trips through parse + serialize", () => {
    const raw = `# top\n\nDATABASE_URL="postgres://x"\n# doc\nFOO=bar\n# OPT="y"\n`;
    const lines = parseEnvFile(raw);
    expect(serializeEnvFile(lines)).toBe(raw);
  });

  it("preserves unquoted vars as unquoted", () => {
    const raw = `FOO=bar\n`;
    expect(serializeEnvFile(parseEnvFile(raw))).toBe(raw);
  });
});

describe("setEnvValue", () => {
  it("updates an existing uncommented value", () => {
    const lines = parseEnvFile(`FOO="old"\n`);
    const next = setEnvValue(lines, "FOO", "new");
    expect(serializeEnvFile(next)).toBe(`FOO="new"\n`);
  });

  it("uncomments and assigns a previously commented-out var", () => {
    const lines = parseEnvFile(`# FOO="example"\n`);
    const next = setEnvValue(lines, "FOO", "real");
    expect(serializeEnvFile(next)).toBe(`FOO="real"\n`);
  });

  it("appends the var when it isn't present at all", () => {
    const lines = parseEnvFile(`BAR=1\n`);
    const next = setEnvValue(lines, "NEW", "value");
    expect(serializeEnvFile(next)).toBe(`BAR=1\nNEW="value"\n`);
  });

  it("is idempotent — setting the same value twice is a no-op", () => {
    const lines = parseEnvFile(`FOO="x"\n`);
    const once = setEnvValue(lines, "FOO", "y");
    const twice = setEnvValue(once, "FOO", "y");
    expect(serializeEnvFile(twice)).toBe(`FOO="y"\n`);
  });

  it("preserves quoting style of the existing var", () => {
    const lines = parseEnvFile(`FOO=bar\n`);
    const next = setEnvValue(lines, "FOO", "baz");
    // Was unquoted, stays unquoted.
    expect(serializeEnvFile(next)).toBe(`FOO=baz\n`);
  });
});
