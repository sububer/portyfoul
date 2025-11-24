/**
 * POST /api/auth/reset-password
 * Reset user password with a valid reset token
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/data/users-db';
import { passwordResetTokenStore } from '@/lib/data/password-reset-db';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/services/email-service';
import { getPasswordChangedEmail } from '@/lib/email-templates/password-changed-email';
import { validatePassword } from '@/lib/validation';

interface ResetPasswordRequest {
  token: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResetPasswordRequest = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'Token and password are required',
        },
        { status: 400 }
      );
    }

    // Validate password meets requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid password',
          details: passwordValidation.errors.join(', '),
        },
        { status: 400 }
      );
    }

    // Get valid reset token (not expired, not used)
    const resetToken = await passwordResetTokenStore.getValidToken(token);

    if (!resetToken) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          details: 'This password reset link is invalid or has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    // Get user
    const user = await userStore.getById(resetToken.userId);

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found',
          details: 'User account no longer exists',
        },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user's password
    await userStore.updatePassword(user.id, passwordHash);

    // Mark token as used
    await passwordResetTokenStore.markAsUsed(token);

    // Invalidate all other reset tokens for this user
    await passwordResetTokenStore.invalidateAllForUser(user.id);

    // Send password changed confirmation email
    await sendEmail({
      to: user.email,
      ...getPasswordChangedEmail({
        username: user.username,
        timestamp: new Date(),
      }),
    });

    console.log(`Password reset successful for user ${user.email}`);

    return NextResponse.json(
      {
        message: 'Password reset successful',
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to reset password. Please try again later.',
      },
      { status: 500 }
    );
  }
}
