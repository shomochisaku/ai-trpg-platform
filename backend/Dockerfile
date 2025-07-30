# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install system dependencies for Prisma and native modules
RUN apk add --no-cache \
    openssl \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies stage
FROM base AS dependencies

# Install all dependencies (including dev)
RUN npm ci --include=dev

# Generate Prisma client
RUN npx prisma generate

# Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Run build
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Use existing node user for security (already exists in node:20-alpine)

# Install runtime dependencies only
RUN apk add --no-cache \
    openssl \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy any necessary static files
COPY --from=build /app/src/config ./src/config

# Change ownership to node user (existing user in node:20-alpine)
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]