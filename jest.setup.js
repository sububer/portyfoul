// Jest setup file
// Add any global test setup here

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_DB = 'portyfoul_test';
process.env.POSTGRES_USER = 'portyfoul';
process.env.POSTGRES_PASSWORD = 'portyfoul';
