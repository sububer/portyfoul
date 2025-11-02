import { NextRequest, NextResponse } from 'next/server';
import { assetStore } from '@/lib/data/assets-db';
import { ApiResponse, Asset } from '@/types/api';

type RouteContext = {
  params: Promise<{ symbol: string }>;
};

// GET /api/assets/[symbol] - Get a specific asset by symbol
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { symbol } = await context.params;
    const asset = await assetStore.getBySymbol(symbol);

    if (!asset) {
      return NextResponse.json<ApiResponse<never>>(
        { error: `Asset ${symbol.toUpperCase()} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Asset>>({
      data: asset,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}
