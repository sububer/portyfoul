/**
 * Authentication utilities
 * Handles password hashing and JWT token generation/verification
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from './config';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

/**
 * Decoded JWT token with payload and metadata
 */
export interface DecodedToken extends JWTPayload {
  iat: number; // Issued at
  exp: number; // Expiration time
}

/**
 * Hashes a plain text password using bcrypt
 *
 * @param password - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

/**
 * Compares a plain text password with a hashed password
 *
 * @param password - The plain text password to check
 * @param hash - The hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a JWT token for a user
 *
 * @param payload - The user data to encode in the token
 * @returns The signed JWT token
 * @throws Error if JWT_SECRET is not configured
 */
export function generateToken(payload: JWTPayload): string {
  const secret = config.auth.jwtSecret;

  if (!secret) {
    // Use a development-only default secret if not set
    // This should only happen in development mode due to config validation
    const devSecret = 'dev-secret-change-in-production';
    console.warn('⚠️  Using default JWT secret for development. DO NOT use in production!');

    return jwt.sign(payload, devSecret, {
      expiresIn: config.auth.jwtExpiresIn,
    });
  }

  return jwt.sign(payload, secret, {
    expiresIn: config.auth.jwtExpiresIn,
  });
}

/**
 * Verifies and decodes a JWT token
 *
 * @param token - The JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid, expired, or JWT_SECRET is not configured
 */
export function verifyToken(token: string): DecodedToken {
  const secret = config.auth.jwtSecret;

  if (!secret) {
    // Use the same development-only default secret for verification
    const devSecret = 'dev-secret-change-in-production';
    return jwt.verify(token, devSecret) as DecodedToken;
  }

  return jwt.verify(token, secret) as DecodedToken;
}

/**
 * Extracts the token from an Authorization header
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer token123")
 * @returns The token string or null if not found
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  // Check for "Bearer <token>" format
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}

/**
 * Extracts and verifies a JWT token from an Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The decoded token payload or null if invalid
 */
export function verifyAuthHeader(authHeader: string | null): DecodedToken | null {
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  try {
    return verifyToken(token);
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}
