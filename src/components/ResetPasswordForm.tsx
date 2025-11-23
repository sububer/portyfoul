'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.details || data.error || 'Failed to reset password');
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
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#10B981' }}>✓</div>
          <div style={{ fontWeight: 'bold', color: '#065F46', marginBottom: '0.5rem' }}>
            Password Reset Successful
          </div>
          <div style={{ color: '#047857', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Your password has been changed successfully.
          </div>
          <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>
            Redirecting to login page in 3 seconds...
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
          Go to Login Now
        </Link>
      </div>
    );
  }

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: '', color: '', text: '' };
    if (pwd.length < 8) return { strength: 'weak', color: '#DC2626', text: 'Weak' };

    let strength = 0;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

    if (strength <= 1) return { strength: 'weak', color: '#DC2626', text: 'Weak' };
    if (strength === 2) return { strength: 'medium', color: '#F59E0B', text: 'Medium' };
    return { strength: 'strong', color: '#10B981', text: 'Strong' };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1rem', color: '#1F2937' }}>Create New Password</h2>
      <p style={{ marginBottom: '1.5rem', color: '#6B7280', fontSize: '0.875rem' }}>
        Enter a new password for your account. Make sure it's strong and unique.
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
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
            placeholder="Enter new password"
            minLength={8}
          />
          {password && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#6B7280' }}>Password strength: </span>
              <span style={{ color: passwordStrength.color, fontWeight: '500' }}>
                {passwordStrength.text}
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6B7280' }}>
            Must be at least 8 characters with uppercase, lowercase, number, and special character.
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="confirmPassword"
            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '1rem',
            }}
            placeholder="Confirm new password"
          />
          {confirmPassword && password !== confirmPassword && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#DC2626' }}>
              Passwords do not match
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor:
              loading || !password || !confirmPassword || password !== confirmPassword
                ? '#9CA3AF'
                : '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor:
              loading || !password || !confirmPassword || password !== confirmPassword
                ? 'not-allowed'
                : 'pointer',
            marginBottom: '1rem',
          }}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
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
