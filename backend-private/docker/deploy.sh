#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f ../.env ]; then
  source ../.env
fi

# Check required environment variables
required_vars=(
  "AWS_ACCOUNT_ID"
  "AWS_REGION"
  "ECR_REPOSITORY_URI"
  "ECS_CLUSTER"
  "VPC_SUBNET_1"
  "VPC_SUBNET_2"
  "SECURITY_GROUP"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "$var is not set"
    exit 1
  fi
done

# Deploy a service
deploy_service() {
  local service_name=$1
  echo "Deploying $service_name..."

  # Create task definition from template
  export SERVICE_NAME=$service_name
  envsubst < task-definition.template.json > task-definition.$service_name.json

  # Register new task definition
  task_def_arn=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition.$service_name.json \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

  # Check if service exists
  if aws ecs describe-services --cluster $ECS_CLUSTER --services kifi-$service_name | grep MISSING > /dev/null; then
    # Create service if it doesn't exist
    aws ecs create-service \
      --cluster $ECS_CLUSTER \
      --service-name kifi-$service_name \
      --task-definition $task_def_arn \
      --desired-count 1 \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={subnets=[$VPC_SUBNET_1,$VPC_SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}"
  else
    # Update existing service
    aws ecs update-service \
      --cluster $ECS_CLUSTER \
      --service kifi-$service_name \
      --task-definition $task_def_arn \
      --force-new-deployment
  fi

  echo "$service_name deployed successfully!"
}

# Deploy all services
services=("chat-scraper" "api-health" "ai-analytics")

for service in "${services[@]}"; do
  deploy_service $service
done

echo "All services deployed successfully!" 