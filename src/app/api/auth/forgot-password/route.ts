/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/data/users-db';
import { passwordResetTokenStore } from '@/lib/data/password-reset-db';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { generateSecureToken, extractRequestMetadata } from '@/lib/utils/security';
import { config } from '@/lib/config';
import { sendEmail } from '@/lib/services/email-service';
import { getResetPasswordEmail } from '@/lib/email-templates/reset-password-email';

interface ForgotPasswordRequest {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 password reset requests per 15 minutes per IP
    const rateLimitResponse = enforceRateLimit(request, 'forgot-password', {
      maxRequests: config.rateLimits.passwordResetPer15Min,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many password reset requests. Please try again in a few minutes.',
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body: ForgotPasswordRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        {
          error: 'Missing email',
          details: 'Email address is required',
        },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await userStore.getByEmail(email);

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Generate password reset token
      const resetToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + config.tokens.passwordResetExpiryMinutes);

      // Extract request metadata
      const { ipAddress, userAgent } = extractRequestMetadata(request);

      // Store token in database
      await passwordResetTokenStore.create({
        userId: user.id,
        token: resetToken,
        expiresAt,
        ipAddress,
        userAgent,
      });

      // Send password reset email
      await sendEmail({
        to: user.email,
        ...getResetPasswordEmail({
          username: user.username,
          resetToken,
        }),
      });

      console.log(`Password reset email sent to ${user.email}`);
    } else {
      console.log(`Password reset requested for non-existent email: ${email}`);
    }

    // Always return success (prevent email enumeration)
    return NextResponse.json(
      {
        message: 'Password reset email sent',
        success: true,
        details: 'If an account exists with this email, you will receive a password reset link.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to process password reset request. Please try again later.',
      },
      { status: 500 }
    );
  }
}
