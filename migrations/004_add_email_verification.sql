-- Migration: Add email verification fields to users table
-- This migration adds support for email verification with tokens

-- Add email verification columns to users table
ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN verification_token VARCHAR(64) UNIQUE,
    ADD COLUMN verification_token_expires_at TIMESTAMP;

-- Create index on verification_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Set existing users as verified (grandfather clause)
-- This prevents disruption for users who registered before email verification was added
UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE;

-- Add comment to document the table change
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.verification_token IS 'Token used for email verification, single-use, expires after 24 hours';
COMMENT ON COLUMN users.verification_token_expires_at IS 'When the verification token expires';
