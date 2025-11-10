import { NextRequest, NextResponse } from 'next/server';
import { fetchAssetDetails, AssetDetails } from '@/lib/services/price-fetcher';
import { ApiResponse, AssetType } from '@/types/api';

interface FetchAssetDetailsRequest {
  symbol: string;
  type: AssetType;
}

// POST /api/assets/fetch-details - Fetch asset details (name and price) from external APIs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as FetchAssetDetailsRequest;

    // Validate required fields
    if (!body.symbol || !body.symbol.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Asset symbol is required' },
        { status: 400 }
      );
    }

    if (!body.type || (body.type !== 'stock' && body.type !== 'crypto')) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Valid asset type (stock or crypto) is required' },
        { status: 400 }
      );
    }

    const symbol = body.symbol.trim().toUpperCase();

    // Fetch asset details from external API
    const details = await fetchAssetDetails(symbol, body.type);

    return NextResponse.json<ApiResponse<AssetDetails>>(
      { data: details },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching asset details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch asset details';
    return NextResponse.json<ApiResponse<never>>(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
