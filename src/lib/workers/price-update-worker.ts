/**
 * Background Price Update Worker
 * Periodically fetches and updates asset prices from Finnhub API
 */

import { config, validateConfig } from '../config';
import { assetStore } from '../data/assets-db';
import { fetchMultipleAssetPrices } from '../services/price-fetcher';

let workerInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Performs a single price update cycle for all assets
 */
async function updateAllPrices(): Promise<void> {
  if (isRunning) {
    console.log('[Price Worker] Update already in progress, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();

  try {
    console.log('[Price Worker] Starting price update cycle...');

    // Get all assets from the database
    const assets = await assetStore.getAll();

    if (assets.length === 0) {
      console.log('[Price Worker] No assets found in database');
      return;
    }

    console.log(`[Price Worker] Fetching prices for ${assets.length} assets...`);

    // Fetch prices for all assets in parallel
    const { successful, failed } = await fetchMultipleAssetPrices(
      assets.map(asset => ({
        symbol: asset.symbol,
        type: asset.type,
      }))
    );

    // Update successful prices in database
    const updatePromises = successful.map(async priceData => {
      try {
        await assetStore.updatePrice(priceData.symbol, priceData.price);
        return { symbol: priceData.symbol, success: true };
      } catch (error) {
        console.error(`[Price Worker] Failed to update ${priceData.symbol} in database:`, error);
        return { symbol: priceData.symbol, success: false };
      }
    });

    const updateResults = await Promise.all(updatePromises);
    const successfulUpdates = updateResults.filter(r => r.success).length;

    const duration = Date.now() - startTime;

    console.log(`[Price Worker] Update cycle completed in ${duration}ms`);
    console.log(`[Price Worker] Successfully updated: ${successfulUpdates}/${assets.length} assets`);

    if (failed.length > 0) {
      console.warn(`[Price Worker] Failed to fetch prices for ${failed.length} assets:`);
      failed.forEach(failure => {
        console.warn(`  - ${failure.symbol}: ${failure.error}`);
      });
    }
  } catch (error) {
    console.error('[Price Worker] Error during price update cycle:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the background price update worker
 */
export function startPriceUpdateWorker(): void {
  // Validate configuration before starting
  try {
    validateConfig();
  } catch (error) {
    console.error('[Price Worker] Cannot start worker due to configuration errors:', error);
    return;
  }

  // Prevent starting multiple workers
  if (workerInterval !== null) {
    console.warn('[Price Worker] Worker already running');
    return;
  }

  const intervalMs = config.priceUpdate.intervalMinutes * 60 * 1000;

  console.log(`[Price Worker] Starting worker with ${config.priceUpdate.intervalMinutes} minute interval`);

  // Run initial update immediately
  updateAllPrices().catch(error => {
    console.error('[Price Worker] Error in initial update:', error);
  });

  // Schedule recurring updates
  workerInterval = setInterval(() => {
    updateAllPrices().catch(error => {
      console.error('[Price Worker] Error in scheduled update:', error);
    });
  }, intervalMs);

  console.log('[Price Worker] Worker started successfully');
}

/**
 * Stops the background price update worker
 */
export function stopPriceUpdateWorker(): void {
  if (workerInterval !== null) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Price Worker] Worker stopped');
  }
}

/**
 * Returns whether the worker is currently running
 */
export function isPriceUpdateWorkerRunning(): boolean {
  return workerInterval !== null;
}

/**
 * Manually triggers a price update (useful for testing)
 */
export async function triggerManualUpdate(): Promise<void> {
  console.log('[Price Worker] Manual update triggered');
  await updateAllPrices();
}
