#!/bin/bash

# Configuration
DOCKER_USERNAME="tradekifi"  # Must be lowercase
IMAGE_NAME="telegram-middleware"
VERSION=$(date +%Y%m%d-%H%M%S)  # Use timestamp as version
PLATFORM="linux/amd64"  # Specify target platform

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment process...${NC}"

# Verify we're in the correct directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Error: Dockerfile not found. Make sure you're in the telegram-middleware directory.${NC}"
    exit 1
fi

# Build the image
echo -e "\n${GREEN}Building Docker image for $PLATFORM...${NC}"
docker buildx create --use
docker buildx build --platform $PLATFORM \
    -t $DOCKER_USERNAME/$IMAGE_NAME:latest \
    -t $DOCKER_USERNAME/$IMAGE_NAME:$VERSION \
    --load .

# Verify the build
echo -e "\n${GREEN}Verifying build...${NC}"
echo "Checking for sensitive files..."
docker run --rm --platform $PLATFORM $DOCKER_USERNAME/$IMAGE_NAME:latest sh -c '
    echo "=== Checking for .env files ==="
    find /app -name ".env*"
    echo -e "\n=== Checking sessions directory ==="
    ls -la /app/sessions
    echo -e "\n=== Checking all files in /app ==="
    ls -la /app
'

# Prompt for confirmation
read -p "Does everything look correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Login to Docker Hub
echo -e "\n${GREEN}Logging in to Docker Hub...${NC}"
docker login

# Push the images
echo -e "\n${GREEN}Pushing images to Docker Hub...${NC}"
docker push $DOCKER_USERNAME/$IMAGE_NAME:latest
docker push $DOCKER_USERNAME/$IMAGE_NAME:$VERSION

echo -e "\n${GREEN}Deployment complete!${NC}"
echo "Latest image: $DOCKER_USERNAME/$IMAGE_NAME:latest"
echo "Versioned image: $DOCKER_USERNAME/$IMAGE_NAME:$VERSION"

# Optional cleanup
read -p "Do you want to clean up local build images? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "\n${GREEN}Cleaning up local images...${NC}"
    docker image rm $DOCKER_USERNAME/$IMAGE_NAME:latest
    docker image rm $DOCKER_USERNAME/$IMAGE_NAME:$VERSION
    docker buildx rm
    echo "Cleanup complete!"
fi 