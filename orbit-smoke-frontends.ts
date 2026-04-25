/**
 * Smoke test for the frontend-tanstack / frontend-next strip scenarios.
 *
 * - Copy the working tree into a temp dir (git-ignored, node_modules skipped).
 * - Run the strip engine once with `frontend-next` disabled (tanstack wins).
 * - Run it again with `frontend-tanstack` disabled (next wins).
 * - Assert the surviving apps/web-* folder is present and the other is gone.
 * - Also confirm the post-strip CLI helper repoints `dev:web` correctly.
 *
 * Deletes the temp dirs on success. Leaves them behind on failure so you
 * can `ls` in and see what broke.
 */
import { cp, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
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

async function copyWorkingTree(dest: string): Promise<void> {
  await cp(ROOT, dest, {
    recursive: true,
    force: false,
    filter: (src) => {
      const rel = path.relative(ROOT, src);
      if (!rel) return true;
      const seg = rel.split(path.sep);
      return !seg.some((p) => COPY_IGNORE.has(p));
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

async function assert(cond: boolean, msg: string): Promise<void> {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

async function repointDevWeb(
  projectPath: string,
  framework: "tanstack" | "next",
): Promise<void> {
  const { readFile, writeFile } = await import("node:fs/promises");
  const pkgPath = path.join(projectPath, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts) return;
  const surviving =
    framework === "tanstack" ? "@orbit/web-tanstack" : "@orbit/web-next";
  if (pkg.scripts["dev:web"]) {
    pkg.scripts["dev:web"] = `turbo run dev --filter=${surviving}`;
  }
  if (framework === "tanstack") delete pkg.scripts["dev:web-next"];
  else delete pkg.scripts["dev:web-tanstack"];
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

async function runScenario(
  label: string,
  keep: "tanstack" | "next",
): Promise<void> {
  const tmpParent = await mkdtemp(
    path.join(os.tmpdir(), `orbit-smoke-frontend-${keep}-`),
  );
  const tmp = path.join(tmpParent, "project");
  console.log(`\n[${label}] target = ${tmp}`);

  try {
    await copyWorkingTree(tmp);

    const selections: Record<string, boolean> = {
      frontend: true,
      "frontend-tanstack": keep === "tanstack",
      "frontend-next": keep === "next",
    };

    const report = await applyStrip(tmp, { selections });
    console.log(`  stripped: ${report.stripped.join(", ") || "(none)"}`);
    console.log(`  deleted:  ${report.filesDeleted.length} path(s)`);

    const webTanstack = path.join(tmp, "apps", "web-tanstack");
    const webNext = path.join(tmp, "apps", "web-next");

    if (keep === "tanstack") {
      await assert(await pathExists(webTanstack), "apps/web-tanstack must survive");
      await assert(!(await pathExists(webNext)), "apps/web-next must be gone");
    } else {
      await assert(!(await pathExists(webTanstack)), "apps/web-tanstack must be gone");
      await assert(await pathExists(webNext), "apps/web-next must survive");
    }

    await repointDevWeb(tmp, keep);
    const pkg = JSON.parse(
      await readFile(path.join(tmp, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const expected = keep === "tanstack" ? "@orbit/web-tanstack" : "@orbit/web-next";
    await assert(
      (pkg.scripts?.["dev:web"] ?? "").includes(expected),
      `dev:web must target ${expected}, got ${JSON.stringify(pkg.scripts?.["dev:web"])}`,
    );
    await assert(
      pkg.scripts?.[`dev:web-${keep === "tanstack" ? "next" : "tanstack"}`] === undefined,
      "dead dev:web-* shortcut must be removed",
    );

    console.log(`  ✓ scenario ${label} passed.`);
    await rm(tmpParent, { recursive: true, force: true });
  } catch (err) {
    console.error(`  ✗ scenario ${label} failed: ${(err as Error).message}`);
    console.error(`  inspect with:  ls ${tmp}`);
    throw err;
  }
}

async function main(): Promise<void> {
  await runScenario("tanstack-only", "tanstack");
  await runScenario("next-only", "next");
  console.log("\nAll frontend strip scenarios passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
