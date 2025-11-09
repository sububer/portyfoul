import { Asset } from '@/types/api';

// In-memory assets store
// NOTE: This will be replaced with a database in the future
// This store contains all unique assets that can be referenced by portfolios
// The price fetching service will update prices in this store

const assetsStore = new Map<string, Asset>();

// Initialize with some dummy data
const initialAssets: Asset[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    currentPrice: 178.50,
    lastPriceUpdate: new Date(),
    createdAt: new Date('2024-01-01'),
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    currentPrice: 378.91,
    lastPriceUpdate: new Date(),
    createdAt: new Date('2024-01-01'),
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'stock',
    currentPrice: 142.65,
    lastPriceUpdate: new Date(),
    createdAt: new Date('2024-01-01'),
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    currentPrice: 42000,
    lastPriceUpdate: new Date(),
    createdAt: new Date('2024-01-01'),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    currentPrice: 2200,
    lastPriceUpdate: new Date(),
    createdAt: new Date('2024-01-01'),
  },
];

// Populate initial data
initialAssets.forEach(asset => {
  assetsStore.set(asset.symbol, asset);
});

// Asset store operations
export const assetStore = {
  getAll(): Asset[] {
    return Array.from(assetsStore.values());
  },

  getBySymbol(symbol: string): Asset | undefined {
    return assetsStore.get(symbol.toUpperCase());
  },

  create(asset: Asset): Asset {
    const upperSymbol = asset.symbol.toUpperCase();
    assetsStore.set(upperSymbol, { ...asset, symbol: upperSymbol });
    return assetsStore.get(upperSymbol)!;
  },

  update(symbol: string, updates: Partial<Asset>): Asset | undefined {
    const upperSymbol = symbol.toUpperCase();
    const existing = assetsStore.get(upperSymbol);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, symbol: upperSymbol };
    assetsStore.set(upperSymbol, updated);
    return updated;
  },

  exists(symbol: string): boolean {
    return assetsStore.has(symbol.toUpperCase());
  },

  // Used by price fetching service to update prices
  updatePrice(symbol: string, price: number): Asset | undefined {
    return this.update(symbol, {
      currentPrice: price,
      lastPriceUpdate: new Date(),
    });
  },
};
