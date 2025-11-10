/**
 * Price Fetching Service
 * Fetches real-time prices from Finnhub API for stocks and CoinGecko API for cryptocurrencies
 */

import { config } from '../config';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

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

export interface CoinGeckoPriceResponse {
  [coinId: string]: {
    usd: number;
  };
}

/**
 * Maps crypto symbols to CoinGecko coin IDs
 * See https://www.coingecko.com/en/api/documentation for available coins
 */
const CRYPTO_SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'ADA': 'cardano',
  'XRP': 'ripple',
  'DOT': 'polkadot',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'ATOM': 'cosmos',
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
 * Fetches crypto price from CoinGecko API
 * CoinGecko provides free crypto price data without requiring an API key
 */
async function fetchCryptoPrice(symbol: string): Promise<number> {
  // Map the simple symbol (BTC) to CoinGecko ID (bitcoin)
  const coinGeckoId = CRYPTO_SYMBOL_TO_COINGECKO_ID[symbol];

  if (!coinGeckoId) {
    throw new Error(`Unsupported crypto symbol: ${symbol}. Add mapping in CRYPTO_SYMBOL_TO_COINGECKO_ID.`);
  }

  // Build URL - CoinGecko free tier doesn't require an API key
  // Optional: add x_cg_demo_api_key parameter if user has a demo API key
  const url = new URL(`${COINGECKO_BASE_URL}/simple/price`);
  url.searchParams.append('ids', coinGeckoId);
  url.searchParams.append('vs_currencies', 'usd');

  // Add API key if configured (optional for free tier)
  if (config.coinGecko.apiKey) {
    url.searchParams.append('x_cg_demo_api_key', config.coinGecko.apiKey);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`CoinGecko API error for ${symbol}: ${response.status} ${response.statusText}`);
  }

  const data: CoinGeckoPriceResponse = await response.json();

  // Check if we got valid data
  if (!data[coinGeckoId] || typeof data[coinGeckoId].usd !== 'number') {
    throw new Error(`No price data available for crypto symbol: ${symbol}`);
  }

  return data[coinGeckoId].usd;
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

/**
 * Interface for asset details including name and price
 */
export interface AssetDetails {
  symbol: string;
  name: string;
  price: number;
  type: 'stock' | 'crypto';
}

/**
 * Fetches detailed information about an asset including name and price
 * For crypto: fetches from CoinGecko API
 * For stocks: fetches price from Finnhub (name must be provided separately for stocks)
 */
export async function fetchAssetDetails(symbol: string, type: 'stock' | 'crypto'): Promise<AssetDetails> {
  try {
    if (type === 'crypto') {
      // For crypto, we can get both name and price from CoinGecko
      const coinGeckoId = CRYPTO_SYMBOL_TO_COINGECKO_ID[symbol];

      if (!coinGeckoId) {
        throw new Error(`Unsupported crypto symbol: ${symbol}. Add mapping in CRYPTO_SYMBOL_TO_COINGECKO_ID.`);
      }

      // Fetch both price and detailed info from CoinGecko
      const url = new URL(`${COINGECKO_BASE_URL}/coins/${coinGeckoId}`);
      url.searchParams.append('localization', 'false');
      url.searchParams.append('tickers', 'false');
      url.searchParams.append('market_data', 'true');
      url.searchParams.append('community_data', 'false');
      url.searchParams.append('developer_data', 'false');

      if (config.coinGecko.apiKey) {
        url.searchParams.append('x_cg_demo_api_key', config.coinGecko.apiKey);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`CoinGecko API error for ${symbol}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        symbol,
        name: data.name,
        price: data.market_data.current_price.usd,
        type: 'crypto',
      };
    } else {
      // For stocks, fetch price from Finnhub
      // Note: Finnhub doesn't provide company names in the quote endpoint
      // We'll use the symbol as the name for now, or enhance this later
      const price = await fetchStockPrice(symbol);

      return {
        symbol,
        name: symbol, // Use symbol as name for stocks (can be enhanced later)
        price,
        type: 'stock',
      };
    }
  } catch (error) {
    console.error(`Error fetching details for ${symbol} (${type}):`, error);
    throw error;
  }
}
