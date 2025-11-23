/**
 * Tests for security utilities
 */

import { NextRequest } from 'next/server';
import {
  extractIpAddress,
  extractUserAgent,
  generateSecureToken,
  isHoneypotFilled,
  hashToken,
  extractRequestMetadata,
} from '../security';

// Helper to create mock NextRequest
function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const request = new NextRequest(url, {
    method: 'POST',
    headers: new Headers(headers),
  });
  return request;
}

describe('extractIpAddress', () => {
  it('should extract IP from X-Forwarded-For header', () => {
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.1, 10.0.0.1',
    });

    const ip = extractIpAddress(request);

    expect(ip).toBe('192.168.1.1');
  });

  it('should handle single IP in X-Forwarded-For', () => {
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
    });

    const ip = extractIpAddress(request);

    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from X-Real-IP header when X-Forwarded-For is missing', () => {
    const request = createMockRequest({
      'x-real-ip': '10.0.0.1',
    });

    const ip = extractIpAddress(request);

    expect(ip).toBe('10.0.0.1');
  });

  it('should prioritize X-Forwarded-For over X-Real-IP', () => {
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'x-real-ip': '10.0.0.1',
    });

    const ip = extractIpAddress(request);

    expect(ip).toBe('192.168.1.1');
  });

  it('should return "unknown" when no IP headers are present', () => {
    const request = createMockRequest({});

    const ip = extractIpAddress(request);

    expect(ip).toBe('unknown');
  });

  it('should trim whitespace from IPs in X-Forwarded-For', () => {
    const request = createMockRequest({
      'x-forwarded-for': '  192.168.1.1  ,  10.0.0.1  ',
    });

    const ip = extractIpAddress(request);

    expect(ip).toBe('192.168.1.1');
  });
});

describe('extractUserAgent', () => {
  it('should extract user agent from header', () => {
    const request = createMockRequest({
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    });

    const ua = extractUserAgent(request);

    expect(ua).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  });

  it('should return "unknown" when user agent is missing', () => {
    const request = createMockRequest({});

    const ua = extractUserAgent(request);

    expect(ua).toBe('unknown');
  });
});

describe('generateSecureToken', () => {
  it('should generate a token with default length of 64 hex characters', () => {
    const token = generateSecureToken();

    expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate a token with custom byte length', () => {
    const token = generateSecureToken(16);

    expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('should generate unique tokens', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();

    expect(token1).not.toBe(token2);
  });

  it('should generate cryptographically random tokens', () => {
    // Generate multiple tokens and check they're all different
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateSecureToken());
    }

    expect(tokens.size).toBe(100); // All tokens should be unique
  });
});

describe('isHoneypotFilled', () => {
  it('should return false for empty string', () => {
    expect(isHoneypotFilled('')).toBe(false);
  });

  it('should return false for whitespace-only string', () => {
    expect(isHoneypotFilled('   ')).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isHoneypotFilled(undefined)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isHoneypotFilled(null)).toBe(false);
  });

  it('should return true for non-empty string', () => {
    expect(isHoneypotFilled('http://spam.com')).toBe(true);
  });

  it('should return true for string with content after trimming', () => {
    expect(isHoneypotFilled('  content  ')).toBe(true);
  });
});

describe('hashToken', () => {
  it('should generate SHA256 hash of token', () => {
    const token = 'test-token-12345';
    const hash = hashToken(token);

    expect(hash).toHaveLength(64); // SHA256 = 64 hex characters
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate consistent hash for same input', () => {
    const token = 'test-token-12345';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = hashToken('token1');
    const hash2 = hashToken('token2');

    expect(hash1).not.toBe(hash2);
  });

  it('should be case-sensitive', () => {
    const hash1 = hashToken('Token');
    const hash2 = hashToken('token');

    expect(hash1).not.toBe(hash2);
  });
});

describe('extractRequestMetadata', () => {
  it('should extract all metadata from request', () => {
    const request = createMockRequest({
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0',
    });

    const metadata = extractRequestMetadata(request);

    expect(metadata).toEqual({
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: expect.any(Date),
    });
  });

  it('should include timestamp', () => {
    const before = new Date();
    const request = createMockRequest({});
    const metadata = extractRequestMetadata(request);
    const after = new Date();

    expect(metadata.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(metadata.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle missing headers', () => {
    const request = createMockRequest({});

    const metadata = extractRequestMetadata(request);

    expect(metadata).toEqual({
      ipAddress: 'unknown',
      userAgent: 'unknown',
      timestamp: expect.any(Date),
    });
  });
});
