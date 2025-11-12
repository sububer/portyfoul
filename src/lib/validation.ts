/**
 * Validation utilities for user input
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates password according to security requirements:
 * - Minimum 8 characters
 * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
 * - At least 1 number (0-9)
 *
 * @param password - The password to validate
 * @returns Object containing validation result and any error messages
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for at least one special character
  // Special characters: !@#$%^&*()_+-=[]{}|;:,.<>?
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates email format using a basic regex pattern
 *
 * @param email - The email address to validate
 * @returns true if email format is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates username according to requirements:
 * - 3-50 characters
 * - Alphanumeric characters, underscores, and hyphens only
 * - Must start with a letter or number
 *
 * @param username - The username to validate
 * @returns Object containing validation result and any error messages
 */
export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (username.length < 3 || username.length > 50) {
    return {
      isValid: false,
      error: 'Username must be between 3 and 50 characters'
    };
  }

  // Check if username starts with alphanumeric character
  if (!/^[a-zA-Z0-9]/.test(username)) {
    return {
      isValid: false,
      error: 'Username must start with a letter or number'
    };
  }

  // Check if username contains only valid characters
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens'
    };
  }

  return { isValid: true };
}
