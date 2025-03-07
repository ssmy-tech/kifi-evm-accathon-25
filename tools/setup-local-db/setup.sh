#!/bin/bash

# Define paths
SHARED_PRISMA_PATH="../../prisma/schema.prisma"
DOCKER_PROJECT_NAME="prisma_kifi_accelation_db"

# Step 1: Start Docker container
echo "Starting PostgreSQL container..."
docker-compose up -d

# Step 2: Install Prisma CLI if not already installed
if ! [ -x "$(command -v prisma)" ]; then
  echo "Installing Prisma CLI..."
  npm install -g prisma
fi

# Step 3: Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to start..."
until docker exec $DOCKER_PROJECT_NAME pg_isready -U prisma > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Step 4: Apply Prisma schema
echo "Applying Prisma schema..."
npx prisma generate --schema="$SHARED_PRISMA_PATH"
npx prisma db push --schema="$SHARED_PRISMA_PATH"

# Step 5: Confirmation
echo "Database setup complete. PostgreSQL is running and schema is applied!"
