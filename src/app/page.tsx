'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthForms from '@/components/AuthForms';

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <h1>Portyfoul</h1>
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  // Show auth forms if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', marginBottom: '2rem', marginTop: '2rem' }}>
          <h1>Portyfoul</h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
            Stock and Crypto Portfolio Manager
          </p>
        </div>
        <AuthForms />
      </main>
    );
  }

  // Show welcome message if authenticated
  return (
    <main className="container">
      <h1>Welcome back, {user?.username}!</h1>
      <p>Stock and Crypto Portfolio Manager</p>
      <div className="card">
        <h2>Your Dashboard</h2>
        <p>Manage your investment portfolios with ease. Track stocks and cryptocurrencies in one place.</p>

        <h3>Features</h3>
        <ul>
          <li>Create and manage multiple portfolios</li>
          <li>Track stocks and cryptocurrencies</li>
          <li>Monitor portfolio values in real-time</li>
          <li>View detailed asset breakdowns</li>
        </ul>

        <div className="nav-links">
          <Link href="/portfolios">View My Portfolios</Link>
        </div>
      </div>
    </main>
  );
}
