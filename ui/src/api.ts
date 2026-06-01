import type { AssetType, BrandingSettings, BrandingSettingsPayload, CashFlowItem, CashFlowPayload, HistoryPoint, Holding, HoldingPayload, MortgageEstimateResponse, MortgageProfile, Quotes, RecurringCashFlow, Snapshot } from './types';

const API_URL = '/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchHoldings(): Promise<Holding[]> {
  return json<Holding[]>(await fetch(`${API_URL}/holdings`));
}

export async function saveHolding(payload: HoldingPayload): Promise<Holding> {
  return json<Holding>(await fetch(`${API_URL}/holdings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

export async function deleteHolding(ticker: string, account: string): Promise<boolean> {
  if (!confirm(`Remove ${ticker} lot from ${account}?`)) return false;
  const res = await fetch(`${API_URL}/holdings/${ticker}?account=${encodeURIComponent(account)}`, { method: 'DELETE' });
  return res.ok;
}

export async function updateTickerAssetType(ticker: string, assetType: AssetType): Promise<{ ticker: string; asset_type: AssetType }> {
  return json<{ ticker: string; asset_type: AssetType }>(await fetch(`${API_URL}/asset-types/${ticker}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asset_type: assetType })
  }));
}

export async function fetchHistory(): Promise<HistoryPoint[]> {
  return json<HistoryPoint[]>(await fetch(`${API_URL}/history`));
}

export async function fetchSnapshots(): Promise<Snapshot[]> {
  return json<Snapshot[]>(await fetch(`${API_URL}/snapshots`));
}

export async function fetchQuotes(tickers: string[]): Promise<Quotes> {
  return json<Quotes>(await fetch(`${API_URL}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers })
  }));
}

export async function fetchBrandingSettings(): Promise<BrandingSettings> {
  return json<BrandingSettings>(await fetch(`${API_URL}/settings/branding`));
}

export async function saveBrandingSettings(payload: BrandingSettingsPayload): Promise<BrandingSettings> {
  return json<BrandingSettings>(await fetch(`${API_URL}/settings/branding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

export function triggerSync(): Promise<Response> {
  return fetch(`${API_URL}/sync`);
}

export function saveSnapshot(overwrite = false): Promise<Response> {
  return fetch(`${API_URL}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overwrite })
  });
}

export async function fetchCashFlowItems(): Promise<CashFlowItem[]> {
  return json<CashFlowItem[]>(await fetch(`${API_URL}/cash-flow`));
}

export async function fetchRecurringCashFlows(): Promise<RecurringCashFlow[]> {
  return json<RecurringCashFlow[]>(await fetch(`${API_URL}/cash-flow/recurring`));
}

export async function saveCashFlowItem(payload: CashFlowPayload): Promise<CashFlowItem> {
  return json<CashFlowItem>(await fetch(`${API_URL}/cash-flow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}

export async function deleteCashFlowItem(id: number, name: string): Promise<boolean> {
  if (!confirm(`Remove ${name}?`)) return false;
  const res = await fetch(`${API_URL}/cash-flow/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function updateRecurringCashFlowAccount(id: number, cashAccount: string): Promise<RecurringCashFlow> {
  return json<RecurringCashFlow>(await fetch(`${API_URL}/cash-flow/recurring/${id}/cash-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cash_account: cashAccount })
  }));
}

export async function fetchMortgageProfile(): Promise<MortgageProfile> {
  return json<MortgageProfile>(await fetch(`${API_URL}/mortgage`));
}

export async function fetchMortgageEstimate(): Promise<MortgageEstimateResponse> {
  return json<MortgageEstimateResponse>(await fetch(`${API_URL}/mortgage/estimate`));
}

export async function refreshMortgageEstimate(): Promise<MortgageEstimateResponse> {
  return json<MortgageEstimateResponse>(await fetch(`${API_URL}/mortgage/estimate/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true })
  }));
}
