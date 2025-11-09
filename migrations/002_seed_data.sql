-- Migration: Seed initial data
-- Description: Populate database with sample assets and portfolios

-- Insert sample assets
INSERT INTO assets (symbol, name, type, current_price, last_price_update, created_at) VALUES
    ('AAPL', 'Apple Inc.', 'stock', 178.50, NOW(), '2024-01-01 00:00:00'),
    ('MSFT', 'Microsoft Corporation', 'stock', 378.91, NOW(), '2024-01-01 00:00:00'),
    ('GOOGL', 'Alphabet Inc.', 'stock', 142.65, NOW(), '2024-01-01 00:00:00'),
    ('BTC', 'Bitcoin', 'crypto', 42000.00, NOW(), '2024-01-01 00:00:00'),
    ('ETH', 'Ethereum', 'crypto', 2200.00, NOW(), '2024-01-01 00:00:00')
ON CONFLICT (symbol) DO NOTHING;

-- Insert sample portfolios
-- Using specific UUIDs for reproducible seed data
INSERT INTO portfolios (id, name, description, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Tech Portfolio', 'My technology stocks', '2024-01-15 00:00:00', '2024-01-15 00:00:00'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Crypto Holdings', 'Cryptocurrency investments', '2024-02-01 00:00:00', '2024-02-01 00:00:00')
ON CONFLICT (id) DO NOTHING;

-- Insert sample holdings for Tech Portfolio
INSERT INTO holdings (portfolio_id, asset_symbol, quantity, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'AAPL', 10, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440001', 'MSFT', 5, NOW(), NOW())
ON CONFLICT (portfolio_id, asset_symbol) DO NOTHING;

-- Insert sample holdings for Crypto Holdings
INSERT INTO holdings (portfolio_id, asset_symbol, quantity, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440002', 'BTC', 0.5, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'ETH', 2, NOW(), NOW())
ON CONFLICT (portfolio_id, asset_symbol) DO NOTHING;
