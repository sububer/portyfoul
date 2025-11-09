/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up
 * Used to initialize background workers and services
 */

export async function register() {
  // Only run in Node.js runtime (not in Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPriceUpdateWorker } = await import('./lib/workers/price-update-worker');

    console.log('[Instrumentation] Initializing server-side services...');

    // Start the price update worker
    startPriceUpdateWorker();

    console.log('[Instrumentation] Server-side services initialized');
  }
}
