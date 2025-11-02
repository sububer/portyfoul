# Portyfoul

A stock and crypto portfolio manager with a thin-client architecture.

## Features

- Create, update, and delete portfolios
- Track stocks and cryptocurrencies with quantities
- Automatic price updates every 15 minutes
- Server-side logic with minimal client UI

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- React 19
- PostgreSQL 17.2
- Server-side rendering and API routes
- Docker for containerization

## Getting Started

### Option 1: Docker (Recommended)

The easiest way to run the application is with Docker Compose:

#### Prerequisites

- Docker
- Docker Compose

#### Running with Docker

```bash
# Start the application and database
docker-compose up

# The app will be available at http://localhost:3000
# PostgreSQL will be available at localhost:5432
```

To stop the application:

```bash
docker-compose down

# To also remove the database volume:
docker-compose down -v
```

### Option 2: Local Development

#### Prerequisites

- Node.js 22.x
- npm
- PostgreSQL 17.x

#### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your database credentials
```

3. Set up the database:

```bash
# Make sure PostgreSQL is running
# Create the database
createdb portyfoul

# Run migrations
npm run db:migrate
```

#### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

#### Build

```bash
npm run build
```

#### Production

```bash
npm run start
```

## Database

The application uses PostgreSQL for data persistence:

- **Migrations**: SQL migration scripts in `migrations/` directory
- **Schema**: Includes tables for assets, portfolios, and holdings
- **Seed Data**: Initial data populated during migration

### Running Migrations

```bash
npm run db:migrate
```

### Database Structure

- `assets`: Stores all unique assets (stocks and crypto) with current prices
- `portfolios`: Portfolio metadata and ownership information
- `holdings`: Many-to-many relationship between portfolios and assets

## Project Structure

```
portyfoul/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/             # API routes
│   │   │   ├── assets/      # Asset API endpoints
│   │   │   └── portfolios/  # Portfolio API endpoints
│   │   ├── portfolios/      # Portfolio pages
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles
│   ├── components/          # React components
│   ├── lib/                 # Library code
│   │   ├── db.ts           # Database connection
│   │   └── data/           # Data access layer
│   └── types/              # TypeScript type definitions
├── migrations/             # Database migration scripts
├── scripts/               # Utility scripts
├── .github/
│   └── workflows/         # GitHub Actions
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose configuration
└── package.json
```

## License

See LICENSE file for details.
