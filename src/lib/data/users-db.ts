/**
 * User data access layer
 * Handles CRUD operations for users in PostgreSQL
 */

import { query, queryOne, execute } from '@/lib/db';

/**
 * User model from database
 */
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User data for creation (without generated fields)
 */
export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
}

/**
 * User data returned to the application (without password hash)
 */
export interface SafeUser {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database row structure
 */
interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Converts a database row to User model
 */
function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Converts a User model to SafeUser (removes password hash)
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * User store operations using PostgreSQL
 */
export const userStore = {
  /**
   * Creates a new user
   */
  async create(userData: CreateUserData): Promise<User> {
    const row = await queryOne<UserRow>(
      `
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, username, password_hash, created_at, updated_at
      `,
      [userData.email, userData.username, userData.passwordHash]
    );

    if (!row) {
      throw new Error('Failed to create user');
    }

    return rowToUser(row);
  },

  /**
   * Finds a user by ID
   */
  async getById(id: string): Promise<User | undefined> {
    const row = await queryOne<UserRow>(
      `
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE id = $1
      `,
      [id]
    );

    return row ? rowToUser(row) : undefined;
  },

  /**
   * Finds a user by email
   */
  async getByEmail(email: string): Promise<User | undefined> {
    const row = await queryOne<UserRow>(
      `
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE email = $1
      `,
      [email]
    );

    return row ? rowToUser(row) : undefined;
  },

  /**
   * Finds a user by username
   */
  async getByUsername(username: string): Promise<User | undefined> {
    const row = await queryOne<UserRow>(
      `
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    return row ? rowToUser(row) : undefined;
  },

  /**
   * Checks if a user with the given email exists
   */
  async existsByEmail(email: string): Promise<boolean> {
    const row = await queryOne<{ exists: boolean }>(
      `
      SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists
      `,
      [email]
    );

    return row?.exists || false;
  },

  /**
   * Checks if a user with the given username exists
   */
  async existsByUsername(username: string): Promise<boolean> {
    const row = await queryOne<{ exists: boolean }>(
      `
      SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists
      `,
      [username]
    );

    return row?.exists || false;
  },

  /**
   * Updates a user's password
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<User | undefined> {
    const row = await queryOne<UserRow>(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, username, password_hash, created_at, updated_at
      `,
      [newPasswordHash, userId]
    );

    return row ? rowToUser(row) : undefined;
  },

  /**
   * Updates a user's username
   */
  async updateUsername(userId: string, newUsername: string): Promise<User | undefined> {
    const row = await queryOne<UserRow>(
      `
      UPDATE users
      SET username = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, username, password_hash, created_at, updated_at
      `,
      [newUsername, userId]
    );

    return row ? rowToUser(row) : undefined;
  },

  /**
   * Deletes a user by ID
   * This will cascade delete all portfolios owned by the user
   */
  async delete(userId: string): Promise<boolean> {
    const rowCount = await execute(
      `
      DELETE FROM users
      WHERE id = $1
      `,
      [userId]
    );

    return rowCount > 0;
  },

  /**
   * Gets all users (for admin purposes - be careful with this!)
   * Returns users without password hashes
   */
  async getAll(): Promise<SafeUser[]> {
    const rows = await query<UserRow>(
      `
      SELECT id, email, username, password_hash, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      `
    );

    return rows.map(row => toSafeUser(rowToUser(row)));
  },
};
