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

#### Configuration

Before running the application, you need to configure the Finnhub API key for automatic price updates:

1. Get a free API key from [Finnhub](https://finnhub.io/register)
2. Create a `.env` file in the project root:

```bash
# Copy the example env file
cp .env.example .env
```

3. Edit `.env` and add your Finnhub API key:

```bash
FINNHUB_API_KEY=your_api_key_here
PRICE_UPDATE_INTERVAL_MINUTES=15  # Optional, defaults to 15
```

#### Running with Docker

```bash
# Start the application and database
docker-compose up

# The app will be available at http://localhost:3000
# PostgreSQL will be available at localhost:5432
```

The application will automatically:
- Start the background price update worker
- Fetch real-time prices from Finnhub API every 15 minutes (configurable)
- Update all asset prices in the database

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

# Edit .env with your database credentials and Finnhub API key
# Get a free API key at https://finnhub.io/register
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

## Price Update Worker

The application includes a background worker that automatically fetches and updates asset prices from the Finnhub API.

### Configuration

Configure the worker behavior through environment variables:

- `FINNHUB_API_KEY`: Your Finnhub API key (required)
- `PRICE_UPDATE_INTERVAL_MINUTES`: How often to update prices (default: 15 minutes)

### Manual Price Updates

You can manually trigger a price update via the admin API:

```bash
# Trigger a manual price update
curl -X POST http://localhost:3000/api/admin/update-prices

# Check worker status
curl http://localhost:3000/api/admin/update-prices
```

### Supported Assets

The price fetcher currently supports:

**Stocks**: Any stock symbol available on Finnhub (e.g., AAPL, MSFT, GOOGL)

**Cryptocurrencies**:
- BTC (Bitcoin)
- ETH (Ethereum)
- BNB (Binance Coin)
- SOL (Solana)
- ADA (Cardano)
- XRP (Ripple)
- DOT (Polkadot)
- DOGE (Dogecoin)
- AVAX (Avalanche)
- MATIC (Polygon)

To add more cryptocurrencies, update the `CRYPTO_SYMBOL_MAP` in `src/lib/services/price-fetcher.ts`.

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
