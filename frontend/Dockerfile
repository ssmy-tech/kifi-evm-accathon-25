# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy rest of the application code
COPY . .

ARG NEXT_PUBLIC_PRIVY_ID=placeholder_value

ENV NEXT_PUBLIC_PRIVY_ID=$NEXT_PUBLIC_PRIVY_ID

ARG NEXT_PUBLIC_GRAPHQL_URL=placeholder_value

ENV NEXT_PUBLIC_GRAPHQL_URL=$NEXT_PUBLIC_GRAPHQL_URL


# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"] 