'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail(''); // Clear form
      } else {
        setError(data.details || data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#D1FAE5',
            border: '1px solid #10B981',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#065F46', marginBottom: '0.5rem' }}>
            Check Your Email
          </div>
          <div style={{ color: '#047857', fontSize: '0.875rem' }}>
            If an account exists with this email address, you will receive a password reset link shortly.
          </div>
        </div>
        <Link
          href="/login"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#4F46E5',
            textDecoration: 'underline',
          }}
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1rem', color: '#1F2937' }}>Reset Your Password</h2>
      <p style={{ marginBottom: '1.5rem', color: '#6B7280', fontSize: '0.875rem' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit}>
        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #DC2626',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#991B1B',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: loading ? '#9CA3AF' : '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '1rem',
          }}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          <Link href="/login" style={{ color: '#4F46E5', textDecoration: 'underline' }}>
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
