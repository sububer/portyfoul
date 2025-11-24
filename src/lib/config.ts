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
    workerEnabled: process.env.PRICE_UPDATE_WORKER_ENABLED !== 'false', // Default true for backward compatibility
  },

  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || 'http://localhost:3000',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: '24h', // Token expires in 24 hours
    bcryptRounds: 10, // Number of salt rounds for bcrypt
  },

  email: {
    sesRegion: process.env.AWS_SES_REGION || 'us-east-2',
    fromAddress: process.env.AWS_SES_FROM_EMAIL || '',
    awsCredentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  },

  tokens: {
    verificationExpiryHours: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS || '24', 10),
    passwordResetExpiryMinutes: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES || '60', 10),
  },

  rateLimits: {
    registrationPer15Min: parseInt(process.env.RATE_LIMIT_REGISTRATION_PER_15MIN || '5', 10),
    loginPer15Min: parseInt(process.env.RATE_LIMIT_LOGIN_PER_15MIN || '10', 10),
    passwordResetPer15Min: parseInt(process.env.RATE_LIMIT_PASSWORD_RESET_PER_15MIN || '3', 10),
    resendVerificationPer15Min: parseInt(process.env.RATE_LIMIT_RESEND_VERIFICATION_PER_15MIN || '3', 10),
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
