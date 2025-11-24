/**
 * GET /api/auth/me
 * Returns the currently authenticated user's information
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticate, handleAuthError } from '@/lib/middleware/auth';
import { userStore, toSafeUser } from '@/lib/data/users-db';

export async function GET(request: NextRequest) {
  try {
    const authUser = authenticate(request);

    // Fetch user from database to get current emailVerified status
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

    // Return safe user data (without password hash or tokens)
    const safeUser = toSafeUser(user);

    return NextResponse.json({
      user: {
        userId: safeUser.id,
        email: safeUser.email,
        username: safeUser.username,
        emailVerified: safeUser.emailVerified,
      },
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
