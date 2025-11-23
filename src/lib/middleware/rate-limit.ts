/**
 * Rate limiting middleware using in-memory storage
 * Prevents brute force attacks and abuse by limiting requests per IP address
 *
 * For production at scale, consider upgrading to Redis for distributed rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractIpAddress } from '@/lib/utils/security';

/**
 * Configuration for a rate limit rule
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom message for rate limit exceeded */
  message?: string;
}

/**
 * Tracks requests for a specific key (IP + endpoint)
 */
interface RequestLog {
  /** Timestamps of requests within the current window */
  timestamps: number[];
  /** When this entry was last accessed (for cleanup) */
  lastAccess: number;
}

/**
 * In-memory storage for rate limit tracking
 * Key format: "ip:endpoint"
 */
const requestStore = new Map<string, RequestLog>();

/**
 * Cleanup interval in milliseconds (run every 5 minutes)
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * How long to keep entries after last access (10 minutes)
 */
const ENTRY_TTL_MS = 10 * 60 * 1000;

/**
 * Last cleanup timestamp
 */
let lastCleanup = Date.now();

/**
 * Cleans up old entries from the request store
 * Removes entries that haven't been accessed recently
 */
function cleanupOldEntries(): void {
  const now = Date.now();
  const cutoff = now - ENTRY_TTL_MS;

  for (const [key, log] of requestStore.entries()) {
    if (log.lastAccess < cutoff) {
      requestStore.delete(key);
    }
  }

  lastCleanup = now;
}

/**
 * Periodically trigger cleanup if enough time has passed
 */
function maybeCleanup(): void {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanupOldEntries();
  }
}

/**
 * Checks if a request should be rate limited
 *
 * @param request Next.js request object
 * @param endpoint Identifier for this endpoint (e.g., 'register', 'login')
 * @param config Rate limit configuration
 * @returns Object with isLimited flag and remaining requests count
 */
export function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): { isLimited: boolean; remaining: number; resetAt: Date } {
  maybeCleanup();

  const ip = extractIpAddress(request);
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get or create request log for this key
  let log = requestStore.get(key);
  if (!log) {
    log = { timestamps: [], lastAccess: now };
    requestStore.set(key, log);
  }

  // Update last access time
  log.lastAccess = now;

  // Remove timestamps outside the current window
  log.timestamps = log.timestamps.filter(timestamp => timestamp > windowStart);

  // Check if limit exceeded
  const requestCount = log.timestamps.length;
  const isLimited = requestCount >= config.maxRequests;

  if (!isLimited) {
    // Add current request timestamp
    log.timestamps.push(now);
  }

  const remaining = Math.max(0, config.maxRequests - requestCount - (isLimited ? 0 : 1));
  const resetAt = new Date(now + config.windowMs);

  return { isLimited, remaining, resetAt };
}

/**
 * Creates a rate limit response with proper headers
 *
 * @param config Rate limit configuration
 * @param remaining Number of requests remaining
 * @param resetAt When the limit resets
 * @returns NextResponse with 429 status and rate limit headers
 */
export function createRateLimitResponse(
  config: RateLimitConfig,
  remaining: number,
  resetAt: Date
): NextResponse {
  const message = config.message || 'Too many requests. Please try again later.';

  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetAt.getTime() / 1000).toString(),
      },
    }
  );
}

/**
 * Convenience function that both checks rate limit and returns response if exceeded
 *
 * @param request Next.js request object
 * @param endpoint Identifier for this endpoint
 * @param config Rate limit configuration
 * @returns NextResponse if rate limited, null if allowed
 */
export function enforceRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): NextResponse | null {
  const { isLimited, remaining, resetAt } = checkRateLimit(request, endpoint, config);

  if (isLimited) {
    console.warn(`Rate limit exceeded for ${extractIpAddress(request)} on ${endpoint}`);
    return createRateLimitResponse(config, remaining, resetAt);
  }

  return null;
}

/**
 * Clears all rate limit data (useful for testing)
 */
export function clearRateLimits(): void {
  requestStore.clear();
}

/**
 * Gets current rate limit stats for debugging/monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  totalRequests: number;
} {
  let totalRequests = 0;
  for (const log of requestStore.values()) {
    totalRequests += log.timestamps.length;
  }

  return {
    totalKeys: requestStore.size,
    totalRequests,
  };
}
