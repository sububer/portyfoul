'use client';

import Link from 'next/link';
import { PortfolioWithValues } from '@/types/api';

interface PortfolioCardProps {
  portfolio: PortfolioWithValues;
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
            {formatCurrency(portfolio.totalValue)}
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Holdings</span>
          <span className="stat-value">{portfolio.holdings.length}</span>
        </div>
      </div>

      <div className="asset-list">
        <h3>Holdings</h3>
        {portfolio.holdings.length === 0 ? (
          <p className="text-muted">No holdings in this portfolio</p>
        ) : (
          <ul>
            {portfolio.holdings.map((holding) => (
              <li key={holding.assetSymbol} className="asset-item">
                <div className="asset-info">
                  <span className="asset-name">
                    {holding.asset.symbol} - {holding.asset.name}
                  </span>
                  <span className="asset-badge">{holding.asset.type}</span>
                </div>
                <div className="asset-details">
                  <span>Quantity: {holding.quantity}</span>
                  <span>
                    {formatCurrency(holding.asset.currentPrice)} × {holding.quantity} ={' '}
                    {formatCurrency(holding.totalValue)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-footer">
        <span className="text-muted">Created {formatDate(portfolio.createdAt)}</span>
        <Link href={`/portfolios/${portfolio.id}`} className="btn btn-primary btn-small">
          View Details
        </Link>
      </div>
    </div>
  );
}
