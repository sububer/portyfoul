'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type AuthTab = 'login' | 'register';

export default function AuthForms() {
  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const router = useRouter();

  const handleAuthSuccess = () => {
    // Redirect to portfolios page after successful auth
    router.push('/portfolios');
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '2rem auto' }}>
      <div className="card-header">
        <h2 style={{ margin: 0 }}>Welcome to Portyfoul</h2>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #e5e7eb',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('login')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'login' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'login' ? '#3b82f6' : '#6b7280',
            fontWeight: activeTab === 'login' ? '600' : '400',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px',
          }}
          aria-selected={activeTab === 'login'}
          role="tab"
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'register' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'register' ? '#3b82f6' : '#6b7280',
            fontWeight: activeTab === 'register' ? '600' : '400',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '-2px',
          }}
          aria-selected={activeTab === 'register'}
          role="tab"
        >
          Create Account
        </button>
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 'login' ? (
          <div>
            <LoginForm onSuccess={handleAuthSuccess} />
            <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                Create one
              </button>
            </p>
          </div>
        ) : (
          <div>
            <RegisterForm onSuccess={handleAuthSuccess} />
            <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                Log in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
