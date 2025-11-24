/**
 * Tests for POST /api/auth/forgot-password endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { userStore } from '@/lib/data/users-db';
import { passwordResetTokenStore } from '@/lib/data/password-reset-db';
import * as rateLimitMiddleware from '@/lib/middleware/rate-limit';
import * as emailService from '@/lib/services/email-service';
import * as security from '@/lib/utils/security';

// Mock dependencies
jest.mock('@/lib/data/users-db');
jest.mock('@/lib/data/password-reset-db');
jest.mock('@/lib/middleware/rate-limit');
jest.mock('@/lib/services/email-service');
jest.mock('@/lib/utils/security');

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (rateLimitMiddleware.enforceRateLimit as jest.Mock).mockReturnValue(null);
    (security.generateSecureToken as jest.Mock).mockReturnValue('reset-token-123');
    (security.extractRequestMetadata as jest.Mock).mockReturnValue({
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      timestamp: new Date(),
    });
    (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
    (passwordResetTokenStore.create as jest.Mock).mockResolvedValue({
      id: 'token-id',
      userId: '123',
      token: 'reset-token-123',
      expiresAt: new Date(),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    });
  });

  it('should send password reset email for existing user', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (userStore.getByEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Password reset email sent');
    expect(security.generateSecureToken).toHaveBeenCalled();
    expect(passwordResetTokenStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '123',
        token: 'reset-token-123',
      })
    );
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
      })
    );
  });

  it('should return success even if email does not exist (prevent enumeration)', async () => {
    (userStore.getByEmail as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.details).toContain('If an account exists');
    expect(passwordResetTokenStore.create).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing email');
  });

  it('should enforce rate limiting', async () => {
    const rateLimitResponse = Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
    (rateLimitMiddleware.enforceRateLimit as jest.Mock).mockReturnValue(rateLimitResponse);

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
    expect(rateLimitMiddleware.enforceRateLimit).toHaveBeenCalledWith(
      request,
      'forgot-password',
      expect.objectContaining({
        maxRequests: expect.any(Number),
        windowMs: 15 * 60 * 1000,
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (userStore.getByEmail as jest.Mock).mockResolvedValue(mockUser);
    (passwordResetTokenStore.create as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should handle email sending failure gracefully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (userStore.getByEmail as jest.Mock).mockResolvedValue(mockUser);
    (emailService.sendEmail as jest.Mock).mockRejectedValue(new Error('Email service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should store request metadata with token', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (userStore.getByEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    await POST(request);

    expect(security.extractRequestMetadata).toHaveBeenCalledWith(request);
    expect(passwordResetTokenStore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
    );
  });
});
