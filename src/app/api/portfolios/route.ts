import { NextRequest, NextResponse } from 'next/server';
import { portfolioStore } from '@/lib/data/portfolios-db';
import { CreatePortfolioRequest, ApiResponse, PortfolioWithValues } from '@/types/api';

// GET /api/portfolios - List all portfolios
// Future: Filter by userId from authentication
export async function GET() {
  try {
    const portfolios = await portfolioStore.getAll();
    return NextResponse.json<ApiResponse<PortfolioWithValues[]>>({
      data: portfolios,
    });
  } catch (error) {
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
    const body = await request.json() as CreatePortfolioRequest;

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio name is required' },
        { status: 400 }
      );
    }

    // Create portfolio
    // Future: Add userId from authentication context
    const portfolio = await portfolioStore.create({
      name: body.name.trim(),
      description: body.description?.trim(),
      holdings: body.holdings || [],
    });

    const enriched = await portfolioStore.getById(portfolio.id);

    return NextResponse.json<ApiResponse<PortfolioWithValues>>(
      { data: enriched },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to create portfolio' },
      { status: 500 }
    );
  }
}
