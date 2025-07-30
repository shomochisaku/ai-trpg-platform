# Multi-stage build for optimized React/Vite production image
FROM node:20-alpine AS base

# Set build-time environment variables
ARG VITE_API_URL
ARG VITE_WS_URL

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Dependencies stage
FROM base AS dependencies

# Install all dependencies
RUN npm ci --include=dev

# Build stage
FROM dependencies AS build

# Copy source code
COPY . .

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Run type check and build
RUN npm run type-check
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S node -u 1001

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom error pages
COPY error-pages/ /usr/share/nginx/html/error-pages/

# Set proper permissions for non-root nginx
RUN chown -R node:nodejs /usr/share/nginx/html
RUN mkdir -p /tmp/nginx /var/cache/nginx/client_temp
RUN chown -R node:nodejs /tmp/nginx /var/cache/nginx
RUN chown -R node:nodejs /etc/nginx/conf.d

# Switch to non-root user
USER node

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]