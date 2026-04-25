import "dotenv/config";
import { defineConfig } from "prisma/config";

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/orbit?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Allow root-level turbo Prisma commands without requiring a pre-set DATABASE_URL.
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
});
