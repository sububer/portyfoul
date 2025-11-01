'use client';

import { Portfolio } from '@/types/portfolio';

interface PortfolioCardProps {
  portfolio: Portfolio;
  onDelete: (id: string) => void;
}

export default function PortfolioCard({ portfolio, onDelete }: PortfolioCardProps) {
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
    }).format(new Date(date));
  };

  return (
    <div className="card portfolio-card">
      <div className="card-header">
        <h2>{portfolio.name}</h2>
        <button
          className="btn btn-danger btn-small"
          onClick={() => onDelete(portfolio.id)}
          title="Delete portfolio"
        >
          Delete
        </button>
      </div>

      {portfolio.description && (
        <p className="portfolio-description">{portfolio.description}</p>
      )}

      <div className="portfolio-stats">
        <div className="stat">
          <span className="stat-label">Total Value</span>
          <span className="stat-value">
            {portfolio.totalValue ? formatCurrency(portfolio.totalValue) : 'N/A'}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Assets</span>
          <span className="stat-value">{portfolio.assets.length}</span>
        </div>
      </div>

      <div className="asset-list">
        <h3>Holdings</h3>
        {portfolio.assets.length === 0 ? (
          <p className="text-muted">No assets in this portfolio</p>
        ) : (
          <ul>
            {portfolio.assets.map((asset) => (
              <li key={asset.id} className="asset-item">
                <div className="asset-info">
                  <span className="asset-name">
                    {asset.symbol} - {asset.name}
                  </span>
                  <span className="asset-badge">{asset.type}</span>
                </div>
                <div className="asset-details">
                  <span>Quantity: {asset.quantity}</span>
                  {asset.currentPrice && (
                    <span>
                      {formatCurrency(asset.currentPrice)} × {asset.quantity} ={' '}
                      {formatCurrency(asset.currentPrice * asset.quantity)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-footer">
        <span className="text-muted">Created {formatDate(portfolio.createdAt)}</span>
      </div>
    </div>
  );
}
