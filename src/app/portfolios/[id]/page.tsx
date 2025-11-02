'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioWithValues, ApiResponse, UpdatePortfolioRequest } from '@/types/api';
import EditPortfolioForm from '@/components/EditPortfolioForm';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function PortfolioDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioWithValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Unwrap params
  useEffect(() => {
    params.then(p => setPortfolioId(p.id));
  }, [params]);

  // Fetch portfolio data
  const fetchPortfolio = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/portfolios/${id}`);
      const result: ApiResponse<PortfolioWithValues> = await response.json();

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setPortfolio(result.data);
      }
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolio(portfolioId);
    }
  }, [portfolioId]);

  const handleUpdate = async (request: UpdatePortfolioRequest) => {
    if (!portfolioId) return;

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result: ApiResponse<PortfolioWithValues> = await response.json();

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setPortfolio(result.data);
        setIsEditing(false);
      }
    } catch (err) {
      setError('Failed to update portfolio');
      console.error('Error updating portfolio:', err);
    }
  };

  const handleDelete = async () => {
    if (!portfolioId || !confirm('Are you sure you want to delete this portfolio?')) return;

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
      });

      const result: ApiResponse<{ success: boolean }> = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        router.push('/portfolios');
      }
    } catch (err) {
      setError('Failed to delete portfolio');
      console.error('Error deleting portfolio:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <main className="container">
        <div className="loading-state">Loading portfolio...</div>
      </main>
    );
  }

  if (error || !portfolio) {
    return (
      <main className="container">
        <div className="error-message">
          {error || 'Portfolio not found'}
          <button className="btn btn-small" onClick={() => router.push('/portfolios')}>
            Back to Portfolios
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="page-header">
        <h1>{portfolio.name}</h1>
        <div className="button-group">
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/portfolios')}
          >
            Back to List
          </button>
          {!isEditing && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => setIsEditing(true)}
              >
                Edit Portfolio
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button className="btn btn-small" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isEditing ? (
        <EditPortfolioForm
          portfolio={portfolio}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <div className="portfolio-detail">
          <div className="card">
            {portfolio.description && (
              <p className="portfolio-description">{portfolio.description}</p>
            )}

            <div className="portfolio-stats">
              <div className="stat">
                <span className="stat-label">Total Value</span>
                <span className="stat-value stat-value-large">
                  {formatCurrency(portfolio.totalValue)}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Holdings</span>
                <span className="stat-value stat-value-large">
                  {portfolio.holdings.length}
                </span>
              </div>
            </div>

            <div className="portfolio-meta">
              <p className="text-muted">Created: {formatDate(portfolio.createdAt)}</p>
              <p className="text-muted">Last updated: {formatDate(portfolio.updatedAt)}</p>
            </div>
          </div>

          <div className="card">
            <h2>Holdings</h2>
            {portfolio.holdings.length === 0 ? (
              <p className="text-muted">No holdings in this portfolio</p>
            ) : (
              <div className="holdings-table">
                <table>
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Type</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((holding) => (
                      <tr key={holding.assetSymbol}>
                        <td>
                          <div>
                            <strong>{holding.asset.symbol}</strong>
                            <div className="text-muted">{holding.asset.name}</div>
                          </div>
                        </td>
                        <td>
                          <span className="asset-badge">{holding.asset.type}</span>
                        </td>
                        <td className="text-right">
                          {formatCurrency(holding.asset.currentPrice)}
                        </td>
                        <td className="text-right">{holding.quantity}</td>
                        <td className="text-right">
                          <strong>{formatCurrency(holding.totalValue)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
