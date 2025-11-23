/**
 * Tests for POST /api/auth/verify-email endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { userStore } from '@/lib/data/users-db';

// Mock dependencies
jest.mock('@/lib/data/users-db');

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should verify email with valid token', async () => {
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

    (userStore.verifyEmail as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      message: 'Email verified successfully',
      success: true,
    });
    expect(userStore.verifyEmail).toHaveBeenCalledWith('valid-token-123');
  });

  it('should reject invalid token', async () => {
    (userStore.verifyEmail as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'invalid-token' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired token');
    expect(data.details).toContain('invalid or has expired');
  });

  it('should reject expired token', async () => {
    (userStore.verifyEmail as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'expired-token-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired token');
  });

  it('should return 400 if token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing token');
  });

  it('should return 400 if token is empty string', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing token');
  });

  it('should handle database errors gracefully', async () => {
    (userStore.verifyEmail as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token-123' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('should handle invalid JSON in request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
      method: 'POST',
      body: 'not-valid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
