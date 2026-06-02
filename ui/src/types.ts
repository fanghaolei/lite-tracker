export type Quote = {
  price: number;
  prev_close: number;
  cached?: boolean;
  stale?: boolean;
  manual?: boolean;
};

export type AssetType = 'stock' | 'fund' | 'cash equivalents' | 'crypto' | 'other';

export type Holding = {
  id: number;
  ticker: string;
  asset_type?: AssetType;
  shares: number;
  average_cost: number;
  account: string;
  is_manual?: boolean;
  manual_price?: number | null;
};

export type HoldingPayload = {
  id?: number;
  ticker: string;
  asset_type?: AssetType;
  shares: number;
  average_cost: number;
  account: string;
  is_manual?: boolean;
  manual_price?: number | null;
};

export type HistoryPoint = {
  date: string;
  value: number;
  source?: 'snapshot' | 'backfill';
};

export type Snapshot = {
  id: number;
  date: string;
  total_value: number;
  cash_value: number;
  daily_pnl: number;
  total_pnl: number;
  created_at?: string | null;
};

export type Quotes = Record<string, Quote>;

export type PortfolioSummary = {
  totalValue: number;
  cashVal: number;
  profit: number;
  profitPercent: number;
  dailyPnl: number;
  dailyPercent: number;
};

export type AssetLot = Holding & {
  live: number;
  prev_close: number;
  market_value: number;
  daily_pnl: number;
  pnl: number;
};

export type AssetGroup = {
  ticker: string;
  asset_type: AssetType;
  lots: AssetLot[];
  shares: number;
  cost_basis: number;
  daily_pnl: number;
  market_value: number;
  average_cost: number;
  live: number;
  prev_close: number;
  daily_percent: number;
  percent: number;
  pnl: number;
  pnl_percent: number;
};

export type AccountGroup = {
  account: string;
  lots: AssetLot[];
  cost_basis: number;
  daily_pnl: number;
  market_value: number;
  percent: number;
  pnl: number;
  pnl_percent: number;
};

export type CashFlowItem = {
  id: number;
  name: string;
  category: string;
  flow_type?: 'income' | 'expense';
  cash_account?: string | null;
  amount: number;
  due_date: string;
  is_paid: boolean;
  notes?: string | null;
  created_at?: string | null;
  automatic?: boolean;
};

export type CashFlowPayload = {
  id?: number;
  name: string;
  category: string;
  flow_type?: 'income' | 'expense';
  cash_account?: string | null;
  amount: number;
  due_date: string;
  is_paid?: boolean;
  notes?: string | null;
};

export type RecurringCashFlow = {
  id: number;
  name: string;
  category: string;
  flow_type?: 'income' | 'expense';
  cash_account?: string | null;
  amount: number;
  start_date: string;
  cadence: 'biweekly' | 'monthly-first' | string;
  is_active: boolean;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RecurringCashFlowPayload = {
  id?: number;
  name: string;
  category: string;
  flow_type?: 'income' | 'expense';
  cash_account?: string | null;
  amount: number;
  start_date: string;
  cadence: 'biweekly' | 'monthly-first' | string;
  is_active?: boolean;
  notes?: string | null;
};

export type RecurringCashFlowSkip = {
  id: number;
  recurring_cash_flow_id: number;
  due_date: string;
  created_at?: string | null;
};

export type RecurringCashFlowSkipPayload = {
  recurring_cash_flow_id: number;
  due_date: string;
};

export type MortgageProfile = {
  id: number;
  property_address_line1: string;
  property_address_line2: string;
  principal_balance: number;
  origination_date: string | null;
  maturity_date: string | null;
  original_term_months: number;
  remaining_term_months: number;
  annual_interest_rate: number;
  updated_at?: string | null;
};

export type PropertyEstimate = {
  id: number;
  source: string;
  value: number;
  date: string;
  url: string;
};

export type MortgageEstimateResponse = {
  profile: MortgageProfile | null;
  date: string | null;
  cached?: boolean;
  errors?: { source: string; message: string }[];
  estimates: PropertyEstimate[];
};

export type BrandingSettings = {
  app_name: string;
  portfolio_subtitle: string;
  accounts_subtitle: string;
  cashflow_subtitle: string;
  mortgage_subtitle: string;
};

export type BrandingSettingsPayload = Partial<BrandingSettings>;
