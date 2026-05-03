import { AssetType } from '@/types/api';

export const CRYPTO_DECIMALS = 8;
export const STOCK_DECIMALS = 4;

const MAX_QUANTITY = 1e12;

export function decimalsForType(type: AssetType): number {
  return type === 'crypto' ? CRYPTO_DECIMALS : STOCK_DECIMALS;
}

export function quantityStep(type: AssetType): string {
  return type === 'crypto' ? '0.00000001' : '0.0001';
}

export function formatQuantity(value: number, type: AssetType): string {
  const decimals = decimalsForType(type);
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
    useGrouping: false,
  }).format(value);
}

export function isValidQuantity(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_QUANTITY
  );
}
