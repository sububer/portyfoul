'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function VerificationBanner() {
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is not logged in, already verified, or banner is dismissed
  if (!user || user.emailVerified || isDismissed) {
    return null;
  }

  const handleResend = async () => {
    try {
      setIsResending(true);
      setMessage('');

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setMessage(data.details || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setMessage('Failed to send verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FEF3C7',
        borderLeft: '4px solid #F59E0B',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', color: '#92400E', marginBottom: '0.25rem' }}>
          Please verify your email address
        </div>
        <div style={{ color: '#78350F', fontSize: '0.875rem' }}>
          Check your inbox for a verification link, or{' '}
          <button
            onClick={handleResend}
            disabled={isResending}
            style={{
              background: 'none',
              border: 'none',
              color: '#D97706',
              textDecoration: 'underline',
              cursor: isResending ? 'not-allowed' : 'pointer',
              padding: 0,
              font: 'inherit',
              opacity: isResending ? 0.6 : 1,
            }}
          >
            {isResending ? 'Sending...' : 'resend verification email'}
          </button>
        </div>
        {message && (
          <div
            style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: message.includes('sent') ? '#065F46' : '#991B1B',
            }}
          >
            {message}
          </div>
        )}
      </div>
      <button
        onClick={() => setIsDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: '#92400E',
          fontSize: '1.25rem',
          cursor: 'pointer',
          padding: '0 0.5rem',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
