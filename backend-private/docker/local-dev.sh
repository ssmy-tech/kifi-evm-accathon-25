#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting local development environment...${NC}"

# Build the base image first
echo -e "\n${GREEN}Building base image...${NC}"
docker build -t kifi-base:latest -f Dockerfile.base ..

# Build and start services
echo -e "\n${GREEN}Starting services...${NC}"
docker-compose up --build -d

# Wait for services to be healthy
echo -e "\n${GREEN}Waiting for services to be healthy...${NC}"
attempt=1
max_attempts=30
until [ $(docker-compose ps | grep -c "healthy") -eq 2 ] || [ $attempt -gt $max_attempts ]
do
    echo "Attempt $attempt/$max_attempts: Waiting for services to be healthy..."
    sleep 5
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo -e "${RED}Services failed to become healthy within the timeout period${NC}"
    docker-compose logs
    exit 1
fi

echo -e "\n${GREEN}Services are up and healthy!${NC}"
echo "Chat Scraper is available at: http://localhost:3000"
echo "PostgreSQL is available at: localhost:5432"
echo -e "\nTo view logs: docker-compose logs -f"
echo "To stop: docker-compose down" 