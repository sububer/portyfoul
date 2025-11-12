/**
 * POST /api/auth/logout
 * Log out a user by clearing their authentication token
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Clear the auth_token cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: 'Failed to log out. Please try again later.',
      },
      { status: 500 }
    );
  }
}
