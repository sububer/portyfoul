/**
 * POST /api/auth/register
 * Register a new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore, toSafeUser } from '@/lib/data/users-db';
import { hashPassword, generateToken } from '@/lib/auth';
import { validatePassword, validateEmail, validateUsername } from '@/lib/validation';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { isHoneypotFilled, extractIpAddress, extractUserAgent, generateSecureToken } from '@/lib/utils/security';
import { config } from '@/lib/config';
import { sendEmail } from '@/lib/services/email-service';
import { getVerificationEmail } from '@/lib/email-templates/verification-email';

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  website?: string; // Honeypot field
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 registration attempts per 15 minutes per IP
    const rateLimitResponse = enforceRateLimit(request, 'register', {
      maxRequests: config.rateLimits.registrationPer15Min,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many registration attempts. Please try again in a few minutes.',
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body: RegisterRequest = await request.json();
    const { email, username, password, website } = body;

    // Honeypot check - if the hidden "website" field is filled, it's likely a bot
    if (isHoneypotFilled(website)) {
      const ip = extractIpAddress(request);
      console.warn(`Bot detected in registration from IP ${ip} - honeypot filled`);

      // Return success to avoid revealing bot detection
      // Don't actually create the account
      return NextResponse.json(
        {
          message: 'User registered successfully',
          user: {
            id: 'bot-detected',
            email,
            username,
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          token: 'bot-detected-token',
        },
        { status: 201 }
      );
    }

    // Log registration attempt for security monitoring
    const ipAddress = extractIpAddress(request);
    const userAgent = extractUserAgent(request);
    console.log(`Registration attempt from IP ${ipAddress}, User-Agent: ${userAgent}`);


    // Validate input presence
    if (!email || !username || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'Email, username, and password are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
          details: 'Please provide a valid email address',
        },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid username',
          details: usernameValidation.error,
        },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid password',
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmail = await userStore.existsByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        {
          error: 'Email already registered',
          details: 'An account with this email already exists',
        },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await userStore.existsByUsername(username);
    if (existingUsername) {
      return NextResponse.json(
        {
          error: 'Username already taken',
          details: 'This username is already in use',
        },
        { status: 409 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Create the user
    const user = await userStore.create({
      email,
      username,
      passwordHash,
    });

    // Generate email verification token
    const verificationToken = generateSecureToken();
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + config.tokens.verificationExpiryHours);

    // Set verification token in database
    await userStore.setVerificationToken(user.id, verificationToken, verificationExpiresAt);

    // Send verification email (don't wait for it to complete)
    sendEmail({
      to: email,
      ...getVerificationEmail({
        username,
        verificationToken,
      }),
    }).catch(error => {
      console.error('Failed to send verification email:', error);
      // Don't fail registration if email fails - user can resend later
    });

    console.log(`Verification email sent to ${email}`);

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
        message: 'User registered successfully',
        user: safeUser,
        token,
      },
      { status: 201 }
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
    console.error('Registration error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to register user. Please try again later.',
      },
      { status: 500 }
    );
  }
}
