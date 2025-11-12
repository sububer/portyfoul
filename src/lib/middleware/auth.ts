/**
 * Authentication middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, DecodedToken } from '@/lib/auth';

/**
 * Authentication context added to requests
 */
export interface AuthContext {
  user: DecodedToken;
}

/**
 * Error responses
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Extracts token from request cookies or Authorization header
 *
 * @param request - The Next.js request object
 * @returns The JWT token or null if not found
 */
export function extractToken(request: NextRequest): string | null {
  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // Try to get token from cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authenticates a request and returns the user context
 *
 * @param request - The Next.js request object
 * @returns The decoded user token
 * @throws AuthError if authentication fails
 */
export function authenticate(request: NextRequest): DecodedToken {
  const token = extractToken(request);

  if (!token) {
    throw new AuthError('Authentication required. Please provide a valid token.', 401);
  }

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a JWT expiration error
      if (error.message.includes('expired')) {
        throw new AuthError('Token has expired. Please log in again.', 401);
      }
      throw new AuthError('Invalid authentication token.', 401);
    }
    throw new AuthError('Authentication failed.', 401);
  }
}

/**
 * Middleware function to protect API routes
 * Usage in API route:
 *
 * export async function GET(request: NextRequest) {
 *   try {
 *     const user = authenticate(request);
 *     // Your protected route logic here
 *   } catch (error) {
 *     return handleAuthError(error);
 *   }
 * }
 *
 * @param request - The Next.js request object
 * @returns The authenticated user or an error response
 */
export function requireAuth(request: NextRequest): DecodedToken {
  return authenticate(request);
}

/**
 * Handles authentication errors and returns appropriate JSON response
 *
 * @param error - The error to handle
 * @returns NextResponse with error details
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'AUTH_ERROR',
      },
      { status: error.statusCode }
    );
  }

  // Generic error
  console.error('Unexpected auth error:', error);
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 *
 * @param request - The Next.js request object
 * @returns The decoded user token or null
 */
export function optionalAuth(request: NextRequest): DecodedToken | null {
  try {
    return authenticate(request);
  } catch {
    return null;
  }
}
