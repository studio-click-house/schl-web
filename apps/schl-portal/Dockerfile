FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune schl-portal --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

FROM installer AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
RUN NEXT_STANDALONE=true pnpm turbo run build --filter=schl-portal

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install curl for healthchecks (Coolify uses this by default)
RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/schl-portal/public ./apps/schl-portal/public
# Copy the standalone Next.js server files
COPY --from=builder --chown=nextjs:nodejs /app/apps/schl-portal/.next/standalone ./
# Copy workspace packages which might be symlinked and skipped by standalone output
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

COPY --from=builder --chown=nextjs:nodejs /app/apps/schl-portal/.next/static ./apps/schl-portal/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
# Listen on all interfaces so the container is accessible from the outside
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/schl-portal/server.js"]