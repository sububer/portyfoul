'use client';

import { useState } from 'react';
import { CreatePortfolioRequest, AssetType, Holding, CreateAssetRequest, ApiResponse, Asset } from '@/types/api';

interface CreatePortfolioFormProps {
  onSubmit: (request: CreatePortfolioRequest) => void;
  onCancel: () => void;
}

interface PendingHolding {
  id: string; // Temporary ID for UI
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  quantity: number;
  currentPrice?: number;
}

export default function CreatePortfolioForm({ onSubmit, onCancel }: CreatePortfolioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [holdings, setHoldings] = useState<PendingHolding[]>([]);
  const [showAssetForm, setShowAssetForm] = useState(false);

  // Asset form state
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetPrice, setAssetPrice] = useState('');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName || !assetSymbol || !assetQuantity || !assetPrice) return;

    const newHolding: PendingHolding = {
      id: `holding-${Date.now()}`,
      assetSymbol: assetSymbol.toUpperCase(),
      assetName: assetName,
      assetType: assetType,
      quantity: parseFloat(assetQuantity),
      currentPrice: parseFloat(assetPrice),
    };

    setHoldings([...holdings, newHolding]);

    // Reset asset form
    setAssetName('');
    setAssetSymbol('');
    setAssetQuantity('');
    setAssetPrice('');
    setShowAssetForm(false);
  };

  const handleRemoveAsset = (id: string) => {
    setHoldings(holdings.filter(h => h.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) return;

    // Register any new assets with the asset store
    for (const holding of holdings) {
      try {
        // Check if asset exists
        const checkResponse = await fetch(`/api/assets/${holding.assetSymbol}`);

        if (checkResponse.status === 404) {
          // Asset doesn't exist, register it
          const createAssetRequest: CreateAssetRequest = {
            symbol: holding.assetSymbol,
            name: holding.assetName,
            type: holding.assetType,
            currentPrice: holding.currentPrice || 0,
          };

          await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(createAssetRequest),
          });
        }
      } catch (error) {
        console.error('Error registering asset:', error);
      }
    }

    // Create portfolio request with holdings
    const request: CreatePortfolioRequest = {
      name,
      description,
      holdings: holdings.map(h => ({
        assetSymbol: h.assetSymbol,
        quantity: h.quantity,
      })),
    };

    onSubmit(request);
  };

  return (
    <div className="card form-card">
      <h2>Create New Portfolio</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Portfolio Name *</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tech Stocks, Crypto Portfolio"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of your portfolio"
            rows={3}
          />
        </div>

        <div className="assets-section">
          <div className="section-header">
            <h3>Assets ({holdings.length})</h3>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setShowAssetForm(!showAssetForm)}
            >
              {showAssetForm ? 'Cancel' : 'Add Asset'}
            </button>
          </div>

          {showAssetForm && (
            <div className="asset-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="assetType">Type</label>
                  <select
                    id="assetType"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                  >
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="assetSymbol">Symbol *</label>
                  <input
                    type="text"
                    id="assetSymbol"
                    value={assetSymbol}
                    onChange={(e) => setAssetSymbol(e.target.value)}
                    placeholder="AAPL, BTC"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="assetName">Asset Name *</label>
                <input
                  type="text"
                  id="assetName"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Apple Inc., Bitcoin"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="assetQuantity">Quantity *</label>
                  <input
                    type="number"
                    id="assetQuantity"
                    value={assetQuantity}
                    onChange={(e) => setAssetQuantity(e.target.value)}
                    placeholder="10"
                    step="0.0001"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="assetPrice">Current Price *</label>
                  <input
                    type="number"
                    id="assetPrice"
                    value={assetPrice}
                    onChange={(e) => setAssetPrice(e.target.value)}
                    placeholder="178.50"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddAsset}
              >
                Add Asset
              </button>
            </div>
          )}

          {holdings.length > 0 && (
            <ul className="asset-preview-list">
              {holdings.map((holding) => (
                <li key={holding.id} className="asset-preview-item">
                  <div>
                    <strong>{holding.assetSymbol}</strong> - {holding.assetName}
                    <span className="asset-badge">{holding.assetType}</span>
                  </div>
                  <div>
                    Qty: {holding.quantity}
                    {holding.currentPrice && ` @ $${holding.currentPrice}`}
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemoveAsset(holding.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Create Portfolio
          </button>
        </div>
      </form>
    </div>
  );
}
