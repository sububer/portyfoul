/**
 * POST /api/auth/verify-email
 * Verify a user's email address using a verification token
 */

import { NextRequest, NextResponse } from 'next/server';
import { userStore } from '@/lib/data/users-db';

interface VerifyEmailRequest {
  token: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyEmailRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        {
          error: 'Missing token',
          details: 'Verification token is required',
        },
        { status: 400 }
      );
    }

    // Verify the email using the token
    const user = await userStore.verifyEmail(token);

    if (!user) {
      // Token is invalid, expired, or already used
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          details: 'This verification link is invalid or has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }

    console.log(`Email verified for user ${user.email}`);

    return NextResponse.json(
      {
        message: 'Email verified successfully',
        success: true,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to verify email. Please try again later.',
      },
      { status: 500 }
    );
  }
}
