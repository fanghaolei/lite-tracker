import type {
  AccountGroup,
  AssetGroup,
  AssetLot,
  AssetType,
  Holding,
  PortfolioSummary,
  Quote,
  Quotes,
  SortDir
} from './types';

export const ASSET_TYPES: AssetType[] = ['stock', 'fund', 'cash equivalents', 'crypto', 'other'];
export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  stock: '🌿',
  fund: '🌳',
  'cash equivalents': '🪙',
  crypto: '⚡',
  other: '💎'
};

export function normalizeAssetType(holding: Pick<Holding, 'ticker' | 'asset_type' | 'is_manual'>): AssetType {
  if (holding.ticker === 'CASH') return 'cash equivalents';
  const rawType = String(holding.asset_type || '').toLowerCase();
  if (ASSET_TYPES.includes(rawType as AssetType)) return rawType as AssetType;
  return holding.is_manual ? 'other' : 'stock';
}

export function formatAssetType(type: AssetType | string | undefined): string {
  const normalized = (type || 'other').toLowerCase();
  return normalized.replace(/\b\w/g, char => char.toUpperCase());
}

export function getAssetTypeIcon(type: AssetType | string | undefined): string {
  const normalized = String(type || 'other').toLowerCase() as AssetType;
  return ASSET_TYPE_ICONS[normalized] || ASSET_TYPE_ICONS.other;
}

export function formatAssetTypeWithIcon(type: AssetType | string | undefined): string {
  return `${getAssetTypeIcon(type)} ${formatAssetType(type)}`;
}

export function money(value: number, digits = 2): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}

