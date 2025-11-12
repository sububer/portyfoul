-- Migration: Add users table for authentication
-- This migration creates the users table and updates the portfolios table
-- to properly link to users with foreign key constraint

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Update portfolios table to add foreign key constraint to users
-- The user_id column will be updated below to be UUID type

-- Update user_id column to use UUID type if it isn't already
-- Check current type first
DO $$
BEGIN
    -- Change user_id from VARCHAR to UUID to match users.id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'portfolios'
        AND column_name = 'user_id'
        AND data_type != 'uuid'
    ) THEN
        -- Since this is a new feature and user_id should be NULL for all existing records,
        -- we can safely drop and recreate the column
        ALTER TABLE portfolios DROP COLUMN user_id;
        ALTER TABLE portfolios ADD COLUMN user_id UUID;

        -- Recreate the index
        CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

        -- Add the foreign key constraint
        ALTER TABLE portfolios
            ADD CONSTRAINT fk_portfolios_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;
