#!/bin/bash

set -e

COMPOSE_FILE="docker-compose.dev.yml"

case "${1:-}" in
  up)
    echo "🚀 Starting containers..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo "✅ Containers started"
    ;;
  
  reload)
    echo "🔄 Reloading frontend and backend containers..."
    docker compose -f "$COMPOSE_FILE" restart backend frontend
    echo "✅ Containers reloaded"
    ;;
  
  rebuild)
    echo "🔨 Rebuilding frontend and backend containers..."
    docker compose -f "$COMPOSE_FILE" build backend frontend
    docker compose -f "$COMPOSE_FILE" up -d backend frontend
    echo "✅ Containers rebuilt and started"
    ;;
  
  down)
    echo "🛑 Stopping containers..."
    docker compose -f "$COMPOSE_FILE" down
    echo "✅ Containers stopped"
    ;;
  
  purge)
    echo "🗑️  Stopping containers and removing volumes..."
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ Containers stopped and volumes removed"
    ;;
  
  logs)
    echo "📋 Showing logs from backend and frontend containers..."
    docker compose -f "$COMPOSE_FILE" logs -f backend frontend
    ;;
  
  check)
    echo "🔍 Running code style checks (read-only)..."
    echo ""
    echo "📦 Checking backend..."
    docker compose -f "$COMPOSE_FILE" run --rm backend sh -c "deno fmt --check && deno lint && deno check src/main.ts"
    echo ""
    echo "📦 Checking frontend..."
    docker compose -f "$COMPOSE_FILE" run --rm frontend sh -c "npx prettier --check . && npx vue-tsc --noEmit"
    echo ""
    echo "✅ All checks passed!"
    ;;
  
  fix)
    echo "🔧 Running code style checks and fixes..."
    echo ""
    echo "📦 Checking and fixing backend..."
    docker compose -f "$COMPOSE_FILE" run --rm backend sh -c "deno fmt && deno lint && deno check src/main.ts"
    echo ""
    echo "📦 Checking and fixing frontend..."
    docker compose -f "$COMPOSE_FILE" run --rm frontend sh -c "npx prettier --write . && npx vue-tsc --noEmit"
    echo ""
    echo "✅ Code checked and formatted!"
    ;;
  
  *)
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up      - Start containers"
    echo "  reload  - Reload frontend and backend containers"
    echo "  rebuild - Rebuild and restart frontend and backend containers"
    echo "  down    - Stop all containers"
    echo "  purge   - Stop containers and remove volumes"
    echo "  logs    - Show logs from backend and frontend containers (follow mode)"
    echo "  check   - Run code style checks (read-only)"
    echo "  fix     - Run code style checks and fix issues"
    exit 1
    ;;
esac
