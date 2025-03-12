#!/bin/bash

# Exit on error
set -e

# Create and use a new builder instance with multi-arch support
docker buildx create --name multi-arch-builder --use || true

# Build base image for multiple architectures
echo "Building multi-arch base image..."
docker buildx build --platform linux/amd64,linux/arm64 \
  -t kifi-base:latest \
  -f Dockerfile.base \
  --load \
  ..

# Build service images
services=("chat-scraper" "api-health" "ai-analytics" "trade-executor")

for service in "${services[@]}"; do
  echo "Building $service image..."
  docker buildx build --platform linux/amd64,linux/arm64 \
    -t "kifi-$service:latest" \
    -f "Dockerfile.$service" \
    --load \
    ..
done

echo "All images built successfully!" 