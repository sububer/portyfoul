import { validatePassword, validateEmail, validateUsername } from '../validation';

describe('validatePassword', () => {
  describe('valid passwords', () => {
    it('should accept password with 8 chars, 1 number, and 1 special char', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with multiple numbers and special characters', () => {
      const result = validatePassword('MyP@ssw0rd123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with various special characters', () => {
      const passwords = [
        'Test123!',
        'Test123@',
        'Test123#',
        'Test123$',
        'Test123%',
        'Test123^',
        'Test123&',
        'Test123*',
        'Test123(',
        'Test123)',
        'Test123_',
        'Test123+',
        'Test123-',
        'Test123=',
        'Test123[',
        'Test123]',
        'Test123{',
        'Test123}',
        'Test123|',
        'Test123;',
        'Test123:',
        'Test123,',
        'Test123.',
        'Test123<',
        'Test123>',
        'Test123?'
      ];

      passwords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept long passwords', () => {
      const result = validatePassword('ThisIsAVeryLongPassword123!WithManyCharacters');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid passwords', () => {
    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Pass1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without a number', () => {
      const result = validatePassword('Password!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without a special character', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    });

    it('should reject empty password with all errors', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
    });

    it('should reject password with only letters', () => {
      const result = validatePassword('JustLetters');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should return multiple errors for multiple violations', () => {
      const result = validatePassword('short');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('edge cases', () => {
    it('should handle password with exactly 8 characters', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
    });

    it('should handle password with spaces', () => {
      const result = validatePassword('Pass 123!');
      expect(result.isValid).toBe(true);
    });

    it('should handle password with unicode characters', () => {
      const result = validatePassword('Pàss123!');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email format', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(validateEmail('user@mail.example.com')).toBe(true);
    });

    it('should accept email with plus sign', () => {
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      expect(validateEmail('first.last@example.com')).toBe(true);
    });

    it('should accept email with numbers', () => {
      expect(validateEmail('user123@example456.com')).toBe(true);
    });

    it('should accept email with hyphens in domain', () => {
      expect(validateEmail('user@my-domain.com')).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject email without @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('should reject email without TLD', () => {
      expect(validateEmail('user@example')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@ example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });

    it('should reject email with multiple @ symbols', () => {
      expect(validateEmail('user@@example.com')).toBe(false);
    });
  });
});

describe('validateUsername', () => {
  describe('valid usernames', () => {
    it('should accept simple username', () => {
      const result = validateUsername('john');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept username with numbers', () => {
      const result = validateUsername('user123');
      expect(result.isValid).toBe(true);
    });

    it('should accept username with underscores', () => {
      const result = validateUsername('user_name');
      expect(result.isValid).toBe(true);
    });

    it('should accept username with hyphens', () => {
      const result = validateUsername('user-name');
      expect(result.isValid).toBe(true);
    });

    it('should accept username starting with number', () => {
      const result = validateUsername('123user');
      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 3 characters', () => {
      const result = validateUsername('abc');
      expect(result.isValid).toBe(true);
    });

    it('should accept exactly 50 characters', () => {
      const result = validateUsername('a'.repeat(50));
      expect(result.isValid).toBe(true);
    });

    it('should accept mixed case', () => {
      const result = validateUsername('JohnDoe123');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid usernames', () => {
    it('should reject username shorter than 3 characters', () => {
      const result = validateUsername('ab');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be between 3 and 50 characters');
    });

    it('should reject username longer than 50 characters', () => {
      const result = validateUsername('a'.repeat(51));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be between 3 and 50 characters');
    });

    it('should reject username starting with underscore', () => {
      const result = validateUsername('_username');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must start with a letter or number');
    });

    it('should reject username starting with hyphen', () => {
      const result = validateUsername('-username');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must start with a letter or number');
    });

    it('should reject username with spaces', () => {
      const result = validateUsername('user name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should reject username with special characters', () => {
      const result = validateUsername('user@name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should reject username with periods', () => {
      const result = validateUsername('user.name');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should reject empty username', () => {
      const result = validateUsername('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Username must be between 3 and 50 characters');
    });
  });
});
