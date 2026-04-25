# syntax=docker/dockerfile:1.7
#
# Orbit WWW — marketing site, TanStack Start (Nitro SSR, Node 22)
#
# Build context MUST be the repo root. Build-time env (e.g. VITE_WEB_URL) is read
# from a file passed as a BuildKit secret (not baked into the image layer history):
#   docker build -f apps/www/Dockerfile -t orbit-www \
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
RUN turbo prune @orbit/www --docker

# ---------------------------------------------------------------------------
FROM base AS deps
ARG RAILWAY_SERVICE_ID
WORKDIR /app
ENV CI=1
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,id=s/${RAILWAY_SERVICE_ID}-orbit-npm,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
FROM deps AS builder
ARG UNKEY_SECRETS_ID=env
COPY --from=pruner /repo/out/full/ ./
# turbo prune --docker doesn't copy root tsconfig.base.json; app tsconfigs extend it.
COPY --from=pruner /repo/tsconfig.base.json ./tsconfig.base.json
# Secret is optional: CI without VITE_* will use dev fallbacks in `src/lib/urls.ts`.
# `UNKEY_SECRETS_ID` matches the BuildKit secret id (e.g. from your deploy pipeline).
# Use UTF-8 / Unix LF only — invalid shell in `.env` makes `source` exit 2.
RUN --mount=type=secret,id=${UNKEY_SECRETS_ID},required=false,target=/run/secrets/.env \
  sh -c 'if [ -f /run/secrets/.env ] && [ -r /run/secrets/.env ] && [ -s /run/secrets/.env ]; then set -a; . /run/secrets/.env; set +a; fi; exec npx turbo run build --filter=@orbit/www'

# ---------------------------------------------------------------------------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000
COPY --from=builder --chown=node:node /app/apps/www/.output ./
USER node
EXPOSE 4000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "./server/index.mjs"]
