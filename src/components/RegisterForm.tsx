'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains a number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains a special character', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
];

export default function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    username?: string;
    password?: string;
  }>({});

  const passwordStrength = useMemo(() => {
    const metRequirements = PASSWORD_REQUIREMENTS.filter(req => req.test(password)).length;
    const total = PASSWORD_REQUIREMENTS.length;
    return { met: metRequirements, total };
  }, [password]);

  const validateForm = (): boolean => {
    const errors: { email?: string; username?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!username.trim()) {
      errors.username = 'Username is required';
    } else if (username.length < 3 || username.length > 50) {
      errors.username = 'Username must be 3-50 characters';
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(username)) {
      errors.username = 'Username must start with a letter or number and contain only letters, numbers, underscores, or hyphens';
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/\d/.test(password)) {
      errors.password = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.password = 'Password must contain at least one special character';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await register(email, username, password, website);
      onSuccess?.();
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (validationErrors.email) {
      setValidationErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (validationErrors.username) {
      setValidationErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="register-email">
          Email <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          disabled={loading}
          placeholder="your@email.com"
          autoComplete="email"
          aria-invalid={!!validationErrors.email}
          aria-describedby={validationErrors.email ? 'register-email-error' : undefined}
        />
        {validationErrors.email && (
          <span id="register-email-error" className="error-message" style={{ fontSize: '0.875rem' }}>
            {validationErrors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="register-username">
          Username <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="register-username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          disabled={loading}
          placeholder="username"
          autoComplete="username"
          aria-invalid={!!validationErrors.username}
          aria-describedby={validationErrors.username ? 'register-username-error' : undefined}
        />
        {validationErrors.username && (
          <span id="register-username-error" className="error-message" style={{ fontSize: '0.875rem' }}>
            {validationErrors.username}
          </span>
        )}
        <small style={{ color: '#666', fontSize: '0.875rem' }}>
          3-50 characters, letters, numbers, underscores, or hyphens
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="register-password">
          Password <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          onFocus={() => setShowPasswordRequirements(true)}
          disabled={loading}
          placeholder="Create a strong password"
          autoComplete="new-password"
          aria-invalid={!!validationErrors.password}
          aria-describedby={validationErrors.password ? 'register-password-error' : 'password-requirements'}
        />
        {validationErrors.password && (
          <span id="register-password-error" className="error-message" style={{ fontSize: '0.875rem' }}>
            {validationErrors.password}
          </span>
        )}

        {showPasswordRequirements && (
          <div id="password-requirements" style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ marginBottom: '0.25rem', color: '#666' }}>
              Password strength: {passwordStrength.met}/{passwordStrength.total}
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', listStyle: 'none' }}>
              {PASSWORD_REQUIREMENTS.map((req, idx) => {
                const isMet = req.test(password);
                return (
                  <li
                    key={idx}
                    style={{
                      color: isMet ? '#22c55e' : '#666',
                      transition: 'color 0.2s',
                    }}
                  >
                    <span style={{ marginRight: '0.5rem' }}>
                      {isMet ? '✓' : '○'}
                    </span>
                    {req.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Honeypot field - hidden from humans, may be filled by bots */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
        <label htmlFor="register-website">Website</label>
        <input
          id="register-website"
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
