-- Migration: Initial schema setup
-- Description: Create tables for assets, portfolios, and holdings

-- Enable UUID extension for generating IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Assets table
-- Stores all unique assets (stocks and crypto) with their current prices
-- This is the single source of truth for asset prices
CREATE TABLE assets (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('stock', 'crypto')),
    current_price DECIMAL(20, 8) NOT NULL,
    last_price_update TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT positive_price CHECK (current_price >= 0)
);

-- Create index on type for filtering
CREATE INDEX idx_assets_type ON assets(type);

-- Portfolios table
-- Stores portfolio metadata
-- user_id is nullable for now, will be required when auth is added
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id VARCHAR(255), -- For future authentication integration
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on user_id for future filtering
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);

-- Holdings table
-- Represents the many-to-many relationship between portfolios and assets
-- Each holding is a position in a portfolio
CREATE TABLE holdings (
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL REFERENCES assets(symbol) ON DELETE RESTRICT,
    quantity DECIMAL(20, 8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (portfolio_id, asset_symbol),
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Create index on asset_symbol for lookups
CREATE INDEX idx_holdings_asset_symbol ON holdings(asset_symbol);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on portfolios
CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at on holdings
CREATE TRIGGER update_holdings_updated_at
    BEFORE UPDATE ON holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE assets IS 'Stores all unique assets (stocks and cryptocurrencies) with current prices';
COMMENT ON TABLE portfolios IS 'Stores portfolio metadata and ownership information';
COMMENT ON TABLE holdings IS 'Represents asset positions within portfolios';
COMMENT ON COLUMN portfolios.user_id IS 'User identifier - will be required when authentication is implemented';
