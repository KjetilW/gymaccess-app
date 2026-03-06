# GymAccess (GymAccess)

Automated membership management SaaS for small community gyms. Handles signup, recurring payments, access control (PIN codes), and membership lifecycle.

## Quick Start

```bash
cp .env.example .env
./init.sh
```

Or manually:

```bash
cp .env.example .env
docker compose up
./scripts/migrate
./scripts/seed
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Member signup + Admin dashboard |
| API | http://localhost:8080 | REST API |
| MailHog | http://localhost:8025 | Email testing UI |
| PostgreSQL | localhost:5432 | Database |

## Demo Credentials

After running `./scripts/seed`:

- Email: `admin@nordfjordgym.no`
- Password: `admin123`

## Development

```bash
docker compose up                          # Start all services
docker compose logs -f api                 # API logs
docker compose logs -f worker              # Worker logs
docker compose down -v && docker compose up # Reset database
./scripts/migrate                          # Run migrations
./scripts/seed                             # Load demo data
./scripts/backup                           # Backup database
```

## Architecture

- **API**: Node.js / TypeScript / Express
- **Frontend**: Next.js / React / Tailwind CSS
- **Worker**: Node.js background processor for notifications
- **Database**: PostgreSQL
- **Queue/Cache**: Redis
- **Email**: MailHog (dev) / SMTP (prod)

## Stack

All services run in Docker containers orchestrated by Docker Compose, deployable on a single VM.
