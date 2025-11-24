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

Before running the application, you need to configure API keys for automatic price updates:

1. **Get a Finnhub API key** (required for stock prices) from [Finnhub](https://finnhub.io/register)
2. **Optional:** Get a CoinGecko API key (for higher rate limits on crypto prices) from [CoinGecko](https://www.coingecko.com/en/api)
   - Crypto prices work without a CoinGecko API key using the free tier
3. Create a `.env` file in the project root:

```bash
# Copy the example env file
cp .env.example .env
```

4. Edit `.env` and add your API keys:

```bash
# Required: Finnhub API key for stock prices
FINNHUB_API_KEY=your_finnhub_api_key_here

# Optional: CoinGecko API key for crypto prices (free tier works without this)
# COINGECKO_API_KEY=your_coingecko_api_key_here

# Optional: Price update interval in minutes (default: 15)
PRICE_UPDATE_INTERVAL_MINUTES=15
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
- Fetch stock prices from Finnhub API
- Fetch crypto prices from CoinGecko API (free tier, no key required)
- Update all asset prices every 15 minutes (configurable)

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

The application includes a background worker that automatically fetches and updates asset prices:

- **Stock prices**: Fetched from Finnhub API (requires free API key)
- **Crypto prices**: Fetched from CoinGecko API (free tier, no API key required)

### Configuration

Configure the worker behavior through environment variables:

- `FINNHUB_API_KEY`: Your Finnhub API key (required for stocks)
- `COINGECKO_API_KEY`: Your CoinGecko API key (optional, for higher rate limits)
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

**Cryptocurrencies** (via CoinGecko):

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
- LINK (Chainlink)
- UNI (Uniswap)
- LTC (Litecoin)
- BCH (Bitcoin Cash)
- ATOM (Cosmos)

To add more cryptocurrencies, update the `CRYPTO_SYMBOL_TO_COINGECKO_ID` mapping in `src/lib/services/price-fetcher.ts`. Find CoinGecko coin IDs at https://www.coingecko.com/en/api/documentation

## Deploying to AWS

Portyfoul can be deployed to AWS using ECS Fargate with automated infrastructure provisioning and deployment.

### Infrastructure Setup

The infrastructure is managed via CloudFormation and includes:

- VPC with public and private subnets
- Application Load Balancer for web traffic
- ECS Fargate cluster with separate web and worker services
- RDS PostgreSQL database
- ECR for container images
- CloudWatch Logs for monitoring

See [`infra/README.md`](infra/README.md) for detailed infrastructure documentation.

### CI/CD Pipeline

The repository uses GitHub Actions for automated builds and deployments:

#### Automatic Build on Merge

When code is merged to `main`:

- Docker image is automatically built
- Image is pushed to Amazon ECR
- Tagged with 8-character commit SHA (e.g., `94902b79`) and `latest`
- **No deployment occurs** - existing services continue running

This saves GitHub Actions minutes and gives you control over when deployments happen.

#### Manual Deployment via GitHub Actions

To deploy to AWS ECS:

1. Go to **Actions** → **Deploy to AWS ECS** → **Run workflow**
2. Select deployment options:
   - **Service**: Choose `web`, `worker`, or `both` (default: both)
   - **Image tag**: Specify a tag or leave empty to use latest commit
3. Click **Run workflow**

The workflow will:

- Update ECS task definitions with the specified image
- Deploy selected service(s) with rolling updates
- Monitor deployment progress (~5 minutes)
- Verify health checks automatically

**Example deployment scenarios:**

- Deploy latest code to both services: Select `both`, leave tag empty
- Deploy only web service: Select `web`, leave tag empty
- Rollback to previous version: Select service, enter previous tag (e.g., `abc12345`)
- Deploy specific commit: Select service, enter 8-character SHA

### Quick Deployment

1. **Install Python dependencies** (first time only):

   ```bash
   pip3 install -r requirements.txt
   ```

2. **Configure API keys** (required for price updates):

   The application requires a Finnhub API key for stock prices. Get your free API key:

   - Sign up at https://finnhub.io/register
   - Update the secret:
     ```bash
     ./scripts/create-secrets.sh --update finnhub --region us-east-2 --env dev
     ```

   Optionally, add a CoinGecko API key for higher crypto price rate limits:

   - Get at https://www.coingecko.com/en/api (optional - free tier works without)
   - Update the secret:
     ```bash
     ./scripts/create-secrets.sh --update coingecko --region us-east-2 --env dev
     ```

3. **Deploy the application**:
   ```bash
   ./scripts/deploy.py --region us-east-2
   ```

The deployment script will:

- Build the Docker image
- Push to Amazon ECR
- Update ECS task definitions
- Deploy to both web and worker services
- Monitor deployment progress
- Verify health checks
- Rollback automatically on failure

### Deployment Options

```bash
# Full deployment (both web and worker services)
./scripts/deploy.py

# Preview changes without executing
./scripts/deploy.py --dry-run

# Build and push image only
./scripts/deploy.py --build-only

# Update services with existing image
./scripts/deploy.py --update-services --tag abc12345

# Deploy only web service
./scripts/deploy.py --service web

# Deploy only worker service
./scripts/deploy.py --service worker
```

### Architecture

The AWS deployment uses a separated architecture:

- **Web Service**: 2+ containers handling HTTP requests via ALB (scalable)
- **Worker Service**: 1 container running price update worker (singleton)
- **Database**: RDS PostgreSQL in private subnet
- **Networking**: Private subnets with NAT gateway for outbound traffic

Worker service has `PRICE_UPDATE_WORKER_ENABLED=true`, while web service has it set to `false` to prevent duplicate price updates.

For more details, see:

- [`infra/README.md`](infra/README.md) - Complete infrastructure guide and secret management
- [`infra_plan_spec.md`](infra_plan_spec.md) - Architecture decisions and implementation plan
- [`scripts/create-secrets.sh`](scripts/create-secrets.sh) - Secret management helper script

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
