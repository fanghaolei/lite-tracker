import { ASSET_TYPES, formatAssetType } from '../finance';
import type { AssetGroup, AssetType } from '../types';

export type PortfolioFormState = {
  ticker: string;
  asset_type: AssetType;
  account: string;
  shares: string;
  average_cost: string;
  is_manual: boolean;
  manual_price: string;
};

export const emptyPortfolioForm: PortfolioFormState = {
  ticker: '',
  asset_type: 'stock',
  account: '',
  shares: '',
  average_cost: '',
  is_manual: false,
  manual_price: ''
};

export const portfolioIcons = {
  asset: String.fromCodePoint(0x1F33F),
  size: String.fromCodePoint(0x1F4DD),
  today: String.fromCodePoint(0x1F4C8),
  daily: String.fromCodePoint(0x1F331),
  worth: String.fromCodePoint(0x1F4B5),
  total: String.fromCodePoint(0x1FA99),
  cash: String.fromCodePoint(0x1FA99),
  account: String.fromCodePoint(0x1F9ED),
  diamond: String.fromCodePoint(0x1F48E),
  bank: String.fromCodePoint(0x1F3E6)
};

export function normalizeFormAssetType(ticker: string, assetType: AssetType, isManual: boolean): AssetType {
  if (ticker.toUpperCase() === 'CASH') return 'cash equivalents';
  return assetType || (isManual ? 'other' : 'stock');
}

export function saveErrorMessage(error: unknown) {
  return error instanceof Error ? `Save failed: ${error.message}` : 'Save failed.';
}

export function groupByAssetType(groups: AssetGroup[]) {
  return ASSET_TYPES
    .map(type => ({ type, groups: groups.filter(group => group.asset_type === type) }))
    .filter(section => section.groups.length > 0);
}

export function buildPortfolioPieAllocations(groups: AssetGroup[], cashValue: number, mode: 'ticker' | 'type') {
  if (mode === 'type') {
    const valuesByType = ASSET_TYPES.reduce<Record<AssetType, number>>((acc, type) => {
      acc[type] = type === 'cash equivalents' ? cashValue : 0;
      return acc;
    }, {} as Record<AssetType, number>);
    groups.forEach(group => {
      valuesByType[group.asset_type] = (valuesByType[group.asset_type] || 0) + group.market_value;
    });
    return ASSET_TYPES
      .map(type => ({ label: formatAssetType(type), asset_type: type, value: valuesByType[type] || 0 }))
      .filter(item => item.value > 0);
  }

  const allocations = groups.map(group => ({ label: group.ticker, asset_type: group.asset_type, value: group.market_value }));
  if (cashValue > 0) allocations.push({ label: 'CASH', asset_type: 'cash equivalents', value: cashValue });
  return allocations.filter(item => item.value > 0).sort((a, b) => b.value - a.value);
}
