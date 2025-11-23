'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');

    if (!tokenParam) {
      setError('No reset token provided');
      return;
    }

    setToken(tokenParam);
  }, [searchParams]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '500px',
        }}
      >
        {error ? (
          <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#DC2626' }}>✕</div>
            <h2 style={{ marginBottom: '1rem', color: '#1F2937' }}>Invalid Reset Link</h2>
            <p style={{ marginBottom: '1.5rem', color: '#6B7280', fontSize: '0.875rem' }}>
              {error}. The reset link may be invalid or expired.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/forgot-password"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#4F46E5',
                  color: 'white',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '500',
                }}
              >
                Request New Link
              </Link>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div style={{ textAlign: 'center', color: '#6B7280' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
