#!/usr/bin/env bash
set -euo pipefail

echo "================================================"
echo "  GymAccess (GymAccess) - Development Setup"
echo "================================================"
echo ""

# Check prerequisites
check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "ERROR: $1 is required but not installed."
    echo "Please install $1 and try again."
    exit 1
  fi
}

echo "Checking prerequisites..."
check_command docker
check_command node
check_command npm

# Verify Docker is running
if ! docker info &> /dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Please start Docker and try again."
  exit 1
fi

echo "All prerequisites satisfied."
echo ""

# Create .env from example if it doesn't exist
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Created .env file. Review and update values as needed."
  else
    echo "WARNING: No .env.example found. You may need to create .env manually."
  fi
else
  echo ".env already exists, skipping."
fi
echo ""

# Install API dependencies
if [ -d api ]; then
  echo "Installing API dependencies..."
  cd api && npm install && cd ..
fi

# Install frontend dependencies
if [ -d frontend ]; then
  echo "Installing frontend dependencies..."
  cd frontend && npm install && cd ..
fi

# Install worker dependencies
if [ -d worker ]; then
  echo "Installing worker dependencies..."
  cd worker && npm install && cd ..
fi

echo ""

# Start Docker Compose
echo "Starting services with Docker Compose..."
docker compose up -d --build

echo ""
echo "Waiting for services to be ready..."
sleep 5

# Run migrations if script exists
if [ -f scripts/migrate ]; then
  echo "Running database migrations..."
  chmod +x scripts/migrate
  ./scripts/migrate
fi

echo ""
echo "================================================"
echo "  GymAccess is running!"
echo "================================================"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  API:       http://localhost:8080"
echo "  Admin:     http://localhost:3000/admin"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f api      # API logs"
echo "    docker compose logs -f worker   # Worker logs"
echo "    docker compose down -v          # Reset database"
echo "    ./scripts/seed                  # Load demo data"
echo ""
echo "================================================"
