FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ gcc

# Install dependencies
COPY package*.json ./
RUN npm ci --no-optional

# Copy source code (only what's needed)
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk --no-cache add curl

# Install production dependencies only
COPY package*.json ./
RUN apk add --no-cache python3 make g++ gcc && \
    npm ci --no-optional --only=production && \
    apk del python3 make g++ gcc

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p sessions ssl && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"] 