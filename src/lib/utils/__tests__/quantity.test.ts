import {
  CRYPTO_DECIMALS,
  STOCK_DECIMALS,
  decimalsForType,
  formatQuantity,
  isValidQuantity,
} from '../quantity';

describe('decimalsForType', () => {
  it('returns 8 for crypto', () => {
    expect(decimalsForType('crypto')).toBe(CRYPTO_DECIMALS);
    expect(CRYPTO_DECIMALS).toBe(8);
  });

  it('returns 4 for stock', () => {
    expect(decimalsForType('stock')).toBe(STOCK_DECIMALS);
    expect(STOCK_DECIMALS).toBe(4);
  });
});

describe('formatQuantity', () => {
  it('renders crypto values with up to 8 decimals', () => {
    expect(formatQuantity(1.23456789, 'crypto')).toBe('1.23456789');
  });

  it('rounds crypto values past the 8th decimal', () => {
    expect(formatQuantity(1.234567894, 'crypto')).toBe('1.23456789');
  });

  it('renders the smallest crypto unit without scientific notation', () => {
    expect(formatQuantity(0.00000001, 'crypto')).toBe('0.00000001');
  });

  it('trims trailing zeros for crypto', () => {
    expect(formatQuantity(10, 'crypto')).toBe('10');
    expect(formatQuantity(1.5, 'crypto')).toBe('1.5');
  });

  it('caps stock values at 4 decimals', () => {
    expect(formatQuantity(1.23456, 'stock')).toBe('1.2346');
  });

  it('trims trailing zeros for stock', () => {
    expect(formatQuantity(1.5, 'stock')).toBe('1.5');
    expect(formatQuantity(100, 'stock')).toBe('100');
  });

  it('does not insert thousands separators', () => {
    expect(formatQuantity(1234567, 'crypto')).toBe('1234567');
  });
});

describe('isValidQuantity', () => {
  it('accepts the smallest crypto unit', () => {
    expect(isValidQuantity(0.00000001)).toBe(true);
  });

  it('accepts typical positive values', () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(1e10)).toBe(true);
  });

  it('rejects zero, negative, and non-finite numbers', () => {
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(-1)).toBe(false);
    expect(isValidQuantity(Number.NaN)).toBe(false);
    expect(isValidQuantity(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects non-number types', () => {
    expect(isValidQuantity('5')).toBe(false);
    expect(isValidQuantity(null)).toBe(false);
    expect(isValidQuantity(undefined)).toBe(false);
    expect(isValidQuantity({})).toBe(false);
  });

  it('rejects values that exceed the DECIMAL(20, 8) integer range', () => {
    expect(isValidQuantity(1e13)).toBe(false);
  });
});
