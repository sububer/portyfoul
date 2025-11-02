'use client';

import { useState } from 'react';
import {
  PortfolioWithValues,
  UpdatePortfolioRequest,
  AssetType,
  Holding,
  CreateAssetRequest,
  ApiResponse
} from '@/types/api';

interface EditPortfolioFormProps {
  portfolio: PortfolioWithValues;
  onSubmit: (request: UpdatePortfolioRequest) => void;
  onCancel: () => void;
}

interface EditableHolding {
  assetSymbol: string;
  assetName: string;
  assetType: AssetType;
  quantity: number;
  currentPrice: number;
  isExisting: boolean; // true if it was already in the portfolio
  isModified: boolean; // true if quantity changed
}

export default function EditPortfolioForm({ portfolio, onSubmit, onCancel }: EditPortfolioFormProps) {
  const [name, setName] = useState(portfolio.name);
  const [description, setDescription] = useState(portfolio.description || '');

  // Convert existing holdings to editable format
  const initialHoldings: EditableHolding[] = portfolio.holdings.map(h => ({
    assetSymbol: h.asset.symbol,
    assetName: h.asset.name,
    assetType: h.asset.type,
    quantity: h.quantity,
    currentPrice: h.asset.currentPrice,
    isExisting: true,
    isModified: false,
  }));

  const [holdings, setHoldings] = useState<EditableHolding[]>(initialHoldings);
  const [showAssetForm, setShowAssetForm] = useState(false);

  // New asset form state
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetPrice, setAssetPrice] = useState('');

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName || !assetSymbol || !assetQuantity || !assetPrice) return;

    const symbol = assetSymbol.toUpperCase();

    // Check if asset already exists in holdings
    const existingIndex = holdings.findIndex(h => h.assetSymbol === symbol);
    if (existingIndex >= 0) {
      // Update existing holding
      const updated = [...holdings];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + parseFloat(assetQuantity),
        isModified: true,
      };
      setHoldings(updated);
    } else {
      // Add new holding
      const newHolding: EditableHolding = {
        assetSymbol: symbol,
        assetName: assetName,
        assetType: assetType,
        quantity: parseFloat(assetQuantity),
        currentPrice: parseFloat(assetPrice),
        isExisting: false,
        isModified: false,
      };
      setHoldings([...holdings, newHolding]);
    }

    // Reset form
    setAssetName('');
    setAssetSymbol('');
    setAssetQuantity('');
    setAssetPrice('');
    setShowAssetForm(false);
  };

  const handleUpdateQuantity = (symbol: string, newQuantity: string) => {
    const quantity = parseFloat(newQuantity) || 0;
    const updated = holdings.map(h =>
      h.assetSymbol === symbol
        ? { ...h, quantity, isModified: true }
        : h
    );
    setHoldings(updated);
  };

  const handleRemoveHolding = (symbol: string) => {
    setHoldings(holdings.filter(h => h.assetSymbol !== symbol));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Register any new assets with the asset store
    for (const holding of holdings) {
      if (!holding.isExisting) {
        try {
          // Check if asset exists
          const checkResponse = await fetch(`/api/assets/${holding.assetSymbol}`);

          if (checkResponse.status === 404) {
            // Asset doesn't exist, register it
            const createAssetRequest: CreateAssetRequest = {
              symbol: holding.assetSymbol,
              name: holding.assetName,
              type: holding.assetType,
              currentPrice: holding.currentPrice,
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
    }

    // Filter out holdings with 0 quantity
    const validHoldings = holdings.filter(h => h.quantity > 0);

    // Create update request
    const request: UpdatePortfolioRequest = {
      name: name.trim(),
      description: description.trim(),
      holdings: validHoldings.map(h => ({
        assetSymbol: h.assetSymbol,
        quantity: h.quantity,
      })),
    };

    onSubmit(request);
  };

  return (
    <div className="card form-card">
      <h2>Edit Portfolio</h2>
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
            <h3>Holdings ({holdings.filter(h => h.quantity > 0).length})</h3>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={() => setShowAssetForm(!showAssetForm)}
            >
              {showAssetForm ? 'Cancel' : 'Add Holding'}
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
                Add Holding
              </button>
            </div>
          )}

          {holdings.length > 0 && (
            <div className="holdings-edit-list">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.assetSymbol} className={holding.quantity === 0 ? 'removed' : ''}>
                      <td>
                        <div>
                          <strong>{holding.assetSymbol}</strong>
                          <div className="text-muted">{holding.assetName}</div>
                        </div>
                      </td>
                      <td>
                        <span className="asset-badge">{holding.assetType}</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={holding.quantity}
                          onChange={(e) => handleUpdateQuantity(holding.assetSymbol, e.target.value)}
                          step="0.0001"
                          min="0"
                          className="quantity-input"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => handleRemoveHolding(holding.assetSymbol)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-muted help-text">
                Tip: Set quantity to 0 or click Remove to delete a holding when you save.
              </p>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
