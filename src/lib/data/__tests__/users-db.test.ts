/**
 * Tests for user data access layer
 * These tests mock the database to test business logic
 */

import { userStore, toSafeUser, User, CreateUserData } from '../users-db';
import * as db from '@/lib/db';

// Mock the database module
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  execute: jest.fn(),
}));

describe('userStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: '$2b$10$hashedpassword',
    email_verified: true,
    verification_token: null,
    verification_token_expires_at: null,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser: User = {
    id: mockUserRow.id,
    email: mockUserRow.email,
    username: mockUserRow.username,
    passwordHash: mockUserRow.password_hash,
    emailVerified: mockUserRow.email_verified,
    verificationToken: mockUserRow.verification_token,
    verificationTokenExpiresAt: mockUserRow.verification_token_expires_at,
    createdAt: mockUserRow.created_at,
    updatedAt: mockUserRow.updated_at,
  };

  describe('create', () => {
    it('should create a new user', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(mockUserRow);

      const userData: CreateUserData = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: '$2b$10$hashedpassword',
      };

      const result = await userStore.create(userData);

      expect(result).toEqual(mockUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        [userData.email, userData.username, userData.passwordHash]
      );
    });

    it('should throw error if creation fails', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const userData: CreateUserData = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: '$2b$10$hashedpassword',
      };

      await expect(userStore.create(userData)).rejects.toThrow('Failed to create user');
    });
  });

  describe('getById', () => {
    it('should find user by ID', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(mockUserRow);

      const result = await userStore.getById(mockUserRow.id);

      expect(result).toEqual(mockUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUserRow.id]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.getById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getByEmail', () => {
    it('should find user by email', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(mockUserRow);

      const result = await userStore.getByEmail(mockUserRow.email);

      expect(result).toEqual(mockUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE email = $1'),
        [mockUserRow.email]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.getByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });

    it('should be case-sensitive for email', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      await userStore.getByEmail('TEST@EXAMPLE.COM');

      expect(db.queryOne).toHaveBeenCalledWith(
        expect.any(String),
        ['TEST@EXAMPLE.COM']
      );
    });
  });

  describe('getByUsername', () => {
    it('should find user by username', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(mockUserRow);

      const result = await userStore.getByUsername(mockUserRow.username);

      expect(result).toEqual(mockUser);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username = $1'),
        [mockUserRow.username]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.getByUsername('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ exists: true });

      const result = await userStore.existsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('EXISTS'),
        ['test@example.com']
      );
    });

    it('should return false if email does not exist', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ exists: false });

      const result = await userStore.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });

    it('should return false if query returns null', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.existsByEmail('test@example.com');

      expect(result).toBe(false);
    });
  });

  describe('existsByUsername', () => {
    it('should return true if username exists', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ exists: true });

      const result = await userStore.existsByUsername('testuser');

      expect(result).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue({ exists: false });

      const result = await userStore.existsByUsername('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false if query returns null', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.existsByUsername('testuser');

      expect(result).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const updatedRow = {
        ...mockUserRow,
        password_hash: '$2b$10$newhashedpassword',
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };
      (db.queryOne as jest.Mock).mockResolvedValue(updatedRow);

      const result = await userStore.updatePassword(mockUserRow.id, '$2b$10$newhashedpassword');

      expect(result).toBeTruthy();
      expect(result?.passwordHash).toBe('$2b$10$newhashedpassword');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['$2b$10$newhashedpassword', mockUserRow.id]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.updatePassword('non-existent-id', '$2b$10$newhashedpassword');

      expect(result).toBeUndefined();
    });
  });

  describe('updateUsername', () => {
    it('should update username', async () => {
      const updatedRow = {
        ...mockUserRow,
        username: 'newusername',
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };
      (db.queryOne as jest.Mock).mockResolvedValue(updatedRow);

      const result = await userStore.updateUsername(mockUserRow.id, 'newusername');

      expect(result).toBeTruthy();
      expect(result?.username).toBe('newusername');
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['newusername', mockUserRow.id]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.updateUsername('non-existent-id', 'newusername');

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      (db.execute as jest.Mock).mockResolvedValue(1);

      const result = await userStore.delete(mockUserRow.id);

      expect(result).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        [mockUserRow.id]
      );
    });

    it('should return false if user not found', async () => {
      (db.execute as jest.Mock).mockResolvedValue(0);

      const result = await userStore.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should handle zero rowCount', async () => {
      (db.execute as jest.Mock).mockResolvedValue(0);

      const result = await userStore.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all users without password hashes', async () => {
      const mockUsers = [
        mockUserRow,
        {
          ...mockUserRow,
          id: '456e7890-e89b-12d3-a456-426614174000',
          email: 'test2@example.com',
          username: 'testuser2',
        },
      ];
      (db.query as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userStore.getAll();

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('passwordHash');
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('username');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      );
    });

    it('should return empty array if no users', async () => {
      (db.query as jest.Mock).mockResolvedValue([]);

      const result = await userStore.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('setVerificationToken', () => {
    it('should set verification token and expiry', async () => {
      const token = 'verification-token-123';
      const expiresAt = new Date('2024-01-02T00:00:00Z');
      const updatedRow = {
        ...mockUserRow,
        verification_token: token,
        verification_token_expires_at: expiresAt,
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };
      (db.queryOne as jest.Mock).mockResolvedValue(updatedRow);

      const result = await userStore.setVerificationToken(mockUserRow.id, token, expiresAt);

      expect(result).toBeTruthy();
      expect(result?.verificationToken).toBe(token);
      expect(result?.verificationTokenExpiresAt).toStrictEqual(expiresAt);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [token, expiresAt, mockUserRow.id]
      );
    });

    it('should return undefined if user not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.setVerificationToken(
        'non-existent-id',
        'token',
        new Date()
      );

      expect(result).toBeUndefined();
    });
  });

  describe('getByVerificationToken', () => {
    it('should find user by verification token', async () => {
      const token = 'verification-token-123';
      const rowWithToken = {
        ...mockUserRow,
        verification_token: token,
        verification_token_expires_at: new Date('2025-01-01T00:00:00Z'),
        email_verified: false,
      };
      (db.queryOne as jest.Mock).mockResolvedValue(rowWithToken);

      const result = await userStore.getByVerificationToken(token);

      expect(result).toBeTruthy();
      expect(result?.verificationToken).toBe(token);
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE verification_token = $1'),
        [token]
      );
    });

    it('should return undefined if token not found', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.getByVerificationToken('non-existent-token');

      expect(result).toBeUndefined();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const token = 'verification-token-123';
      const verifiedRow = {
        ...mockUserRow,
        email_verified: true,
        verification_token: null,
        verification_token_expires_at: null,
        updated_at: new Date('2024-01-02T00:00:00Z'),
      };
      (db.queryOne as jest.Mock).mockResolvedValue(verifiedRow);

      const result = await userStore.verifyEmail(token);

      expect(result).toBeTruthy();
      expect(result?.emailVerified).toBe(true);
      expect(result?.verificationToken).toBeNull();
      expect(result?.verificationTokenExpiresAt).toBeNull();
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [token]
      );
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('email_verified = TRUE'),
        [token]
      );
      expect(db.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('verification_token_expires_at > CURRENT_TIMESTAMP'),
        [token]
      );
    });

    it('should return undefined if token is expired', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.verifyEmail('expired-token');

      expect(result).toBeUndefined();
    });

    it('should return undefined if token is invalid', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.verifyEmail('invalid-token');

      expect(result).toBeUndefined();
    });

    it('should not verify already verified emails', async () => {
      (db.queryOne as jest.Mock).mockResolvedValue(null);

      const result = await userStore.verifyEmail('token-for-verified-email');

      expect(result).toBeUndefined();
    });
  });
});

describe('toSafeUser', () => {
  it('should remove password hash from user', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: '$2b$10$hashedpassword',
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const safe = toSafeUser(user);

    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).not.toHaveProperty('verificationToken');
    expect(safe).not.toHaveProperty('verificationTokenExpiresAt');
    expect(safe).toEqual({
      id: user.id,
      email: user.email,
      username: user.username,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  });
});
