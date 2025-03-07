#!/bin/bash

# Set colors for console output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment is dev
ENV="dev"

# Display help information
show_help() {
  echo -e "${BLUE}Prisma Database Update Script${NC}"
  echo ""
  echo "Usage: ./update-db.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -h, --help                Show this help message"
  echo "  -r, --reset               Reset the database (drops all tables and recreates them)"
  echo "  -m, --migrate             Run migrations (default action if no option provided)"
  echo "  -s, --seed                Seed the database with sample data"
  echo "  -a, --all                 Perform all actions: migrate, generate client, and seed"
  echo "  -g, --generate            Only generate Prisma client"
  echo "  -e, --env [ENVIRONMENT]   Specify environment (dev, staging, prod) - default: dev"
  echo ""
}

# Handle options
RESET=false
MIGRATE=false
SEED=false
GENERATE=false

# If no arguments, default to migrate
if [ $# -eq 0 ]; then
  MIGRATE=true
  GENERATE=true
fi

# Parse command line arguments
while (( "$#" )); do
  case "$1" in
    -h|--help)
      show_help
      exit 0
      ;;
    -r|--reset)
      RESET=true
      shift
      ;;
    -m|--migrate)
      MIGRATE=true
      shift
      ;;
    -s|--seed)
      SEED=true
      shift
      ;;
    -g|--generate)
      GENERATE=true
      shift
      ;;
    -a|--all)
      MIGRATE=true
      GENERATE=true
      SEED=true
      shift
      ;;
    -e|--env)
      if [ -n "$2" ] && [ ${2:0:1} != "-" ]; then
        ENV=$2
        shift 2
      else
        echo -e "${RED}Error: Argument for $1 is missing${NC}"
        exit 1
      fi
      ;;
    *)
      echo -e "${RED}Error: Invalid option $1${NC}"
      show_help
      exit 1
      ;;
  esac
done

# Get the absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." &>/dev/null && pwd)"
SCHEMA_PATH="$PROJECT_ROOT/prisma/schema.prisma"

# Check if schema file exists
if [ ! -f "$SCHEMA_PATH" ]; then
  echo -e "${RED}Error: Prisma schema file not found at $SCHEMA_PATH${NC}"
  exit 1
fi

# Load environment variables
ENV_PATH="${SCRIPT_DIR}/../environments/${ENV}/.env"
if [ -f "$ENV_PATH" ]; then
  echo -e "${BLUE}Loading environment: ${ENV} from $ENV_PATH${NC}"
  export $(grep -v '^#' "$ENV_PATH" | xargs)
else
  echo -e "${RED}Error: .env file not found at $ENV_PATH${NC}"
  echo -e "${RED}Make sure the file exists at: ${SCRIPT_DIR}/../environments/${ENV}/.env${NC}"
  exit 1
fi

# Verify database URL is set
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL is not set in .env file${NC}"
  exit 1
fi

# Change to the project root directory for all operations
cd "$PROJECT_ROOT"

# Reset database if requested
if [ "$RESET" = true ]; then
  echo -e "${YELLOW}🧹 Resetting database...${NC}"
  npx prisma migrate reset --force --schema="$SCHEMA_PATH"
fi

# Apply migrations if requested
if [ "$MIGRATE" = true ]; then
  echo -e "${YELLOW}🔄 Applying migrations...${NC}"
  npx prisma migrate dev --schema="$SCHEMA_PATH"
fi

# Generate Prisma client if requested
if [ "$GENERATE" = true ]; then
  echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
  npx prisma generate --schema="$SCHEMA_PATH"
fi

# Seed database if requested
if [ "$SEED" = true ]; then
  echo -e "${YELLOW}🌱 Seeding database...${NC}"
  npx ts-node prisma/seeds/${ENV}.ts
fi

echo -e "${GREEN}✅ Database update completed successfully for ${ENV} environment!${NC}" 