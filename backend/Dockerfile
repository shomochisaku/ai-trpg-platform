# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS base

# Install security updates and necessary tools
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S aitrpg -u 1001

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove development dependencies and source files to reduce image size
RUN rm -rf src/ tests/ node_modules/
RUN npm ci --only=production && npm cache clean --force

# Change ownership of the app directory to nodejs user
RUN chown -R aitrpg:nodejs /app
USER aitrpg

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { \
    if (res.statusCode === 200) process.exit(0); else process.exit(1); \
  })" || exit 1

# Start the application
CMD ["npm", "start"]