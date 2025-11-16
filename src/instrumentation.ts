/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up
 * Used to initialize background workers and services
 */

export async function register() {
  // Only run in Node.js runtime (not in Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { config } = await import('./lib/config');
    const { startPriceUpdateWorker } = await import('./lib/workers/price-update-worker');

    console.log('[Instrumentation] Initializing server-side services...');

    // Start the price update worker (only if enabled)
    if (config.priceUpdate.workerEnabled) {
      console.log('[Instrumentation] Price update worker enabled - starting...');
      startPriceUpdateWorker();
    } else {
      console.log('[Instrumentation] Price update worker disabled - skipping');
    }

    console.log('[Instrumentation] Server-side services initialized');
  }
}
