# syntax=docker/dockerfile:1.7
#
# Orbit API — Hono + Prisma (Node 22)
#
# Build context MUST be the repo root (monorepo + turbo prune). No BuildKit
# secret is required for the API build — Prisma and `tsc` use repo defaults
# (`prisma.config.ts` supplies a default `DATABASE_URL` for `prisma generate`).
#   docker build -f apps/api/Dockerfile -t orbit-api .
#   docker build -f apps/api/Dockerfile --target migrate -t orbit-api-migrate .
#
# Stages:
#   base       — node + tini + openssl (Prisma needs libssl)
#   pruner     — `turbo prune @orbit/api --docker` to shrink the context
#   deps       — full deps (has prisma CLI, tsc, vitest types)
#   builder    — prisma generate + tsc build
#   prod-deps  — prod-only deps for the final runtime image
#   migrate    — one-shot `prisma migrate deploy` runner
#   runtime    — default; the API service itself

ARG NODE_VERSION=22-bookworm-slim

# Railway injects RAILWAY_SERVICE_ID as a build arg; BuildKit cache mounts
# must be prefixed with `s/<service-id>-` for Railway's builder to persist
# them across builds. Locally this defaults to "local".
ARG RAILWAY_SERVICE_ID=local

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /repo
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @orbit/api --docker

# ---------------------------------------------------------------------------
FROM base AS deps
ARG RAILWAY_SERVICE_ID
WORKDIR /app
ENV CI=1
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-orbit-npm,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
FROM deps AS builder
COPY --from=pruner /repo/out/full/ ./
# turbo prune --docker doesn't copy root tsconfig.base.json; app tsconfigs extend it.
COPY --from=pruner /repo/tsconfig.base.json ./tsconfig.base.json
RUN npx turbo run prisma:generate --filter=@orbit/api \
 && npx turbo run build --filter=@orbit/api

# ---------------------------------------------------------------------------
FROM base AS prod-deps
ARG RAILWAY_SERVICE_ID
WORKDIR /app
ENV CI=1 NODE_ENV=production
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-orbit-npm,target=/root/.npm npm ci --omit=dev

# ---------------------------------------------------------------------------
# One-shot migration runner. Wire it in front of `api` via docker-compose's
# `service_completed_successfully` or as a Railway pre-deploy step.
FROM base AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app ./
USER node
WORKDIR /app/apps/api
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/node_modules/.bin/prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------------
# Default target: the API runtime.
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4002
# Prod-only node_modules. The lockfile places many @orbit/api deps under
# `apps/api/node_modules/` (e.g. `@better-auth/prisma-adapter`); the root
# `node_modules/` alone is not enough for Node to resolve those imports.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
# Runtime source (includes generated prisma client from the builder).
# tsx resolves `@/*` from tsconfig `paths` — these files are required or Node
# mis-resolves imports like `@/calls` as npm packages and crashes.
COPY --from=builder   --chown=node:node /app/tsconfig.base.json     ./tsconfig.base.json
COPY --from=builder   --chown=node:node /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder   --chown=node:node /app/apps/api/src          ./apps/api/src
COPY --from=builder   --chown=node:node /app/apps/api/prisma       ./apps/api/prisma
COPY --from=builder   --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder   --chown=node:node /app/packages              ./packages
COPY --from=builder   --chown=node:node /app/package.json /app/package-lock.json /app/turbo.json ./
USER node
WORKDIR /app/apps/api
EXPOSE 4002
ENTRYPOINT ["/usr/bin/tini", "--"]
# Invoke tsx directly (no npm intermediary) so tini can forward signals to Node.
CMD ["node", "--import", "tsx", "src/index.ts"]
