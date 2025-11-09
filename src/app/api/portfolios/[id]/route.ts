import { NextRequest, NextResponse } from 'next/server';
import { portfolioStore } from '@/lib/data/portfolios-db';
import { UpdatePortfolioRequest, ApiResponse, PortfolioWithValues } from '@/types/api';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/portfolios/[id] - Get a specific portfolio
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const portfolio = await portfolioStore.getById(id);

    if (!portfolio) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<PortfolioWithValues>>({
      data: portfolio,
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}

// PUT /api/portfolios/[id] - Update a portfolio
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json() as UpdatePortfolioRequest;

    // Check if portfolio exists
    if (!(await portfolioStore.exists(id))) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Validate name if provided
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio name cannot be empty' },
        { status: 400 }
      );
    }

    // Update portfolio
    const updates: UpdatePortfolioRequest = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.holdings !== undefined) updates.holdings = body.holdings;

    await portfolioStore.update(id, updates);
    const enriched = await portfolioStore.getById(id);

    return NextResponse.json<ApiResponse<PortfolioWithValues>>({
      data: enriched,
    });
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolios/[id] - Delete a portfolio
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    // Check if portfolio exists
    if (!(await portfolioStore.exists(id))) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }

    // Delete portfolio
    await portfolioStore.delete(id);

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      data: { success: true },
    });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
}
