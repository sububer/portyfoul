/**
 * Admin API endpoint to manually trigger price updates
 * Useful for testing and forcing immediate price updates
 */

import { NextResponse } from 'next/server';
import { triggerManualUpdate, isPriceUpdateWorkerRunning } from '@/lib/workers/price-update-worker';

export async function POST() {
  try {
    // Check if worker is running
    if (!isPriceUpdateWorkerRunning()) {
      return NextResponse.json(
        {
          error: 'Price update worker is not running. Check your configuration.',
        },
        { status: 503 }
      );
    }

    // Trigger manual update (non-blocking)
    triggerManualUpdate().catch(error => {
      console.error('[Admin API] Error during manual price update:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Price update triggered successfully',
    });
  } catch (error) {
    console.error('[Admin API] Error triggering manual update:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger price update',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const workerRunning = isPriceUpdateWorkerRunning();

    return NextResponse.json({
      workerRunning,
      message: workerRunning
        ? 'Price update worker is running'
        : 'Price update worker is not running',
    });
  } catch (error) {
    console.error('[Admin API] Error checking worker status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check worker status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
