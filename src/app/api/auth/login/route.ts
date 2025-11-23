/**
 * POST /api/auth/login
 * Authenticate a user and return a JWT token
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore, toSafeUser } from '@/lib/data/users-db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { extractIpAddress, extractUserAgent } from '@/lib/utils/security';
import { config } from '@/lib/config';

interface LoginRequest {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 login attempts per 15 minutes per IP
    const rateLimitResponse = enforceRateLimit(request, 'login', {
      maxRequests: config.rateLimits.loginPer15Min,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many login attempts. Please try again in a few minutes.',
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Log login attempt for security monitoring
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);
    console.log(`Login attempt for ${email} from IP ${ipAddress}, User-Agent: ${userAgent}`);

    // Validate input presence
    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await userStore.getByEmail(email);

    if (!user) {
      // Don't reveal whether the email exists or not (security best practice)
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          details: 'Email or password is incorrect',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          details: 'Email or password is incorrect',
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Return user data (without password hash) and token
    const safeUser = toSafeUser(user);

    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: safeUser,
        token,
      },
      { status: 200 }
    );

    // Set the token as an HTTP-only cookie for added security
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to log in. Please try again later.',
      },
      { status: 500 }
    );
  }
}
