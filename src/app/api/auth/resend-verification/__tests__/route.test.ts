/**
 * Tests for POST /api/auth/resend-verification endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { userStore } from '@/lib/data/users-db';
import * as authMiddleware from '@/lib/middleware/auth';
import * as rateLimitMiddleware from '@/lib/middleware/rate-limit';
import * as emailService from '@/lib/services/email-service';
import * as security from '@/lib/utils/security';

// Mock dependencies
jest.mock('@/lib/data/users-db');
jest.mock('@/lib/middleware/auth');
jest.mock('@/lib/middleware/rate-limit');
jest.mock('@/lib/services/email-service');
jest.mock('@/lib/utils/security');

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (rateLimitMiddleware.enforceRateLimit as jest.Mock).mockReturnValue(null);
    (security.generateSecureToken as jest.Mock).mockReturnValue('new-token-123');
    (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
  });

  it('should resend verification email for authenticated unverified user', async () => {
    const mockAuthUser = {
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: false,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUpdatedUser = {
      ...mockUser,
      verificationToken: 'new-token-123',
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    (authMiddleware.requireAuth as jest.Mock).mockReturnValue(mockAuthUser);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);
    (userStore.setVerificationToken as jest.Mock).mockResolvedValue(mockUpdatedUser);

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      message: 'Verification email sent',
      success: true,
    });
    expect(userStore.setVerificationToken).toHaveBeenCalled();
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
      })
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    const authError = new Error('Authentication required');
    authError.name = 'AuthError';
    (authMiddleware.requireAuth as jest.Mock).mockImplementation(() => {
      throw authError;
    });
    (authMiddleware.handleAuthError as jest.Mock).mockReturnValue(
      Response.json(
        { error: 'Authentication required', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    );

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Authentication required');
  });

  it('should return 404 if user not found in database', async () => {
    const mockAuthUser = {
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    };

    (authMiddleware.requireAuth as jest.Mock).mockReturnValue(mockAuthUser);
    (userStore.getById as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if email is already verified', async () => {
    const mockAuthUser = {
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockVerifiedUser = {
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

    (authMiddleware.requireAuth as jest.Mock).mockReturnValue(mockAuthUser);
    (userStore.getById as jest.Mock).mockResolvedValue(mockVerifiedUser);

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Already verified');
    expect(data.details).toContain('already verified');
  });

  it('should enforce rate limiting', async () => {
    const rateLimitResponse = Response.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
    (rateLimitMiddleware.enforceRateLimit as jest.Mock).mockReturnValue(rateLimitResponse);

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
    expect(rateLimitMiddleware.enforceRateLimit).toHaveBeenCalledWith(
      request,
      'resend-verification',
      expect.objectContaining({
        maxRequests: expect.any(Number),
        windowMs: 15 * 60 * 1000,
      })
    );
  });

  it('should handle email sending failure gracefully', async () => {
    const mockAuthUser = {
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: false,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUpdatedUser = {
      ...mockUser,
      verificationToken: 'new-token-123',
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    (authMiddleware.requireAuth as jest.Mock).mockReturnValue(mockAuthUser);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);
    (userStore.setVerificationToken as jest.Mock).mockResolvedValue(mockUpdatedUser);
    (emailService.sendEmail as jest.Mock).mockRejectedValue(new Error('Email service unavailable'));

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should generate new verification token', async () => {
    const mockAuthUser = {
      userId: '123',
      email: 'test@example.com',
      username: 'testuser',
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hash',
      emailVerified: false,
      verificationToken: 'old-token',
      verificationTokenExpiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUpdatedUser = {
      ...mockUser,
      verificationToken: 'new-token-123',
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    (authMiddleware.requireAuth as jest.Mock).mockReturnValue(mockAuthUser);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);
    (userStore.setVerificationToken as jest.Mock).mockResolvedValue(mockUpdatedUser);

    const request = new NextRequest('http://localhost:3000/api/auth/resend-verification', {
      method: 'POST',
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(security.generateSecureToken).toHaveBeenCalled();
    expect(userStore.setVerificationToken).toHaveBeenCalledWith(
      '123',
      'new-token-123',
      expect.any(Date)
    );
  });
});
