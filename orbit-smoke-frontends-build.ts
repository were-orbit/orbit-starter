/**
 * Heavier smoke test: do the strip, run npm install + tsc in each
 * scenario, make sure the surviving app still typechecks. Skipped by
 * default in CI because it touches `node_modules`.
 *
 * Runs:  npx tsx orbit-smoke-frontends-build.ts
 */
import { cp, mkdtemp, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { applyStrip } from "./packages/create-orb/src/strip.ts";

const ROOT = path.dirname(new URL(import.meta.url).pathname);

const COPY_IGNORE = new Set([
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  ".output",
  "dist",
  "build",
  ".vite",
  "coverage",
]);

async function run(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: "inherit" });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
    proc.on("error", reject);
  });
}

async function copyTree(dest: string): Promise<void> {
  await cp(ROOT, dest, {
    recursive: true,
    force: false,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      if (!rel) return true;
      return !rel.split(path.sep).some((p) => COPY_IGNORE.has(p));
    },
  });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function scenario(
  label: string,
  keep: "tanstack" | "next",
): Promise<void> {
  const tmpParent = await mkdtemp(
    path.join(os.tmpdir(), `orbit-smoke-frontend-build-${keep}-`),
  );
  const tmp = path.join(tmpParent, "project");
  console.log(`\n[${label}] target = ${tmp}`);

  await copyTree(tmp);
  await applyStrip(tmp, {
    selections: {
      frontend: true,
      "frontend-tanstack": keep === "tanstack",
      "frontend-next": keep === "next",
    },
  });

  const webTanstack = path.join(tmp, "apps", "web-tanstack");
  const webNext = path.join(tmp, "apps", "web-next");
  if (keep === "tanstack") {
    if (!(await pathExists(webTanstack))) throw new Error("web-tanstack missing");
    if (await pathExists(webNext)) throw new Error("web-next still present");
  } else {
    if (await pathExists(webTanstack)) throw new Error("web-tanstack still present");
    if (!(await pathExists(webNext))) throw new Error("web-next missing");
  }

  await run("npm", ["install", "--no-audit", "--no-fund"], tmp);
  await run("npm", ["run", "typecheck"], tmp);

  console.log(`  ✓ scenario ${label} passed.`);
  await rm(tmpParent, { recursive: true, force: true });
}

async function main(): Promise<void> {
  await scenario("tanstack-only", "tanstack");
  await scenario("next-only", "next");
  console.log("\nAll frontend build scenarios passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
