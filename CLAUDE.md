# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portyfoul is a stock and crypto portfolio manager with a thin-client architecture built on Next.js 16 App Router, TypeScript, React 19, and PostgreSQL 17.2. The application features automatic price updates every 15 minutes via background workers and server-side rendering.

## Common Commands

### Development
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build production bundle
npm run start        # Run production server
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Testing
```bash
npm test             # Run Jest test suite
npm test:watch       # Run tests in watch mode
npm test:coverage    # Run tests with coverage report
```

### Database
```bash
npm run db:migrate   # Run database migrations from migrations/ directory
```

### Docker
```bash
docker-compose up    # Start app and PostgreSQL in containers
docker-compose down  # Stop containers
docker-compose down -v  # Stop and remove database volume
```

## Architecture

### Data Layer Architecture

The codebase uses a **two-tier data layer pattern**:

1. **Database Layer** (`src/lib/data/*-db.ts`): Direct PostgreSQL access using the connection pool from `src/lib/db.ts`. These modules handle raw queries, transactions, and database-specific logic.
   - `assets-db.ts`: Asset CRUD operations
   - `portfolios-db.ts`: Portfolio and holdings operations with transaction support
   - `users-db.ts`: User management and authentication queries

2. **Service Layer** (`src/lib/data/*.ts`): In-memory stores (legacy, mostly unused now). Originally used Map-based storage before database integration.
   - Current codebase primarily uses the `-db.ts` files
   - The non-DB files exist for backward compatibility

**When adding new data operations**: Add to the appropriate `-db.ts` file in `src/lib/data/`.

### Authentication System

The app uses JWT-based authentication with two complementary modules:

1. **Core Auth** (`src/lib/auth.ts`): Password hashing (bcrypt) and JWT token generation/verification
2. **Middleware** (`src/lib/middleware/auth.ts`): Request authentication for API routes
   - `authenticate()`: Extract and verify token from cookies or Authorization header
   - `requireAuth()`: Protect routes (throws AuthError if unauthenticated)
   - `optionalAuth()`: Return user if authenticated, null otherwise
   - `handleAuthError()`: Convert errors to proper JSON responses

**API Route Pattern**:
```typescript
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);  // Throws if not authenticated
    // Protected logic here using user.userId, user.email, etc.
  } catch (error) {
    return handleAuthError(error);
  }
}
```

### Price Update System

Automatic price fetching runs via Next.js instrumentation hook:

1. **Initialization** (`src/instrumentation.ts`): Starts price worker on server startup
2. **Worker** (`src/lib/workers/price-update-worker.ts`): Manages periodic updates with configurable interval
3. **Fetcher** (`src/lib/services/price-fetcher.ts`):
   - Stocks: Finnhub API (requires `FINNHUB_API_KEY`)
   - Crypto: CoinGecko API (optional `COINGECKO_API_KEY`)
   - Add new crypto symbols by updating `CRYPTO_SYMBOL_TO_COINGECKO_ID` mapping

### Database Schema

Three core tables with UUID primary keys:
- `assets`: Unique assets (stocks/crypto) with current prices
- `portfolios`: Portfolio metadata with user ownership
- `holdings`: Junction table linking portfolios to assets with quantities

Migrations are SQL files in `migrations/` executed sequentially by `scripts/migrate.js`.

### API Route Organization

```
src/app/api/
├── auth/           # Authentication endpoints (login, register, logout)
├── portfolios/     # Portfolio CRUD with [id] dynamic routes
├── assets/         # Asset operations and price fetching
└── admin/          # Admin operations (manual price updates)
```

All API routes follow Next.js 16 App Router conventions with route handlers in `route.ts` files.

### Configuration

Centralized config in `src/lib/config.ts`:
- Environment validation on startup
- Auth settings (JWT secret, bcrypt rounds, token expiration)
- API keys (Finnhub, CoinGecko)
- Price update interval

**Development default**: If `JWT_SECRET` is missing in development, a default dev secret is used with a warning.

## Path Aliases

TypeScript and Jest both use `@/` for `src/`:
```typescript
import { portfolioStore } from '@/lib/data/portfolios-db';
import { requireAuth } from '@/lib/middleware/auth';
```

## Testing

- Tests located in `__tests__/` directories or alongside source files with `.test.ts` suffix
- Uses Jest with ts-jest for TypeScript support
- Coverage excludes Next.js app directory and type definition files
- Run single test file: `npm test -- path/to/test.test.ts`

## Important Notes

- **Never commit secrets**: `.env` file is gitignored; use `.env.example` as template
- **Database transactions**: Use `getClient()` from `src/lib/db.ts` for multi-query transactions (see `portfolios-db.ts` for examples)
- **Price worker**: Automatically starts via instrumentation hook; manual trigger available at `POST /api/admin/update-prices`
- **User ownership**: Portfolio operations check `userId` for authorization in protected routes
