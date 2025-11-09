/**
 * Price Fetching Service
 * Fetches real-time prices from Finnhub API for stocks and cryptocurrencies
 */

import { config } from '../config';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface FinnhubQuoteResponse {
  c: number;  // Current price
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubCryptoCandlesResponse {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volume
}

/**
 * Maps crypto symbols to Finnhub exchange format
 * Finnhub requires format like "BINANCE:BTCUSDT"
 */
const CRYPTO_SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BINANCE:BTCUSDT',
  'ETH': 'BINANCE:ETHUSDT',
  'BNB': 'BINANCE:BNBUSDT',
  'SOL': 'BINANCE:SOLUSDT',
  'ADA': 'BINANCE:ADAUSDT',
  'XRP': 'BINANCE:XRPUSDT',
  'DOT': 'BINANCE:DOTUSDT',
  'DOGE': 'BINANCE:DOGEUSDT',
  'AVAX': 'BINANCE:AVAXUSDT',
  'MATIC': 'BINANCE:MATICUSDT',
};

/**
 * Fetches stock price from Finnhub quote endpoint
 */
async function fetchStockPrice(symbol: string): Promise<number> {
  const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${config.finnhub.apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub API error for ${symbol}: ${response.status} ${response.statusText}`);
  }

  const data: FinnhubQuoteResponse = await response.json();

  // Check if we got valid data
  if (data.c === 0 && data.pc === 0) {
    throw new Error(`No price data available for stock symbol: ${symbol}`);
  }

  return data.c; // Current price
}

/**
 * Fetches crypto price from Finnhub crypto candles endpoint
 * Gets the most recent closing price
 */
async function fetchCryptoPrice(symbol: string): Promise<number> {
  // Map the simple symbol (BTC) to Finnhub format (BINANCE:BTCUSDT)
  const finnhubSymbol = CRYPTO_SYMBOL_MAP[symbol];

  if (!finnhubSymbol) {
    throw new Error(`Unsupported crypto symbol: ${symbol}. Add mapping in CRYPTO_SYMBOL_MAP.`);
  }

  // Get data for the last hour (1-minute resolution)
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;

  const url = `${FINNHUB_BASE_URL}/crypto/candles?symbol=${finnhubSymbol}&resolution=1&from=${oneHourAgo}&to=${now}&token=${config.finnhub.apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Finnhub API error for ${symbol}: ${response.status} ${response.statusText}`);
  }

  const data: FinnhubCryptoCandlesResponse = await response.json();

  // Check if we got valid data
  if (data.s !== 'ok' || !data.c || data.c.length === 0) {
    throw new Error(`No price data available for crypto symbol: ${symbol}`);
  }

  // Return the most recent closing price
  return data.c[data.c.length - 1];
}

/**
 * Fetches price for an asset (stock or crypto)
 */
export async function fetchAssetPrice(symbol: string, type: 'stock' | 'crypto'): Promise<PriceData> {
  try {
    const price = type === 'stock'
      ? await fetchStockPrice(symbol)
      : await fetchCryptoPrice(symbol);

    return {
      symbol,
      price,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol} (${type}):`, error);
    throw error;
  }
}

/**
 * Fetches prices for multiple assets in parallel
 * Returns both successful and failed results
 */
export async function fetchMultipleAssetPrices(
  assets: Array<{ symbol: string; type: 'stock' | 'crypto' }>
): Promise<{
  successful: PriceData[];
  failed: Array<{ symbol: string; error: string }>;
}> {
  const results = await Promise.allSettled(
    assets.map(asset => fetchAssetPrice(asset.symbol, asset.type))
  );

  const successful: PriceData[] = [];
  const failed: Array<{ symbol: string; error: string }> = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successful.push(result.value);
    } else {
      failed.push({
        symbol: assets[index].symbol,
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  return { successful, failed };
}
