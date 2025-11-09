// Core types for the API layer

export type AssetType = 'stock' | 'crypto';

// Asset in the shared assets store
// This will be used by the price fetching service
export interface Asset {
  symbol: string; // Unique identifier (e.g., AAPL, BTC)
  name: string; // Display name
  type: AssetType;
  currentPrice: number;
  lastPriceUpdate: Date;
  createdAt: Date;
}

// Holding represents an asset position in a portfolio
export interface Holding {
  assetSymbol: string; // Reference to Asset.symbol
  quantity: number;
}

// Portfolio owned by a user
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  holdings: Holding[];
  userId?: string; // NOTE: For future authentication implementation
  createdAt: Date;
  updatedAt: Date;
}

// Extended portfolio with calculated values (for API responses)
export interface PortfolioWithValues extends Portfolio {
  totalValue: number;
  holdings: HoldingWithAsset[];
}

// Holding with full asset details and calculated value
export interface HoldingWithAsset extends Holding {
  asset: Asset;
  totalValue: number; // quantity * currentPrice
}

// API request/response types

export interface CreatePortfolioRequest {
  name: string;
  description?: string;
  holdings: Holding[];
}

export interface UpdatePortfolioRequest {
  name?: string;
  description?: string;
  holdings?: Holding[];
}

export interface CreateAssetRequest {
  symbol: string;
  name: string;
  type: AssetType;
  currentPrice: number;
}

// API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}
