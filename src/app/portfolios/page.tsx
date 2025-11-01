'use client';

import { useState } from 'react';
import { Portfolio } from '@/types/portfolio';
import PortfolioList from '@/components/PortfolioList';
import CreatePortfolioForm from '@/components/CreatePortfolioForm';

// Dummy data
const initialPortfolios: Portfolio[] = [
  {
    id: '1',
    name: 'Tech Portfolio',
    description: 'My technology stocks',
    assets: [
      {
        id: 'a1',
        name: 'Apple Inc.',
        type: 'stock',
        symbol: 'AAPL',
        quantity: 10,
        currentPrice: 178.50,
      },
      {
        id: 'a2',
        name: 'Microsoft Corporation',
        type: 'stock',
        symbol: 'MSFT',
        quantity: 5,
        currentPrice: 378.91,
      },
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    totalValue: 3679.55,
  },
  {
    id: '2',
    name: 'Crypto Holdings',
    description: 'Cryptocurrency investments',
    assets: [
      {
        id: 'a3',
        name: 'Bitcoin',
        type: 'crypto',
        symbol: 'BTC',
        quantity: 0.5,
        currentPrice: 42000,
      },
      {
        id: 'a4',
        name: 'Ethereum',
        type: 'crypto',
        symbol: 'ETH',
        quantity: 2,
        currentPrice: 2200,
      },
    ],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    totalValue: 25400,
  },
];

export default function PortfoliosPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreatePortfolio = (portfolio: Portfolio) => {
    setPortfolios([...portfolios, portfolio]);
    setShowCreateForm(false);
  };

  const handleDeletePortfolio = (id: string) => {
    setPortfolios(portfolios.filter(p => p.id !== id));
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

      {showCreateForm && (
        <CreatePortfolioForm
          onSubmit={handleCreatePortfolio}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <PortfolioList
        portfolios={portfolios}
        onDelete={handleDeletePortfolio}
      />
    </main>
  );
}
