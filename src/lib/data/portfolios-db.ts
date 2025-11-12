import { Portfolio, PortfolioWithValues, HoldingWithAsset, Holding } from '@/types/api';
import { query, queryOne, getClient } from '@/lib/db';
import { assetStore } from './assets-db';

interface PortfolioRow {
  id: string;
  name: string;
  description: string | null;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface HoldingRow {
  portfolio_id: string;
  asset_symbol: string;
  quantity: string;
}

// Helper to enrich portfolio with values
async function enrichPortfolioWithValues(portfolio: Portfolio): Promise<PortfolioWithValues> {
  const holdingsWithAssets: HoldingWithAsset[] = [];
  let totalValue = 0;

  for (const holding of portfolio.holdings) {
    const asset = await assetStore.getBySymbol(holding.assetSymbol);
    if (!asset) {
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

// Portfolio store operations using PostgreSQL
export const portfolioStore = {
  async getAll(): Promise<PortfolioWithValues[]> {
    // Get all portfolios
    const portfolioRows = await query<PortfolioRow>(`
      SELECT id, name, description, user_id, created_at, updated_at
      FROM portfolios
      ORDER BY created_at DESC
    `);

    // Get holdings for all portfolios
    const holdingRows = await query<HoldingRow>(`
      SELECT portfolio_id, asset_symbol, quantity
      FROM holdings
    `);

    // Group holdings by portfolio
    const holdingsByPortfolio = new Map<string, Holding[]>();
    for (const row of holdingRows) {
      const holdings = holdingsByPortfolio.get(row.portfolio_id) || [];
      holdings.push({
        assetSymbol: row.asset_symbol,
        quantity: parseFloat(row.quantity),
      });
      holdingsByPortfolio.set(row.portfolio_id, holdings);
    }

    // Build portfolios with holdings
    const portfolios: Portfolio[] = portfolioRows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      holdings: holdingsByPortfolio.get(row.id) || [],
      userId: row.user_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    // Enrich with values
    const enriched = await Promise.all(
      portfolios.map(p => enrichPortfolioWithValues(p))
    );

    return enriched;
  },

  async getAllByUserId(userId: string): Promise<PortfolioWithValues[]> {
    // Get portfolios for specific user
    const portfolioRows = await query<PortfolioRow>(`
      SELECT id, name, description, user_id, created_at, updated_at
      FROM portfolios
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    if (portfolioRows.length === 0) {
      return [];
    }

    // Get portfolio IDs
    const portfolioIds = portfolioRows.map(row => row.id);

    // Get holdings for these portfolios
    const holdingRows = await query<HoldingRow>(`
      SELECT portfolio_id, asset_symbol, quantity
      FROM holdings
      WHERE portfolio_id = ANY($1::uuid[])
    `, [portfolioIds]);

    // Group holdings by portfolio
    const holdingsByPortfolio = new Map<string, Holding[]>();
    for (const row of holdingRows) {
      const holdings = holdingsByPortfolio.get(row.portfolio_id) || [];
      holdings.push({
        assetSymbol: row.asset_symbol,
        quantity: parseFloat(row.quantity),
      });
      holdingsByPortfolio.set(row.portfolio_id, holdings);
    }

    // Build portfolios with holdings
    const portfolios: Portfolio[] = portfolioRows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      holdings: holdingsByPortfolio.get(row.id) || [],
      userId: row.user_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    // Enrich with values
    const enriched = await Promise.all(
      portfolios.map(p => enrichPortfolioWithValues(p))
    );

    return enriched;
  },

  async getById(id: string): Promise<PortfolioWithValues | undefined> {
    const row = await queryOne<PortfolioRow>(`
      SELECT id, name, description, user_id, created_at, updated_at
      FROM portfolios
      WHERE id = $1
    `, [id]);

    if (!row) return undefined;

    const holdingRows = await query<HoldingRow>(`
      SELECT portfolio_id, asset_symbol, quantity
      FROM holdings
      WHERE portfolio_id = $1
    `, [id]);

    const portfolio: Portfolio = {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      holdings: holdingRows.map(h => ({
        assetSymbol: h.asset_symbol,
        quantity: parseFloat(h.quantity),
      })),
      userId: row.user_id || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return enrichPortfolioWithValues(portfolio);
  },

  async create(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Insert portfolio
      const row = await client.query<PortfolioRow>(`
        INSERT INTO portfolios (name, description, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, user_id, created_at, updated_at
      `, [
        portfolio.name,
        portfolio.description || null,
        portfolio.userId || null,
      ]);

      const newPortfolio = row.rows[0];

      // Insert holdings
      for (const holding of portfolio.holdings) {
        await client.query(`
          INSERT INTO holdings (portfolio_id, asset_symbol, quantity)
          VALUES ($1, $2, $3)
        `, [newPortfolio.id, holding.assetSymbol, holding.quantity]);
      }

      await client.query('COMMIT');

      return {
        id: newPortfolio.id,
        name: newPortfolio.name,
        description: newPortfolio.description || undefined,
        holdings: portfolio.holdings,
        userId: newPortfolio.user_id || undefined,
        createdAt: new Date(newPortfolio.created_at),
        updatedAt: new Date(newPortfolio.updated_at),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async update(id: string, updates: Partial<Omit<Portfolio, 'id' | 'createdAt'>>): Promise<Portfolio | undefined> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update portfolio metadata if provided
      if (updates.name !== undefined || updates.description !== undefined) {
        const existing = await this.getById(id);
        if (!existing) {
          await client.query('ROLLBACK');
          return undefined;
        }

        await client.query(`
          UPDATE portfolios
          SET name = $1, description = $2, updated_at = NOW()
          WHERE id = $3
        `, [
          updates.name !== undefined ? updates.name : existing.name,
          updates.description !== undefined ? updates.description : existing.description,
          id,
        ]);
      }

      // Update holdings if provided
      if (updates.holdings !== undefined) {
        // Delete existing holdings
        await client.query(`
          DELETE FROM holdings WHERE portfolio_id = $1
        `, [id]);

        // Insert new holdings
        for (const holding of updates.holdings) {
          await client.query(`
            INSERT INTO holdings (portfolio_id, asset_symbol, quantity)
            VALUES ($1, $2, $3)
          `, [id, holding.assetSymbol, holding.quantity]);
        }
      }

      await client.query('COMMIT');

      // Return updated portfolio
      const result = await this.getById(id);
      return result ? {
        id: result.id,
        name: result.name,
        description: result.description,
        holdings: result.holdings.map(h => ({
          assetSymbol: h.assetSymbol,
          quantity: h.quantity,
        })),
        userId: result.userId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      } : undefined;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async delete(id: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM portfolios WHERE id = $1
    `, [id]);

    return (result as any).rowCount > 0;
  },

  async exists(id: string): Promise<boolean> {
    const row = await queryOne<{ exists: boolean }>(`
      SELECT EXISTS(SELECT 1 FROM portfolios WHERE id = $1) as exists
    `, [id]);

    return row?.exists || false;
  },
};
