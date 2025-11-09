'use client';

import { useState, useEffect } from 'react';
import { PortfolioWithValues, CreatePortfolioRequest, ApiResponse } from '@/types/api';
import PortfolioList from '@/components/PortfolioList';
import CreatePortfolioForm from '@/components/CreatePortfolioForm';

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<PortfolioWithValues[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch portfolios from API
  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/portfolios');
      const result: ApiResponse<PortfolioWithValues[]> = await response.json();

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setPortfolios(result.data);
      }
    } catch (err) {
      setError('Failed to load portfolios');
      console.error('Error fetching portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load portfolios on mount
  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleCreatePortfolio = async (request: CreatePortfolioRequest) => {
    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: ApiResponse<PortfolioWithValues> = await response.json();

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setPortfolios([...portfolios, result.data]);
        setShowCreateForm(false);
      }
    } catch (err) {
      setError('Failed to create portfolio');
      console.error('Error creating portfolio:', err);
    }
  };

  const handleDeletePortfolio = async (id: string) => {
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'DELETE',
      });

      const result: ApiResponse<{ success: boolean }> = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setPortfolios(portfolios.filter(p => p.id !== id));
      }
    } catch (err) {
      setError('Failed to delete portfolio');
      console.error('Error deleting portfolio:', err);
    }
  };

  return (
    <main className="container">
      <div className="page-header">
        <h1>My Portfolios</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Portfolio'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="btn btn-small" onClick={fetchPortfolios}>
            Retry
          </button>
        </div>
      )}

      {showCreateForm && (
        <CreatePortfolioForm
          onSubmit={handleCreatePortfolio}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {loading ? (
        <div className="loading-state">Loading portfolios...</div>
      ) : (
        <PortfolioList
          portfolios={portfolios}
          onDelete={handleDeletePortfolio}
        />
      )}
    </main>
  );
}
