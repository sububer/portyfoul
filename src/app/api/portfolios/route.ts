import { NextRequest, NextResponse } from 'next/server';
import { portfolioStore } from '@/lib/data/portfolios-db';
import { CreatePortfolioRequest, ApiResponse, PortfolioWithValues } from '@/types/api';
import { requireAuth, handleAuthError } from '@/lib/middleware/auth';

// GET /api/portfolios - List all portfolios for authenticated user
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = requireAuth(request);

    // Get portfolios for this user only
    const portfolios = await portfolioStore.getAllByUserId(user.userId);
    return NextResponse.json<ApiResponse<PortfolioWithValues[]>>({
      data: portfolios,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.name === 'AuthError') {
      return handleAuthError(error);
    }

    console.error('Error fetching portfolios:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
}

// POST /api/portfolios - Create a new portfolio
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = requireAuth(request);

    const body = await request.json() as CreatePortfolioRequest;

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }

    // Create portfolio with authenticated user's ID
    const portfolio = await portfolioStore.create({
      name: body.name.trim(),
      description: body.description?.trim(),
      holdings: body.holdings || [],
      userId: user.userId,
    });

    const enriched = await portfolioStore.getById(portfolio.id);

    return NextResponse.json<ApiResponse<PortfolioWithValues>>(
      { data: enriched },
      { status: 201 }
    );
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.name === 'AuthError') {
      return handleAuthError(error);
    }

    console.error('Error creating portfolio:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}
