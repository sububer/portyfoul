'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
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
      await login(email, password);
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
        <label htmlFor="login-email">
          Email <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          disabled={loading}
          placeholder="your@email.com"
          autoComplete="email"
          aria-invalid={!!validationErrors.email}
          aria-describedby={validationErrors.email ? 'login-email-error' : undefined}
        />
        {validationErrors.email && (
          <span id="login-email-error" className="error-message" style={{ fontSize: '0.875rem' }}>
            {validationErrors.email}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="login-password">
          Password <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          disabled={loading}
          placeholder="Enter your password"
          autoComplete="current-password"
          aria-invalid={!!validationErrors.password}
          aria-describedby={validationErrors.password ? 'login-password-error' : undefined}
        />
        {validationErrors.password && (
          <span id="login-password-error" className="error-message" style={{ fontSize: '0.875rem' }}>
            {validationErrors.password}
          </span>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </div>
    </form>
  );
}