export function wholeMoney(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function signedMoney(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${money(value, digits)}`;
}

export function signedPct(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function getQuoteTickers(holdings: Holding[]): string[] {
  return [...new Set(holdings
    .filter(h => h.ticker !== 'CASH' && !h.is_manual)
    .map(h => h.ticker))];
}

export function getHoldingQuote(holding: Holding, quotes: Quotes): Quote {
  if (holding.ticker === 'CASH') return { price: 1, prev_close: 1 };
  if (holding.is_manual) {
    const price = Number(holding.manual_price) || 0;
    return { price, prev_close: price, manual: true };
  }
  return quotes[holding.ticker] || { price: 0, prev_close: 0 };
}

export function getHoldingMarketValue(holding: Holding, quotes: Quotes): number {
  return holding.shares * getHoldingQuote(holding, quotes).price;
}

export function calculateSummary(holdings: Holding[], quotes: Quotes): PortfolioSummary {
  const cashVal = holdings.filter(h => h.ticker === 'CASH').reduce((sum, h) => sum + h.shares, 0);
  const assets = holdings.filter(h => h.ticker !== 'CASH');
  const totalCost = assets.reduce((sum, h) => sum + h.shares * h.average_cost, 0);
  const marketVal = assets.reduce((sum, h) => sum + getHoldingMarketValue(h, quotes), 0);
  const dailyPnl = assets.reduce((sum, h) => {
    const quote = getHoldingQuote(h, quotes);
    return quote.prev_close > 0 ? sum + h.shares * (quote.price - quote.prev_close) : sum;
  }, 0);
  const totalValue = marketVal + cashVal;
  const previousValue = totalValue - dailyPnl;
  const profit = marketVal - totalCost;
  return {
    totalValue,
    cashVal,
    profit,
    profitPercent: totalCost > 0 ? (profit / totalCost) * 100 : 0,
    dailyPnl,
    dailyPercent: previousValue > 0 ? (dailyPnl / previousValue) * 100 : 0
  };
}

export function getPalette(): string[] {
  return [
    '#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#a78bfa',
    '#fb7185', '#22d3ee', '#c084fc', '#f97316', '#84cc16'
  ];
}

export function getAccountAllocations(holdings: Holding[], quotes: Quotes): { account: string; value: number }[] {
  const accounts: Record<string, number> = {};
  holdings.forEach(holding => {
    const account = holding.account || 'Default';
    accounts[account] = (accounts[account] || 0) + getHoldingMarketValue(holding, quotes);
  });
  return Object.entries(accounts)
    .map(([account, value]) => ({ account, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function sortData<T>(data: T[], key: keyof T, dir: SortDir): T[] {
  return [...data].sort((a, b) => {
    const left = normalizeSortValue(a[key]);
    const right = normalizeSortValue(b[key]);
    if (left < right) return -1 * dir;
    if (left > right) return 1 * dir;
    return 0;
  });
}

function normalizeSortValue(value: unknown): string | number {
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return value;
  return 0;
}

export function buildAssetLot(holding: Holding, quotes: Quotes): AssetLot {
  const quote = getHoldingQuote(holding, quotes);
  const marketValue = holding.shares * quote.price;
  const costBasis = holding.ticker === 'CASH' ? holding.shares : holding.shares * holding.average_cost;
  return {
    ...holding,
    live: quote.price,
    prev_close: quote.prev_close,
    market_value: marketValue,
    daily_pnl: quote.prev_close > 0 ? holding.shares * (quote.price - quote.prev_close) : 0,
    pnl: marketValue - costBasis
  };
}

export function buildAssetGroups(holdings: Holding[], quotes: Quotes): { groups: AssetGroup[]; cashHoldings: Holding[]; totalValue: number } {
  const cashHoldings = holdings.filter(h => h.ticker === 'CASH');
  const totalValue = holdings.reduce((sum, h) => sum + getHoldingMarketValue(h, quotes), 0);
  const groups: Record<string, Omit<AssetGroup, 'asset_type' | 'average_cost' | 'live' | 'prev_close' | 'daily_percent' | 'percent' | 'pnl' | 'pnl_percent'>> = {};

  holdings.filter(h => h.ticker !== 'CASH').forEach(holding => {
    const lot = buildAssetLot(holding, quotes);
    groups[holding.ticker] ||= {
      ticker: holding.ticker,
      lots: [],
      shares: 0,
      cost_basis: 0,
      daily_pnl: 0,
      market_value: 0
    };
    groups[holding.ticker].lots.push(lot);
    groups[holding.ticker].shares += holding.shares;
    groups[holding.ticker].cost_basis += holding.shares * holding.average_cost;
    groups[holding.ticker].market_value += lot.market_value;
    groups[holding.ticker].daily_pnl += lot.daily_pnl;
  });

  return {
    cashHoldings,
    totalValue,
    groups: Object.values(groups).map(group => {
      const averageCost = group.shares > 0 ? group.cost_basis / group.shares : 0;
      const live = group.shares > 0 ? group.market_value / group.shares : 0;
      const prevClose = group.shares > 0 ? live - group.daily_pnl / group.shares : 0;
      const assetType = normalizeAssetType(group.lots[0]);
      return {
        ...group,
        asset_type: assetType,
        average_cost: averageCost,
        live,
        prev_close: prevClose,
        daily_percent: prevClose > 0 ? ((live - prevClose) / prevClose) * 100 : 0,
        percent: totalValue > 0 ? (group.market_value / totalValue) * 100 : 0,
        pnl: group.market_value - group.cost_basis,
        pnl_percent: averageCost > 0 ? ((live - averageCost) / averageCost) * 100 : 0
      };
    })
  };
}

export function buildAccountGroups(holdings: Holding[], quotes: Quotes): AccountGroup[] {
  const totalValue = holdings.reduce((sum, h) => sum + getHoldingMarketValue(h, quotes), 0);
  const groups: Record<string, Omit<AccountGroup, 'percent' | 'pnl' | 'pnl_percent'>> = {};
  holdings.forEach(holding => {
    const account = holding.account || 'Default';
    const lot = buildAssetLot(holding, quotes);
    const costBasis = holding.ticker === 'CASH' ? holding.shares : holding.shares * holding.average_cost;
    groups[account] ||= { account, lots: [], cost_basis: 0, daily_pnl: 0, market_value: 0 };
    groups[account].lots.push(lot);
    groups[account].cost_basis += costBasis;
    groups[account].market_value += lot.market_value;
    groups[account].daily_pnl += lot.daily_pnl;
  });
  return Object.values(groups).map(group => ({
    ...group,
    percent: totalValue > 0 ? (group.market_value / totalValue) * 100 : 0,
    pnl: group.market_value - group.cost_basis,
    pnl_percent: group.cost_basis > 0 ? ((group.market_value - group.cost_basis) / group.cost_basis) * 100 : 0
  }));
}
