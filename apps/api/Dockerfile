FROM node:22-alpine AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace=apps/api --include=workspace-root=false 2>/dev/null || npm install

# ── Copy source ───────────────────────────────────────────────────────────────
COPY tsconfig.json ./
COPY config/ config/
COPY core/ core/
COPY services/ services/
COPY apps/api/ apps/api/

# ── Build ─────────────────────────────────────────────────────────────────────
FROM base AS build
RUN npm run build --workspace=apps/api 2>/dev/null || npx tsc --project apps/api/tsconfig.json

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy only the compiled output and production deps
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
RUN npm ci --omit=dev

EXPOSE 3000

# Health check (liveness)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "dist/index.js"]
