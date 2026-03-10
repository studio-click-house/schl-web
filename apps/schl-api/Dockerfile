FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune schl-api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM installer AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=schl-api

FROM node:20-alpine AS runner
WORKDIR /app

# Install curl for healthchecks (Coolify uses this by default)
RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy the entire workspace node_modules and the isolated app dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/schl-api/node_modules ./apps/schl-api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/schl-api/dist ./apps/schl-api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/schl-api/package.json ./apps/schl-api/package.json

USER nestjs
EXPOSE 3000
CMD ["node", "apps/schl-api/dist/main.js"]