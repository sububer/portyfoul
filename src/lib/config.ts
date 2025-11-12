/**
 * Application configuration
 * Centralizes all environment variable access
 */

export const config = {
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'portyfoul',
    user: process.env.POSTGRES_USER || 'portyfoul',
    password: process.env.POSTGRES_PASSWORD || 'portyfoul',
  },

  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY || '',
  },

  coinGecko: {
    // Optional: CoinGecko API key for higher rate limits
    // Free tier works without an API key but has lower rate limits
    apiKey: process.env.COINGECKO_API_KEY || '',
  },

  priceUpdate: {
    intervalMinutes: parseInt(process.env.PRICE_UPDATE_INTERVAL_MINUTES || '15', 10),
  },

  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: '24h', // Token expires in 24 hours
    bcryptRounds: 10, // Number of salt rounds for bcrypt
  },
} as const;

/**
 * Validates that required configuration values are present
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.finnhub.apiKey) {
    errors.push('FINNHUB_API_KEY is required. Get your free API key at https://finnhub.io/register');
  }

  if (config.priceUpdate.intervalMinutes <= 0) {
    errors.push('PRICE_UPDATE_INTERVAL_MINUTES must be a positive number');
  }

  // JWT_SECRET is required in production and test environments
  if (!config.auth.jwtSecret && (config.app.nodeEnv === 'production' || config.app.nodeEnv === 'test')) {
    errors.push('JWT_SECRET is required. Please set a secure random string as your JWT secret.');
  }

  // Warning for development without JWT_SECRET
  if (!config.auth.jwtSecret && config.app.nodeEnv === 'development') {
    console.warn('⚠️  Warning: JWT_SECRET is not set. Using a default value for development only.');
    console.warn('   Please set JWT_SECRET in production!');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration. Please check your environment variables.');
  }
}
