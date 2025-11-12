/**
 * Tests for authentication middleware
 */

import { NextRequest } from 'next/server';
import {
  extractToken,
  authenticate,
  requireAuth,
  handleAuthError,
  optionalAuth,
  AuthError,
} from '../auth';
import * as authLib from '@/lib/auth';
import { DecodedToken } from '@/lib/auth';

// Mock the auth library
jest.mock('@/lib/auth', () => ({
  ...jest.requireActual('@/lib/auth'),
  verifyToken: jest.fn(),
}));

describe('Authentication Middleware', () => {
  const mockDecodedToken: DecodedToken = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer test-token-123',
        },
      });

      const token = extractToken(request);

      expect(token).toBe('test-token-123');
    });

    it('should extract token from cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: 'auth_token=cookie-token-456',
        },
      });

      const token = extractToken(request);

      expect(token).toBe('cookie-token-456');
    });

    it('should prefer Authorization header over cookie', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer header-token',
          cookie: 'auth_token=cookie-token',
        },
      });

      const token = extractToken(request);

      expect(token).toBe('header-token');
    });

    it('should return null if no token present', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const token = extractToken(request);

      expect(token).toBeNull();
    });

    it('should return null for malformed Authorization header', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      const token = extractToken(request);

      expect(token).toBeNull();
    });

    it('should return null for Authorization header without Bearer', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'token-only',
        },
      });

      const token = extractToken(request);

      expect(token).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('should authenticate valid token from header', () => {
      (authLib.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = authenticate(request);

      expect(result).toEqual(mockDecodedToken);
      expect(authLib.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should authenticate valid token from cookie', () => {
      (authLib.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          cookie: 'auth_token=valid-token',
        },
      });

      const result = authenticate(request);

      expect(result).toEqual(mockDecodedToken);
      expect(authLib.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw AuthError if no token provided', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      expect(() => authenticate(request)).toThrow(AuthError);
      expect(() => authenticate(request)).toThrow('Authentication required');
    });

    it('should throw AuthError with 401 status for missing token', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      try {
        authenticate(request);
        fail('Should have thrown AuthError');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).statusCode).toBe(401);
      }
    });

    it('should throw AuthError for invalid token', () => {
      (authLib.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(() => authenticate(request)).toThrow(AuthError);
      expect(() => authenticate(request)).toThrow('Invalid authentication token');
    });

    it('should throw specific AuthError for expired token', () => {
      (authLib.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer expired-token',
        },
      });

      expect(() => authenticate(request)).toThrow(AuthError);
      expect(() => authenticate(request)).toThrow('Token has expired');
    });
  });

  describe('requireAuth', () => {
    it('should return decoded token for valid authentication', () => {
      (authLib.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = requireAuth(request);

      expect(result).toEqual(mockDecodedToken);
    });

    it('should throw AuthError for invalid authentication', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      expect(() => requireAuth(request)).toThrow(AuthError);
    });
  });

  describe('handleAuthError', () => {
    it('should handle AuthError with custom status code', async () => {
      const error = new AuthError('Unauthorized', 401);

      const response = handleAuthError(error);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json).toEqual({
        error: 'Unauthorized',
        code: 'AUTH_ERROR',
      });
    });

    it('should handle AuthError with different status code', async () => {
      const error = new AuthError('Forbidden', 403);

      const response = handleAuthError(error);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.error).toBe('Forbidden');
    });

    it('should handle generic errors with 500 status', async () => {
      const error = new Error('Something went wrong');

      const response = handleAuthError(error);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json).toEqual({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    });

    it('should handle unknown error types', async () => {
      const error = 'string error';

      const response = handleAuthError(error);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('optionalAuth', () => {
    it('should return decoded token for valid authentication', () => {
      (authLib.verifyToken as jest.Mock).mockReturnValue(mockDecodedToken);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const result = optionalAuth(request);

      expect(result).toEqual(mockDecodedToken);
    });

    it('should return null for missing token', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      const result = optionalAuth(request);

      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      (authLib.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const result = optionalAuth(request);

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      (authLib.verifyToken as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer expired-token',
        },
      });

      const result = optionalAuth(request);

      expect(result).toBeNull();
    });
  });

  describe('AuthError', () => {
    it('should create error with default status code', () => {
      const error = new AuthError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });

    it('should create error with custom status code', () => {
      const error = new AuthError('Forbidden', 403);

      expect(error.message).toBe('Forbidden');
      expect(error.statusCode).toBe(403);
    });

    it('should be instance of Error', () => {
      const error = new AuthError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AuthError);
    });
  });
});
