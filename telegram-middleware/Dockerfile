FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json and install production dependencies only
COPY package*.json ./
RUN npm install --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create .env file if it doesn't exist
RUN touch .env

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"] 