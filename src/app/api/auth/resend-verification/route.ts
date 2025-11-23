/**
 * POST /api/auth/resend-verification
 * Resend email verification link
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/data/users-db';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { generateSecureToken } from '@/lib/utils/security';
import { config } from '@/lib/config';
import { sendEmail } from '@/lib/services/email-service';
import { getVerificationEmail } from '@/lib/email-templates/verification-email';
import { requireAuth, handleAuthError } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 resend attempts per 15 minutes per IP
    const rateLimitResponse = enforceRateLimit(request, 'resend-verification', {
      maxRequests: config.rateLimits.resendVerificationPer15Min,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many verification email requests. Please try again in a few minutes.',
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Require authentication (user must be logged in)
    const authUser = requireAuth(request);

    // Get full user from database
    const user = await userStore.getById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          details: 'User account no longer exists',
        },
        { status: 404 }
      );
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Already verified',
          details: 'Your email address is already verified',
        },
        { status: 400 }
      );
    }

    // Generate new verification token
    const verificationToken = generateSecureToken();
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + config.tokens.verificationExpiryHours);

    // Update token in database
    await userStore.setVerificationToken(user.id, verificationToken, verificationExpiresAt);

    // Send verification email
    await sendEmail({
      to: user.email,
      ...getVerificationEmail({
        username: user.username,
        verificationToken,
      }),
    });

    console.log(`Verification email resent to ${user.email}`);

    return NextResponse.json(
      {
        message: 'Verification email sent',
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AuthError') {
      return handleAuthError(error);
    }

    console.error('Resend verification error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to resend verification email. Please try again later.',
      },
      { status: 500 }
    );
  }
}
