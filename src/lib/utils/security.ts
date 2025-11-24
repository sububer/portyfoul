/**
 * Security utilities for authentication and request handling
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Extracts the real IP address from a request
 * Handles cases where the request goes through proxies (X-Forwarded-For, X-Real-IP)
 *
 * @param request Next.js request object
 * @returns IP address string or 'unknown' if not found
 */
export function extractIpAddress(request: NextRequest): string {
  // Check X-Forwarded-For header (set by proxies, load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list: "client, proxy1, proxy2"
    // The first IP is the original client
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  // Check X-Real-IP header (some proxies use this instead)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Note: In serverless/edge environments like Vercel Edge Functions,
  // direct IP access may not be available without the above headers
  return 'unknown';
}

/**
 * Extracts the User-Agent string from a request
 *
 * @param request Next.js request object
 * @returns User-Agent string or 'unknown' if not found
 */
export function extractUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Generates a cryptographically secure random token
 * Uses crypto.randomBytes for strong randomness
 *
 * @param byteLength Length in bytes (default 32 = 64 hex characters)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Checks if a honeypot field has been filled
 * Honeypot fields are hidden from human users but may be filled by bots
 *
 * @param value Value from the honeypot field
 * @returns true if honeypot was filled (likely a bot), false if empty (likely human)
 */
export function isHoneypotFilled(value: string | undefined | null): boolean {
  // If the field has any value, it's likely a bot
  return !!(value && value.trim().length > 0);
}

/**
 * Creates a hash of a token for secure storage
 * Useful for storing tokens in a hashed form to prevent exposure if database is compromised
 *
 * @param token Token to hash
 * @returns SHA256 hash of the token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Request metadata for security logging
 */
export interface RequestMetadata {
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

/**
 * Extracts all security-relevant metadata from a request
 * Useful for logging and auditing
 *
 * @param request Next.js request object
 * @returns Request metadata object
 */
export function extractRequestMetadata(request: NextRequest): RequestMetadata {
  return {
    ipAddress: extractIpAddress(request),
    userAgent: extractUserAgent(request),
    timestamp: new Date(),
  };
}
