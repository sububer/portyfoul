import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  verifyAuthHeader,
  JWTPayload,
  DecodedToken,
} from '../auth';

describe('Password Hashing', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MyPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
    });

    it('should handle unicode characters', async () => {
      const password = 'Pàsswörd123!';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('mypassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'MyPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
    });

    it('should verify password with special characters', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });
  });
});

describe('JWT Token Operations', () => {
  const samplePayload: JWTPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(samplePayload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts separated by dots
    });

    it('should generate different tokens for same payload with time delay', async () => {
      const token1 = generateToken(samplePayload);

      // Add a small delay to ensure different "issued at" timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));

      const token2 = generateToken(samplePayload);

      // Tokens should be different because they have different "issued at" timestamps
      expect(token1).not.toBe(token2);
    });

    it('should encode payload data in token', () => {
      const token = generateToken(samplePayload);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.email).toBe(samplePayload.email);
      expect(decoded.username).toBe(samplePayload.username);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = generateToken(samplePayload);
      const decoded = verifyToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded.userId).toBe(samplePayload.userId);
      expect(decoded.email).toBe(samplePayload.email);
      expect(decoded.username).toBe(samplePayload.username);
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp).toBeTruthy();
    });

    it('should include expiration time in decoded token', () => {
      const token = generateToken(samplePayload);
      const decoded = verifyToken(token);

      expect(decoded.exp).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);

      // Token should expire in approximately 24 hours (86400 seconds)
      const expiresInSeconds = decoded.exp - decoded.iat;
      expect(expiresInSeconds).toBeCloseTo(86400, -2); // Allow some variance
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('not-a-token');
      }).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => {
        verifyToken('');
      }).toThrow();
    });

    it('should throw error for token with wrong signature', () => {
      const token = generateToken(samplePayload);
      const parts = token.split('.');
      // Tamper with the signature
      parts[2] = parts[2].slice(0, -1) + 'X';
      const tamperedToken = parts.join('.');

      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow();
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.signature';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    it('should return null for header without Bearer prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.signature';
      const extracted = extractTokenFromHeader(token);

      expect(extracted).toBeNull();
    });

    it('should return null for null header', () => {
      const extracted = extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    it('should return null for empty string header', () => {
      const extracted = extractTokenFromHeader('');

      expect(extracted).toBeNull();
    });

    it('should return null for header with wrong prefix', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.signature';
      const authHeader = `Basic ${token}`;
      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBeNull();
    });

    it('should return null for malformed header', () => {
      const extracted = extractTokenFromHeader('Bearer');

      expect(extracted).toBeNull();
    });

    it('should handle extra spaces gracefully', () => {
      // The function specifically checks for exactly 2 parts, so extra spaces should fail
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.signature';
      const authHeader = `Bearer  ${token}`; // Extra space
      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBeNull();
    });
  });

  describe('verifyAuthHeader', () => {
    it('should verify and decode token from valid header', () => {
      const token = generateToken(samplePayload);
      const authHeader = `Bearer ${token}`;
      const decoded = verifyAuthHeader(authHeader);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(samplePayload.userId);
      expect(decoded?.email).toBe(samplePayload.email);
      expect(decoded?.username).toBe(samplePayload.username);
    });

    it('should return null for invalid token', () => {
      const authHeader = 'Bearer invalid.token.here';
      const decoded = verifyAuthHeader(authHeader);

      expect(decoded).toBeNull();
    });

    it('should return null for null header', () => {
      const decoded = verifyAuthHeader(null);

      expect(decoded).toBeNull();
    });

    it('should return null for empty header', () => {
      const decoded = verifyAuthHeader('');

      expect(decoded).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = generateToken(samplePayload);
      const decoded = verifyAuthHeader(token);

      expect(decoded).toBeNull();
    });

    it('should return null for header with wrong prefix', () => {
      const token = generateToken(samplePayload);
      const authHeader = `Basic ${token}`;
      const decoded = verifyAuthHeader(authHeader);

      expect(decoded).toBeNull();
    });
  });
});
