export type AssetType = 'stock' | 'crypto';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  quantity: number;
  symbol: string; // e.g., AAPL, BTC
  currentPrice?: number; // Will be fetched from API later
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  assets: Asset[];
  createdAt: Date;
  updatedAt: Date;
  totalValue?: number; // Calculated from assets
}
