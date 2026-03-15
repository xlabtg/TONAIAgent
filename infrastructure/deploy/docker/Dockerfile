# TON AI Agent - Production Dockerfile
#
# Multi-stage build for optimized production image
# Includes Node.js runtime with TypeScript support
#
# Build: docker build -t tonaiagent:latest .
# Run: docker run -p 3000:3000 --env-file .env tonaiagent:latest

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Ensure optional static directories exist so COPY won't fail in runner stage
RUN mkdir -p /app/apps/marketing-website /app/apps/telegram-miniapp/backend/public

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Run as non-root user
RUN addgroup --system --gid 1001 tonaiagent && \
    adduser --system --uid 1001 tonaiagent

# Install runtime dependencies only
RUN apk add --no-cache curl dumb-init

# Copy production node_modules
COPY --from=deps --chown=tonaiagent:tonaiagent /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=tonaiagent:tonaiagent /app/dist ./dist
COPY --from=builder --chown=tonaiagent:tonaiagent /app/package.json ./

# Copy static files (directories are guaranteed to exist from builder stage)
COPY --from=builder --chown=tonaiagent:tonaiagent /app/apps/marketing-website ./apps/marketing-website
COPY --from=builder --chown=tonaiagent:tonaiagent /app/apps/telegram-miniapp/backend/public ./apps/telegram-miniapp/backend/public

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER tonaiagent

# Use dumb-init as PID 1 for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
