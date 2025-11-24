/**
 * Tests for POST /api/auth/reset-password endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { userStore } from '@/lib/data/users-db';
import { passwordResetTokenStore } from '@/lib/data/password-reset-db';
import * as auth from '@/lib/auth';
import * as emailService from '@/lib/services/email-service';
import * as validation from '@/lib/validation';

// Mock dependencies
jest.mock('@/lib/data/users-db');
jest.mock('@/lib/data/password-reset-db');
jest.mock('@/lib/auth');
jest.mock('@/lib/services/email-service');
jest.mock('@/lib/validation');

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (validation.validatePassword as jest.Mock).mockReturnValue({
      isValid: true,
      errors: [],
    });
    (auth.hashPassword as jest.Mock).mockResolvedValue('$2b$10$newhashedpassword');
    (emailService.sendEmail as jest.Mock).mockResolvedValue(undefined);
    (userStore.updatePassword as jest.Mock).mockResolvedValue({
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$newhashedpassword',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (passwordResetTokenStore.markAsUsed as jest.Mock).mockResolvedValue(undefined);
    (passwordResetTokenStore.invalidateAllForUser as jest.Mock).mockResolvedValue(undefined);
  });

  it('should reset password with valid token', async () => {
    const mockResetToken = {
      id: 'token-id',
      userId: '123',
      token: 'valid-reset-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$oldhashedpassword',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (passwordResetTokenStore.getValidToken as jest.Mock).mockResolvedValue(mockResetToken);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token', password: 'NewPassword123!' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Password reset successful');
    expect(auth.hashPassword).toHaveBeenCalledWith('NewPassword123!');
    expect(userStore.updatePassword).toHaveBeenCalledWith('123', '$2b$10$newhashedpassword');
    expect(passwordResetTokenStore.markAsUsed).toHaveBeenCalledWith('valid-reset-token');
    expect(passwordResetTokenStore.invalidateAllForUser).toHaveBeenCalledWith('123');
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
      })
    );
  });

  it('should return 400 if token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ password: 'NewPassword123!' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should return 400 if password is invalid', async () => {
    (validation.validatePassword as jest.Mock).mockReturnValue({
      isValid: false,
      errors: ['Password must be at least 8 characters'],
    });

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token', password: 'short' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid password');
    expect(data.details).toContain('at least 8 characters');
  });

  it('should return 400 if token is invalid or expired', async () => {
    (passwordResetTokenStore.getValidToken as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token', password: 'NewPassword123!' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired token');
    expect(data.details).toContain('invalid or has expired');
  });

  it('should return 404 if user not found', async () => {
    const mockResetToken = {
      id: 'token-id',
      userId: '123',
      token: 'valid-reset-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    (passwordResetTokenStore.getValidToken as jest.Mock).mockResolvedValue(mockResetToken);
    (userStore.getById as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token', password: 'NewPassword123!' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should handle database errors gracefully', async () => {
    const mockResetToken = {
      id: 'token-id',
      userId: '123',
      token: 'valid-reset-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$oldhashedpassword',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (passwordResetTokenStore.getValidToken as jest.Mock).mockResolvedValue(mockResetToken);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);
    (userStore.updatePassword as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token', password: 'NewPassword123!' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should invalidate all user tokens after successful reset', async () => {
    const mockResetToken = {
      id: 'token-id',
      userId: '123',
      token: 'valid-reset-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$oldhashedpassword',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (passwordResetTokenStore.getValidToken as jest.Mock).mockResolvedValue(mockResetToken);
    (userStore.getById as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-reset-token', password: 'NewPassword123!' }),
    });

    await POST(request);

    expect(passwordResetTokenStore.markAsUsed).toHaveBeenCalledWith('valid-reset-token');
    expect(passwordResetTokenStore.invalidateAllForUser).toHaveBeenCalledWith('123');
  });
});
