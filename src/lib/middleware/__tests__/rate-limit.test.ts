/**
 * Tests for rate limiting middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  enforceRateLimit,
  createRateLimitResponse,
  clearRateLimits,
  getRateLimitStats,
} from '../rate-limit';

// Helper to create mock NextRequest
function createMockRequest(ip: string = '192.168.1.1'): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: new Headers({
      'x-forwarded-for': ip,
    }),
  });
  return request;
}

describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clear rate limits before each test to ensure isolation
    clearRateLimits();
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the limit', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      const result = checkRateLimit(request, 'test-endpoint', config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(4); // 5 max - 1 used = 4 remaining
    });

    it('should block requests over the limit', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 3, windowMs: 60000 };

      // Make 3 requests (at the limit)
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);

      // 4th request should be limited
      const result = checkRateLimit(request, 'test-endpoint', config);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should track different IPs independently', () => {
      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      const config = { maxRequests: 2, windowMs: 60000 };

      // IP1 makes 2 requests (at limit)
      checkRateLimit(request1, 'test-endpoint', config);
      checkRateLimit(request1, 'test-endpoint', config);

      // IP1 should be limited
      const result1 = checkRateLimit(request1, 'test-endpoint', config);
      expect(result1.isLimited).toBe(true);

      // IP2 should still be allowed
      const result2 = checkRateLimit(request2, 'test-endpoint', config);
      expect(result2.isLimited).toBe(false);
    });

    it('should track different endpoints independently', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 2, windowMs: 60000 };

      // Make 2 requests to endpoint1 (at limit)
      checkRateLimit(request, 'endpoint1', config);
      checkRateLimit(request, 'endpoint1', config);

      // endpoint1 should be limited
      const result1 = checkRateLimit(request, 'endpoint1', config);
      expect(result1.isLimited).toBe(true);

      // endpoint2 should still be allowed
      const result2 = checkRateLimit(request, 'endpoint2', config);
      expect(result2.isLimited).toBe(false);
    });

    it('should provide correct remaining count', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      // First request
      let result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.remaining).toBe(4);

      // Second request
      result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.remaining).toBe(3);

      // Third request
      result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.remaining).toBe(2);
    });

    it('should provide reset timestamp', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      const before = Date.now();
      const result = checkRateLimit(request, 'test-endpoint', config);
      const after = Date.now();

      const resetTime = result.resetAt.getTime();
      const expectedMin = before + config.windowMs;
      const expectedMax = after + config.windowMs;

      expect(resetTime).toBeGreaterThanOrEqual(expectedMin);
      expect(resetTime).toBeLessThanOrEqual(expectedMax);
    });

    it('should handle unknown IP addresses', () => {
      const request = createMockRequest('unknown');
      const config = { maxRequests: 3, windowMs: 60000 };

      const result = checkRateLimit(request, 'test-endpoint', config);

      expect(result.isLimited).toBe(false);
    });
  });

  describe('enforceRateLimit', () => {
    it('should return null when not rate limited', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      const response = enforceRateLimit(request, 'test-endpoint', config);

      expect(response).toBeNull();
    });

    it('should return 429 response when rate limited', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 2, windowMs: 60000 };

      // Make 2 requests to hit the limit
      enforceRateLimit(request, 'test-endpoint', config);
      enforceRateLimit(request, 'test-endpoint', config);

      // Third request should be blocked
      const response = enforceRateLimit(request, 'test-endpoint', config);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
    });

    it('should include custom message in rate limit response', async () => {
      const request = createMockRequest('192.168.1.1');
      const config = {
        maxRequests: 1,
        windowMs: 60000,
        message: 'Custom rate limit message',
      };

      // First request
      enforceRateLimit(request, 'test-endpoint', config);

      // Second request (limited)
      const response = enforceRateLimit(request, 'test-endpoint', config);

      expect(response).not.toBeNull();
      const json = await response?.json();
      expect(json.message).toBe('Custom rate limit message');
    });
  });

  describe('createRateLimitResponse', () => {
    it('should create response with 429 status', () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const resetAt = new Date(Date.now() + 60000);

      const response = createRateLimitResponse(config, 0, resetAt);

      expect(response.status).toBe(429);
    });

    it('should include rate limit headers', () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const resetAt = new Date(Date.now() + 60000);

      const response = createRateLimitResponse(config, 2, resetAt);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('2');
      expect(response.headers.get('Retry-After')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should include error message in response body', async () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const resetAt = new Date(Date.now() + 60000);

      const response = createRateLimitResponse(config, 0, resetAt);
      const json = await response.json();

      expect(json.error).toBe('Rate limit exceeded');
      expect(json.message).toBeTruthy();
      expect(json.retryAfter).toBeTruthy();
    });

    it('should use custom message when provided', async () => {
      const config = {
        maxRequests: 5,
        windowMs: 60000,
        message: 'Custom message',
      };
      const resetAt = new Date(Date.now() + 60000);

      const response = createRateLimitResponse(config, 0, resetAt);
      const json = await response.json();

      expect(json.message).toBe('Custom message');
    });

    it('should calculate correct retryAfter in seconds', async () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const resetAt = new Date(Date.now() + 45000); // 45 seconds from now

      const response = createRateLimitResponse(config, 0, resetAt);
      const json = await response.json();

      // Should be approximately 45 seconds (allow 1 second margin for execution time)
      expect(json.retryAfter).toBeGreaterThanOrEqual(44);
      expect(json.retryAfter).toBeLessThanOrEqual(46);
    });
  });

  describe('clearRateLimits', () => {
    it('should clear all rate limit data', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      // Make some requests
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);

      // Verify data exists
      let stats = getRateLimitStats();
      expect(stats.totalKeys).toBeGreaterThan(0);

      // Clear
      clearRateLimits();

      // Verify data is cleared
      stats = getRateLimitStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should reset rate limits after clearing', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 2, windowMs: 60000 };

      // Hit the limit
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);

      let result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(true);

      // Clear and try again
      clearRateLimits();

      result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(false);
    });
  });

  describe('getRateLimitStats', () => {
    it('should return zero stats when no requests made', () => {
      const stats = getRateLimitStats();

      expect(stats.totalKeys).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should track total keys (IP:endpoint combinations)', () => {
      const request1 = createMockRequest('192.168.1.1');
      const request2 = createMockRequest('192.168.1.2');
      const config = { maxRequests: 5, windowMs: 60000 };

      checkRateLimit(request1, 'endpoint1', config);
      checkRateLimit(request2, 'endpoint1', config);
      checkRateLimit(request1, 'endpoint2', config);

      const stats = getRateLimitStats();

      expect(stats.totalKeys).toBe(3); // 3 unique IP:endpoint combinations
    });

    it('should track total requests across all keys', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 10, windowMs: 60000 };

      checkRateLimit(request, 'endpoint1', config);
      checkRateLimit(request, 'endpoint1', config);
      checkRateLimit(request, 'endpoint2', config);

      const stats = getRateLimitStats();

      expect(stats.totalRequests).toBe(3);
    });
  });

  describe('Sliding window behavior', () => {
    it('should not count requests outside the time window', async () => {
      const request = createMockRequest('192.168.1.1');
      // Very short window for testing
      const config = { maxRequests: 2, windowMs: 100 }; // 100ms window

      // Make 2 requests (at limit)
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);

      // Should be limited
      let result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(true);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(false);
    });

    it('should properly slide the window', async () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 3, windowMs: 200 }; // 200ms window

      // Request 1 at t=0
      checkRateLimit(request, 'test-endpoint', config);

      // Wait 150ms
      await new Promise(resolve => setTimeout(resolve, 150));

      // Requests 2 and 3 at t=150
      checkRateLimit(request, 'test-endpoint', config);
      checkRateLimit(request, 'test-endpoint', config);

      // At t=150, all 3 requests are in window, should be limited
      let result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(true);

      // Wait another 100ms (total 250ms from start)
      await new Promise(resolve => setTimeout(resolve, 100));

      // At t=250, request 1 (from t=0) should be outside 200ms window
      // Only requests 2 and 3 should count, so we should be allowed
      result = checkRateLimit(request, 'test-endpoint', config);
      expect(result.isLimited).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero max requests', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 0, windowMs: 60000 };

      const result = checkRateLimit(request, 'test-endpoint', config);

      expect(result.isLimited).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should handle very large max requests', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 1000000, windowMs: 60000 };

      const result = checkRateLimit(request, 'test-endpoint', config);

      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(999999);
    });

    it('should handle concurrent requests from same IP', () => {
      const request = createMockRequest('192.168.1.1');
      const config = { maxRequests: 5, windowMs: 60000 };

      // Simulate concurrent requests
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(request, 'test-endpoint', config));
      }

      // First 5 should be allowed, rest should be limited
      const allowed = results.filter(r => !r.isLimited);
      const limited = results.filter(r => r.isLimited);

      expect(allowed.length).toBe(5);
      expect(limited.length).toBe(5);
    });
  });
});
