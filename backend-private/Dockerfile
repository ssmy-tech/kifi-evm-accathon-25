FROM node:20-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Start the chat scraper service
CMD ["npm", "run", "start:chat-scraper"] 