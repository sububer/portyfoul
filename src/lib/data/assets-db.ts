import { Asset } from '@/types/api';
import { query, queryOne } from '@/lib/db';

// Database row type (snake_case from PostgreSQL)
interface AssetRow {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  current_price: string;
  last_price_update: Date;
  created_at: Date;
}

// Helper to convert database row to Asset type
function rowToAsset(row: AssetRow): Asset {
  return {
    symbol: row.symbol,
    name: row.name,
    type: row.type,
    currentPrice: parseFloat(row.current_price),
    lastPriceUpdate: new Date(row.last_price_update),
    createdAt: new Date(row.created_at),
  };
}

// Asset store operations using PostgreSQL
export const assetStore = {
  async getAll(): Promise<Asset[]> {
    const rows = await query<AssetRow>(`
      SELECT symbol, name, type, current_price, last_price_update, created_at
      FROM assets
      ORDER BY created_at DESC
    `);

    return rows.map(rowToAsset);
  },

  async getBySymbol(symbol: string): Promise<Asset | undefined> {
    const row = await queryOne<AssetRow>(`
      SELECT symbol, name, type, current_price, last_price_update, created_at
      FROM assets
      WHERE symbol = $1
    `, [symbol.toUpperCase()]);

    if (!row) return undefined;

    return rowToAsset(row);
  },

  async create(asset: Asset): Promise<Asset> {
    const upperSymbol = asset.symbol.toUpperCase();

    const row = await queryOne<AssetRow>(`
      INSERT INTO assets (symbol, name, type, current_price, last_price_update, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING symbol, name, type, current_price, last_price_update, created_at
    `, [
      upperSymbol,
      asset.name,
      asset.type,
      asset.currentPrice,
      asset.lastPriceUpdate,
      asset.createdAt,
    ]);

    if (!row) throw new Error('Failed to create asset');

    return rowToAsset(row);
  },

  async update(symbol: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const upperSymbol = symbol.toUpperCase();
    const existing = await this.getBySymbol(upperSymbol);
    if (!existing) return undefined;

    const merged = { ...existing, ...updates };

    const row = await queryOne<AssetRow>(`
      UPDATE assets
      SET name = $1, type = $2, current_price = $3, last_price_update = $4
      WHERE symbol = $5
      RETURNING symbol, name, type, current_price, last_price_update, created_at
    `, [
      merged.name,
      merged.type,
      merged.currentPrice,
      merged.lastPriceUpdate,
      upperSymbol,
    ]);

    if (!row) return undefined;

    return rowToAsset(row);
  },

  async exists(symbol: string): Promise<boolean> {
    const row = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS(SELECT 1 FROM assets WHERE symbol = $1) as exists
    `, [symbol.toUpperCase()]);

    return row?.exists || false;
  },

  // Used by price fetching service to update prices
  async updatePrice(symbol: string, price: number): Promise<Asset | undefined> {
    return this.update(symbol, {
      currentPrice: price,
      lastPriceUpdate: new Date(),
    });
  },
};
