# Docker Setup Guide

This guide explains how to run the Portyfoul application using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- A valid `.env` file with required environment variables

## Environment Variables

Before running `docker compose up`, ensure your `.env` file contains all required variables:

### Required Variables

```bash
# Authentication (REQUIRED)
JWT_SECRET=your-secret-key-here

# Finnhub API (REQUIRED)
FINNHUB_API_KEY=your-finnhub-api-key
```

### Optional Variables

```bash
# CoinGecko API (Optional - free tier works without key)
COINGECKO_API_KEY=your-coingecko-api-key

# Price update interval in minutes (default: 15)
PRICE_UPDATE_INTERVAL_MINUTES=15
```

## Generating a JWT Secret

Generate a secure JWT secret using OpenSSL:

```bash
openssl rand -base64 32
```

Copy the generated string and add it to your `.env` file as `JWT_SECRET`.

## Starting the Application

### First Time Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your values:
   ```bash
   # Edit with your preferred editor
   nano .env
   # or
   vim .env
   ```

3. Build and start the containers:
   ```bash
   docker compose up -d --build
   ```

### Subsequent Starts

After the first build, you can start the containers without rebuilding:

```bash
docker compose up -d
```

## Checking Status

View container status:
```bash
docker compose ps
```

View application logs:
```bash
docker compose logs app
```

Follow logs in real-time:
```bash
docker compose logs -f app
```

View database logs:
```bash
docker compose logs postgres
```

## Stopping the Application

Stop and remove containers:
```bash
docker compose down
```

Stop containers and remove volumes (⚠️ deletes all data):
```bash
docker compose down -v
```

## Accessing the Application

Once running, the application is available at:
- **Application**: http://localhost:3000
- **Database**: localhost:5432

## Database Migrations

Database migrations run automatically when the application starts. You can view the migration logs:

```bash
docker compose logs app | grep -A 20 "Running database migrations"
```

## Troubleshooting

### JWT_SECRET Error

If you see this error:
```
JWT_SECRET is required. Please set a secure random string as your JWT secret.
```

Solution: Ensure `JWT_SECRET` is set in your `.env` file.

### Port Already in Use

If port 3000 or 5432 is already in use, you can change the ports in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change host port to 3001
```

### Database Connection Issues

Check if the database container is healthy:
```bash
docker compose ps postgres
```

View database logs:
```bash
docker compose logs postgres
```

### Rebuilding After Code Changes

After modifying the code, rebuild the Docker image:
```bash
docker compose up -d --build
```

## Production Deployment

For production deployment:

1. Set `NODE_ENV` is automatically set to `production` in docker-compose.yml
2. Use a strong JWT_SECRET (32+ characters, randomly generated)
3. Use HTTPS/TLS for the application
4. Set up proper database backups
5. Consider using Docker secrets for sensitive values
6. Review and update security settings in docker-compose.yml

## Development vs Production

The Docker setup is configured for production by default:
- Uses multi-stage builds for smaller images
- Only production dependencies are installed
- NODE_ENV is set to production
- Application runs in optimized mode

For development, it's recommended to run the application locally:
```bash
npm run dev
```

## Container Architecture

The application consists of two containers:

1. **portyfoul-postgres**: PostgreSQL 17.2 database
   - Stores all application data
   - Includes health checks
   - Data persisted in a Docker volume

2. **portyfoul-app**: Next.js application
   - Built using multi-stage Docker build
   - Runs database migrations on startup
   - Starts background price worker
   - Serves the application on port 3000
