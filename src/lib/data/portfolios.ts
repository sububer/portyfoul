import { Portfolio, PortfolioWithValues, HoldingWithAsset } from '@/types/api';
import { assetStore } from './assets';

// In-memory portfolios store
// NOTE: This will be replaced with a database in the future
// Future: Add userId indexing for authentication

const portfoliosStore = new Map<string, Portfolio>();

// Initialize with some dummy data
const initialPortfolios: Portfolio[] = [
  {
    id: '1',
    name: 'Tech Portfolio',
    description: 'My technology stocks',
    holdings: [
      { assetSymbol: 'AAPL', quantity: 10 },
      { assetSymbol: 'MSFT', quantity: 5 },
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Crypto Holdings',
    description: 'Cryptocurrency investments',
    holdings: [
      { assetSymbol: 'BTC', quantity: 0.5 },
      { assetSymbol: 'ETH', quantity: 2 },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

// Populate initial data
initialPortfolios.forEach(portfolio => {
  portfoliosStore.set(portfolio.id, portfolio);
});

// Helper to calculate portfolio with values
function enrichPortfolioWithValues(portfolio: Portfolio): PortfolioWithValues | null {
  const holdingsWithAssets: HoldingWithAsset[] = [];
  let totalValue = 0;

  for (const holding of portfolio.holdings) {
    const asset = assetStore.getBySymbol(holding.assetSymbol);
    if (!asset) {
      // Asset not found in store - this shouldn't happen in production
      console.warn(`Asset ${holding.assetSymbol} not found in asset store`);
      continue;
    }

    const holdingValue = holding.quantity * asset.currentPrice;
    holdingsWithAssets.push({
      ...holding,
      asset,
      totalValue: holdingValue,
    });
    totalValue += holdingValue;
  }

  return {
    ...portfolio,
    holdings: holdingsWithAssets,
    totalValue,
  };
}

// Portfolio store operations
export const portfolioStore = {
  getAll(): PortfolioWithValues[] {
    const portfolios = Array.from(portfoliosStore.values());
    return portfolios
      .map(enrichPortfolioWithValues)
      .filter((p): p is PortfolioWithValues => p !== null);
  },

  // Future: Add userId parameter for filtering
  // getAllByUser(userId: string): PortfolioWithValues[]

  getById(id: string): PortfolioWithValues | undefined {
    const portfolio = portfoliosStore.get(id);
    if (!portfolio) return undefined;
    return enrichPortfolioWithValues(portfolio) || undefined;
  },

  create(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Portfolio {
    const id = Date.now().toString();
    const now = new Date();
    const newPortfolio: Portfolio = {
      ...portfolio,
      id,
      createdAt: now,
      updatedAt: now,
    };

    portfoliosStore.set(id, newPortfolio);
    return newPortfolio;
  },

  update(id: string, updates: Partial<Omit<Portfolio, 'id' | 'createdAt'>>): Portfolio | undefined {
    const existing = portfoliosStore.get(id);
    if (!existing) return undefined;

    const updated: Portfolio = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    portfoliosStore.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return portfoliosStore.delete(id);
  },

  exists(id: string): boolean {
    return portfoliosStore.has(id);
  },
};
