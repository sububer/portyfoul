import { NextRequest, NextResponse } from 'next/server';
import { assetStore } from '@/lib/data/assets';
import { CreateAssetRequest, ApiResponse, Asset } from '@/types/api';

// GET /api/assets - List all assets
export async function GET() {
  try {
    const assets = assetStore.getAll();
    return NextResponse.json<ApiResponse<Asset[]>>({
      data: assets,
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST /api/assets - Register a new asset
// This is called when a user adds a new asset to their portfolio
// The price fetching service will update prices for all registered assets
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateAssetRequest;

    // Validate required fields
    if (!body.symbol || !body.symbol.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Asset symbol is required' },
        { status: 400 }
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Asset name is required' },
        { status: 400 }
      );
    }

    if (body.currentPrice === undefined || body.currentPrice < 0) {
      return NextResponse.json<ApiResponse<never>>(
        { error: 'Valid current price is required' },
        { status: 400 }
      );
    }

    const symbol = body.symbol.trim().toUpperCase();

    // Check if asset already exists
    if (assetStore.exists(symbol)) {
      return NextResponse.json<ApiResponse<never>>(
        { error: `Asset ${symbol} already exists` },
        { status: 409 }
      );
    }

    // Create new asset
    const asset = assetStore.create({
      symbol,
      name: body.name.trim(),
      type: body.type,
      currentPrice: body.currentPrice,
      lastPriceUpdate: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json<ApiResponse<Asset>>(
      { data: asset },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json<ApiResponse<never>>(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}
