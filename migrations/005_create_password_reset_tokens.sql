-- Migration: Create password_reset_tokens table
-- This migration creates the table for managing password reset tokens

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),  -- Supports both IPv4 and IPv6
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to users table with cascade delete
    CONSTRAINT fk_password_reset_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Add comments to document the table
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens with expiration and usage tracking';
COMMENT ON COLUMN password_reset_tokens.token IS 'Secure random token for password reset, single-use';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'When the token expires (typically 1 hour from creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Timestamp when the token was used (NULL if not used yet)';
COMMENT ON COLUMN password_reset_tokens.ip_address IS 'IP address of the requester for security auditing';
COMMENT ON COLUMN password_reset_tokens.user_agent IS 'User agent of the requester for security auditing';
