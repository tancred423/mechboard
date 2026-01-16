# Development and Self-Hosting Guide

## Prerequisites

- Docker and Docker Compose

## Development Setup

1. Clone the repository

2. Copy the environment template:
   ```bash
   cp .env.skel .env
   ```

3. Fill in the required values in `.env`:
   - Discord OAuth credentials (create an app at https://discord.com/developers/applications)
   - Set `DISCORD_REDIRECT_URI` to `http://localhost:8000/api/auth/discord/callback`

4. Start the development environment:
   ```bash
   ./dev.sh up
   ```

5. Access the services:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - phpMyAdmin: http://localhost:8080

### Dev Commands

Usage: `./dev.sh [command]`
Or: `bash dev.sh [command]`

Commands:
  up      - Start containers
  reload  - Reload frontend and backend containers
  rebuild - Rebuild and restart frontend and backend containers
  down    - Stop all containers
  purge   - Stop containers and remove volumes (deletes all data!)
  logs    - Show logs from backend and frontend containers (follow mode)
  check   - Run code style checks (read-only)
  fix     - Run code style checks and fix issues

## Self-Hosting (Production)

### Requirements

- Docker and Docker Compose
- External MySQL database (or use the `mysql-network` Docker network)
- Reverse proxy (nginx, Traefik, etc.) for SSL termination

### Setup

1. Copy the environment template:
   ```bash
   cp .env.skel .env
   ```

2. Configure all environment variables in `.env`:
   - Database connection details
   - JWT secret (generate a secure random string)
   - Discord OAuth credentials
   - Frontend and API URLs for your domain

3. Create the external Docker network if not exists:
   ```bash
   docker network create mysql-network
   ```

4. Start the production stack:
   ```bash
   docker compose up -d
   ```

5. Run database migrations:
   ```bash
   docker exec -it mechboard-api deno task db:migrate
   ```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GITHUB_REPOSITORY` | GitHub repository path (owner/repo) for pulling images |
| `DB_HOST` | MySQL database hostname |
| `DB_PORT` | MySQL database port (default: 3306) |
| `DB_USER` | MySQL database username |
| `DB_PASSWORD` | MySQL database password |
| `DB_NAME` | MySQL database name |
| `JWT_SECRET` | Secret key for JWT token signing |
| `DISCORD_CLIENT_ID` | Discord OAuth application client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth application client secret |
| `DISCORD_REDIRECT_URI` | Discord OAuth callback URL |
| `FRONTEND_URL` | Public URL of the frontend |
| `VITE_API_URL` | Public URL of the API |
| `CORS_ORIGINS` | Comma-separated list of allowed CORS origins |
| `FRONTEND_PORT` | Port to expose the frontend (default: 80) |

### Adding Presets

Presets are managed directly in the database. Export an encounter from the app and paste the JSON directly:

```sql
INSERT INTO presets (id, data, sort_order) VALUES (
  UUID(),
  '{"name":"Preset Name","description":"Optional description","config":{"cards":[]}}',
  '0'
);
```

The `data` field contains the full exported JSON (same format as the Export button produces).
