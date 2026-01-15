# =============================================================================
# Stage 1: Builder - Build the NestJS application
# =============================================================================
FROM node:20-alpine AS builder

# Install build dependencies for native modules (argon2, etc.)
RUN apk add --no-cache python3 make g++ openssl

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
# Using pnpm install --no-frozen-lockfile to handle lockfile compatibility
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm prisma generate

# Build the NestJS application (TypeScript -> JavaScript)
RUN pnpm run build

# Approve builds (for NestJS build verification)
RUN pnpm approve-builds || true

# Remove devDependencies to reduce size for production
RUN pnpm prune --prod

# =============================================================================
# Stage 2: Production - Minimal runtime image
# =============================================================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache openssl dumb-init

# Create non-root user for running the application
# Using 'node' user that already exists in node:alpine (UID 1000)
USER node

# Set working directory with proper ownership
WORKDIR /app

# Copy package.json from builder (needed for node_modules resolution)
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Copy production dependencies from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy Prisma schema
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Copy built application from builder stage (dist folder)
COPY --chown=node:node --from=builder /app/dist ./dist

# Environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose application port
EXPOSE 3000

# Use dumb-init to handle signals properly
# This ensures graceful shutdown of Node.js process
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]

# Health check (optional - adjust endpoint as needed)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
