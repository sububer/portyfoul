/**
 * GET /api/auth/me
 * Returns the currently authenticated user's information
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, handleAuthError } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);

    return NextResponse.json({
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
