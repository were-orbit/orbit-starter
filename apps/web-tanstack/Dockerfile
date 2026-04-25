# syntax=docker/dockerfile:1.7
#
# Orbit Web — TanStack Start (Nitro SSR, Node 22)
#
# Build context MUST be the repo root. VITE_* and other build-time env are read
# from a file passed as a BuildKit secret (values are inlined at `vite build`,
# not available at container runtime). Example:
#   docker build -f apps/web-tanstack/Dockerfile -t orbit-web-tanstack \
#     --secret id=env,src=./path/to/.env .

ARG NODE_VERSION=22-bookworm-slim
ARG RAILWAY_SERVICE_ID=local

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /repo
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @orbit/web-tanstack --docker

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
RUN --mount=type=secret,id=env,required=false,target=/run/secrets/.env \
  sh -c 'if [ -f /run/secrets/.env ] && [ -r /run/secrets/.env ] && [ -s /run/secrets/.env ]; then set -a; . /run/secrets/.env; set +a; fi; exec npx turbo run build --filter=@orbit/web-tanstack'

# ---------------------------------------------------------------------------
# Runtime: Nitro's .output is self-contained (bundles its own node_modules).
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4001
COPY --from=builder --chown=node:node /app/apps/web-tanstack/.output ./
USER node
EXPOSE 4001
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "./server/index.mjs"]
