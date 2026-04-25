#!/usr/bin/env tsx
/**
 * Orbit one-command local bootstrap.
 *
 *   npm run setup
 *
 * Idempotent — each step skips cleanly if already satisfied. Never
 * asks about provider selection (Stripe / Polar / graphile / QStash);
 * those are baked in by the CLI scaffold. Fills in credentials and
 * local URLs for whatever the CLI compiled, generates any HMAC
 * secrets, runs migrations, prints next steps.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  select,
  text,
} from "@clack/prompts";

import { readEnvFile, type EnvLine } from "./lib/env-parser.ts";
import { serializeEnvFile, setEnvValue } from "./lib/env-writer.ts";
import { probePostgres } from "./lib/pg-probe.ts";
import { generateSecret, shouldAutoGenerate } from "./lib/secret-gen.ts";

const REPO_ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const REQUIRED_NODE_MAJOR = 20;
const DEFAULT_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/orbit";

interface EnvTarget {
  app: string;
  examplePath: string;
  realPath: string;
}

const ENV_TARGETS: EnvTarget[] = [
  {
    app: "apps/api",
    examplePath: resolve(REPO_ROOT, "apps/api/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/api/.env"),
  },
  {
    app: "apps/www",
    examplePath: resolve(REPO_ROOT, "apps/www/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/www/.env"),
  },
  {
    app: "apps/web-tanstack",
    examplePath: resolve(REPO_ROOT, "apps/web-tanstack/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/web-tanstack/.env"),
  },
  {
    app: "apps/web-next",
    examplePath: resolve(REPO_ROOT, "apps/web-next/.env.example"),
    realPath: resolve(REPO_ROOT, "apps/web-next/.env"),
  },
];

function die(reason: string): never {
  cancel(reason);
  process.exit(1);
}

function bailIfCancelled<T>(
  maybe: T | symbol,
  reason = "Setup paused. Re-run anytime with `npm run setup`.",
): T {
  if (isCancel(maybe)) {
    cancel(reason);
    process.exit(0);
  }
  return maybe as T;
}

async function stepToolCheck(): Promise<void> {
  const versionString = process.versions.node;
  const major = Number(versionString.split(".")[0]);
  if (!Number.isFinite(major) || major < REQUIRED_NODE_MAJOR) {
    die(
      `Node ${REQUIRED_NODE_MAJOR}+ is required (you have ${versionString}).`,
    );
  }
  log.success(`Node ${versionString}`);
}

async function readDatabaseUrlCandidate(): Promise<string> {
  const apiEnv = resolve(REPO_ROOT, "apps/api/.env");
  const apiEnvExample = resolve(REPO_ROOT, "apps/api/.env.example");
  for (const path of [apiEnv, apiEnvExample]) {
    if (!existsSync(path)) continue;
    const lines = await readEnvFile(path);
    for (const line of lines) {
      if (
        line.kind === "var" &&
        !line.commentedOut &&
        line.key === "DATABASE_URL" &&
        line.value
      ) {
        return line.value;
      }
    }
  }
  return DEFAULT_DATABASE_URL;
}

async function stepPostgres(): Promise<string> {
  const candidate = await readDatabaseUrlCandidate();
  log.step("Checking Postgres reachability");
  let url = candidate;
  let probe = await probePostgres(url);

  while (!probe.ok) {
    log.warn(`Postgres not reachable at ${url}: ${probe.error}`);
    const choice = bailIfCancelled(
      await select({
        message: "What do you want to do?",
        options: [
          {
            value: "docker",
            label: "Start the bundled docker compose (recommended)",
          },
          {
            value: "custom",
            label: "Enter a different connection string",
          },
          {
            value: "skip",
            label: "Skip — I'll configure this later",
          },
        ],
      }),
    );
    if (choice === "skip") {
      log.info(
        "Skipping Postgres setup. You'll need a reachable DATABASE_URL before `npm run dev`.",
      );
      return url;
    }
    if (choice === "docker") {
      const result = spawnSync(
        "docker",
        ["compose", "--profile", "dev", "up", "-d", "postgres"],
        { cwd: REPO_ROOT, stdio: "inherit" },
      );
      if (result.status !== 0) {
        log.warn(
          "docker compose failed. Falling back to manual connection string.",
        );
        const manual = bailIfCancelled(
          await text({
            message: "Enter your Postgres connection string",
            initialValue: url,
          }),
        );
        url = manual;
      } else {
        // Wait up to 30s for the DB to become reachable.
        const start = Date.now();
        while (Date.now() - start < 30_000) {
          const p = await probePostgres(url);
          if (p.ok) break;
          await new Promise((r) => setTimeout(r, 1_000));
        }
      }
    }
    if (choice === "custom") {
      const manual = bailIfCancelled(
        await text({
          message: "Enter your Postgres connection string",
          initialValue: url,
        }),
      );
      url = manual;
    }
    probe = await probePostgres(url);
  }

  log.success(`Postgres reachable at ${url}`);
  return url;
}

interface SyncOptions {
  showOptional: boolean;
  databaseUrl: string;
}

async function stepEnvSync(opts: SyncOptions): Promise<void> {
  for (const target of ENV_TARGETS) {
    if (!existsSync(target.examplePath)) continue;
    log.step(`Syncing ${target.app}/.env`);

    // If .env doesn't exist, seed it from .env.example.
    let lines: EnvLine[];
    if (existsSync(target.realPath)) {
      lines = await readEnvFile(target.realPath);
    } else {
      lines = await readEnvFile(target.examplePath);
    }

    const exampleLines = await readEnvFile(target.examplePath);

    for (const example of exampleLines) {
      if (example.kind !== "var") continue;
      if (example.commentedOut && !opts.showOptional) continue;

      const existing = lines.find(
        (l) => l.kind === "var" && l.key === example.key,
      ) as Extract<EnvLine, { kind: "var" }> | undefined;

      // Only prompt if: not present at all, or present but empty+uncommented.
      const alreadySet =
        existing && !existing.commentedOut && existing.value !== "";
      if (alreadySet) continue;

      // For DATABASE_URL, if we just probed one, use that as the default.
      let defaultValue: string;
      if (example.key === "DATABASE_URL" && opts.databaseUrl) {
        defaultValue = opts.databaseUrl;
      } else if (shouldAutoGenerate(example.key)) {
        defaultValue = generateSecret();
      } else {
        defaultValue = example.value;
      }

      const helpText = buildHelpText(exampleLines, example.key);
      const message = helpText
        ? `${example.key}\n  ${helpText}`
        : example.key;

      const answer = bailIfCancelled(
        await text({
          message,
          initialValue: defaultValue,
          placeholder: defaultValue,
        }),
      );
      lines = setEnvValue(lines, example.key, answer);
    }

    await writeFile(target.realPath, serializeEnvFile(lines));
    log.success(`${target.app}/.env written`);
  }
}

/** Gather the `# ...` comment lines immediately above `key` in the example. */
function buildHelpText(lines: EnvLine[], key: string): string {
  const idx = lines.findIndex(
    (l) => l.kind === "var" && l.key === key,
  );
  if (idx === -1) return "";
  const buf: string[] = [];
  for (let i = idx - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (line.kind !== "comment") break;
    // Skip divider comments ("# ───...")
    if (/^#\s*[─-]{3,}/.test(line.text)) break;
    buf.unshift(line.text.replace(/^#\s?/, ""));
  }
  return buf.join(" ").slice(0, 160);
}

type OrmChoice = "prisma" | "drizzle" | null;

/**
 * Detect the ORM baked into the scaffold. The CLI deletes the files
 * for whichever ORM wasn't picked, so their presence is the authority —
 * never read an env var or ask the user. Returns `null` if neither is
 * present (incomplete scaffold); callers skip DB steps in that case.
 */
function detectOrm(): OrmChoice {
  const hasDrizzle = existsSync(
    resolve(REPO_ROOT, "apps/api/drizzle/drizzle.config.ts"),
  );
  const hasPrisma = existsSync(
    resolve(REPO_ROOT, "apps/api/prisma/schema.prisma"),
  );
  if (hasDrizzle) return "drizzle";
  if (hasPrisma) return "prisma";
  return null;
}

async function stepMigrations(orm: OrmChoice): Promise<void> {
  if (orm === "drizzle") {
    log.step("Running Drizzle migrations");
    const migrate = spawnSync(
      "npx",
      ["drizzle-kit", "migrate", "--config=drizzle/drizzle.config.ts"],
      { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
    );
    if (migrate.status !== 0) {
      die(
        "drizzle-kit migrate failed. Inspect the error above. " +
          "To start over locally, drop and recreate your database, then re-run setup.",
      );
    }
    log.success("Drizzle ready");
    return;
  }

  if (orm === "prisma") {
    log.step("Running Prisma migrations");
    const migrate = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy"],
      { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
    );
    if (migrate.status !== 0) {
      die(
        "Prisma migrate deploy failed. Inspect the error above. To wipe and reapply: `cd apps/api && npx prisma migrate reset`.",
      );
    }
    const generate = spawnSync(
      "npx",
      ["prisma", "generate"],
      { cwd: resolve(REPO_ROOT, "apps/api"), stdio: "inherit" },
    );
    if (generate.status !== 0) {
      die("Prisma generate failed.");
    }
    log.success("Prisma ready");
    return;
  }

  log.warn(
    "No ORM detected (neither apps/api/prisma/schema.prisma nor apps/api/drizzle/drizzle.config.ts exists). Skipping migrations.",
  );
}

async function stepSeed(orm: OrmChoice): Promise<void> {
  const seedPath =
    orm === "drizzle"
      ? resolve(REPO_ROOT, "apps/api/drizzle/seed.ts")
      : resolve(REPO_ROOT, "apps/api/prisma/seed.ts");
  if (!existsSync(seedPath)) return;

  const doSeed = bailIfCancelled(
    await confirm({
      message: "Seed a demo workspace?",
      initialValue: true,
    }),
  );
  if (!doSeed) return;

  const result =
    orm === "drizzle"
      ? spawnSync("npx", ["tsx", "drizzle/seed.ts"], {
          cwd: resolve(REPO_ROOT, "apps/api"),
          stdio: "inherit",
        })
      : spawnSync("npx", ["prisma", "db", "seed"], {
          cwd: resolve(REPO_ROOT, "apps/api"),
          stdio: "inherit",
        });

  if (result.status !== 0) {
    const rerun =
      orm === "drizzle"
        ? "npx tsx apps/api/drizzle/seed.ts"
        : "npm run prisma:seed";
    log.warn(`Seed failed. Continuing — re-run with \`${rerun}\`.`);
  }
}

async function stepSummary(databaseUrl: string): Promise<void> {
  const urls: Array<[string, string]> = [
    ["Postgres", databaseUrl],
    ["API", "http://localhost:4002"],
    ["Web (TanStack)", "http://localhost:4001"],
    ["Web (Next)", "http://localhost:4003"],
    ["Marketing", "http://localhost:4000"],
  ];
  for (const [label, value] of urls) {
    log.info(`${label.padEnd(18)} ${value}`);
  }
  outro("Setup complete — run: npm run dev");
}

async function main(): Promise<void> {
  intro("Orbit local setup");

  await stepToolCheck();
  const databaseUrl = await stepPostgres();

  const showOptional = bailIfCancelled(
    await confirm({
      message:
        "Show optional configuration? (OAuth, webhook tunnels, etc.)",
      initialValue: false,
    }),
  );

  await stepEnvSync({ showOptional, databaseUrl });
  const orm = detectOrm();
  await stepMigrations(orm);
  await stepSeed(orm);
  await stepSummary(databaseUrl);
}

main().catch((err) => {
  die(
    `Setup failed: ${err instanceof Error ? err.message : String(err)}\n` +
      "Re-run `npm run setup` after resolving the issue.",
  );
});
