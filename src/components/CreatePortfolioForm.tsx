'use client';

import { useState } from 'react';
import { Portfolio, Asset, AssetType } from '@/types/portfolio';

interface CreatePortfolioFormProps {
  onSubmit: (portfolio: Portfolio) => void;
  onCancel: () => void;
}

export default function CreatePortfolioForm({ onSubmit, onCancel }: CreatePortfolioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAssetForm, setShowAssetForm] = useState(false);

  // Asset form state
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [assetQuantity, setAssetQuantity] = useState('');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName || !assetSymbol || !assetQuantity) return;

    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      name: assetName,
      symbol: assetSymbol.toUpperCase(),
      type: assetType,
      quantity: parseFloat(assetQuantity),
    };

    setAssets([...assets, newAsset]);

    // Reset asset form
    setAssetName('');
    setAssetSymbol('');
    setAssetQuantity('');
    setShowAssetForm(false);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) return;

    const newPortfolio: Portfolio = {
      id: `portfolio-${Date.now()}`,
      name,
      description,
      assets,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    onSubmit(newPortfolio);
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
            <h3>Assets ({assets.length})</h3>
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

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddAsset}
              >
                Add Asset
              </button>
            </div>
          )}

          {assets.length > 0 && (
            <ul className="asset-preview-list">
              {assets.map((asset) => (
                <li key={asset.id} className="asset-preview-item">
                  <div>
                    <strong>{asset.symbol}</strong> - {asset.name}
                    <span className="asset-badge">{asset.type}</span>
                  </div>
                  <div>
                    Qty: {asset.quantity}
                    <button
                      type="button"
                      className="btn btn-danger btn-small"
                      onClick={() => handleRemoveAsset(asset.id)}
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
