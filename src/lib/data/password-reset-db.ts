/**
 * Password reset token data access layer
 * Handles CRUD operations for password reset tokens in PostgreSQL
 */

import { query, queryOne, execute } from '@/lib/db';

/**
 * Password reset token model from database
 */
export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Data needed to create a password reset token
 */
export interface CreatePasswordResetTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Database row structure
 */
interface PasswordResetTokenRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * Converts a database row to PasswordResetToken model
 */
function rowToToken(row: PasswordResetTokenRow): PasswordResetToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    usedAt: row.used_at ? new Date(row.used_at) : null,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Password reset token store operations using PostgreSQL
 */
export const passwordResetTokenStore = {
  /**
   * Creates a new password reset token
   */
  async create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    const row = await queryOne<PasswordResetTokenRow>(
      `
      INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, token, expires_at, used_at, ip_address, user_agent, created_at
      `,
      [data.userId, data.token, data.expiresAt, data.ipAddress || null, data.userAgent || null]
    );

    if (!row) {
      throw new Error('Failed to create password reset token');
    }

    return rowToToken(row);
  },

  /**
   * Finds a password reset token by token string
   * Returns undefined if token doesn't exist
   */
  async getByToken(token: string): Promise<PasswordResetToken | undefined> {
    const row = await queryOne<PasswordResetTokenRow>(
      `
      SELECT id, user_id, token, expires_at, used_at, ip_address, user_agent, created_at
      FROM password_reset_tokens
      WHERE token = $1
      `,
      [token]
    );

    return row ? rowToToken(row) : undefined;
  },

  /**
   * Finds a valid (not expired, not used) password reset token
   * Returns undefined if token doesn't exist, is expired, or has been used
   */
  async getValidToken(token: string): Promise<PasswordResetToken | undefined> {
    const row = await queryOne<PasswordResetTokenRow>(
      `
      SELECT id, user_id, token, expires_at, used_at, ip_address, user_agent, created_at
      FROM password_reset_tokens
      WHERE token = $1
        AND expires_at > CURRENT_TIMESTAMP
        AND used_at IS NULL
      `,
      [token]
    );

    return row ? rowToToken(row) : undefined;
  },

  /**
   * Marks a token as used
   */
  async markAsUsed(token: string): Promise<boolean> {
    const rowCount = await execute(
      `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE token = $1
      `,
      [token]
    );

    return rowCount > 0;
  },

  /**
   * Invalidates all password reset tokens for a user
   * Useful after a successful password change
   */
  async invalidateAllForUser(userId: string): Promise<number> {
    const rowCount = await execute(
      `
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND used_at IS NULL
      `,
      [userId]
    );

    return rowCount;
  },

  /**
   * Deletes expired and used password reset tokens
   * Should be called periodically to clean up old tokens
   */
  async cleanupExpired(): Promise<number> {
    const rowCount = await execute(
      `
      DELETE FROM password_reset_tokens
      WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL
      `
    );

    return rowCount;
  },

  /**
   * Gets all tokens for a user (for debugging/admin purposes)
   */
  async getAllForUser(userId: string): Promise<PasswordResetToken[]> {
    const rows = await query<PasswordResetTokenRow>(
      `
      SELECT id, user_id, token, expires_at, used_at, ip_address, user_agent, created_at
      FROM password_reset_tokens
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return rows.map(rowToToken);
  },
};
