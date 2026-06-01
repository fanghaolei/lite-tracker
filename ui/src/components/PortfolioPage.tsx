import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  deleteHolding,
  fetchHistory,
  fetchHoldings,
  fetchQuotes,
  fetchSnapshots,
  saveHolding,
  saveSnapshot,
  triggerSync,
  updateTickerAssetType
} from '../api';
import { usePrivacyMode, useTheme } from '../hooks';
import {
  ASSET_TYPES,
  buildAssetGroups,
  calculateSummary,
  formatAssetType,
  getAssetTypeIcon,
  getYahooFinanceUrl,
  getQuoteTickers,
  money,
  signedMoney,
  signedPct,
  sortData,
  wholeMoney
} from '../finance';
import type { AssetGroup, AssetType, Holding, HoldingPayload, HistoryPoint, Quotes, Snapshot, SortDir } from '../types';
import { PortfolioAllocationPieChart, PortfolioLineChart } from './Charts';
import { ChevronIcon, EditIcon, PieModeIcon, PlusIcon, TrashIcon } from './Icons';
import { Header } from './Header';

type FormState = {
  ticker: string;
  asset_type: AssetType;
  account: string;
  shares: string;
  average_cost: string;
  is_manual: boolean;
  manual_price: string;
};

const emptyForm: FormState = {
  ticker: '',
  asset_type: 'stock',
  account: '',
  shares: '',
  average_cost: '',
  is_manual: false,
  manual_price: ''
};

export function PortfolioPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Quotes>({ CASH: { price: 1, prev_close: 1 } });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [lastUpdate, setLastUpdate] = useState('Initializing...');
  const [sortKey, setSortKey] = useState<keyof AssetGroup>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [expandedTickers, setExpandedTickers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [selectedSnapshotDate, setSelectedSnapshotDate] = useState('');
  const [busySync, setBusySync] = useState(false);
  const [busySnapshot, setBusySnapshot] = useState(false);
  const [splitByType, setSplitByType] = useState(false);
  const [pieMode, setPieMode] = useState<'ticker' | 'type'>('ticker');

  const refresh = useCallback(async () => {
    try {
      const [nextHoldings, nextHistory, nextSnapshots] = await Promise.all([
        fetchHoldings(),
        fetchHistory(),
        fetchSnapshots()
      ]);
      const tickers = getQuoteTickers(nextHoldings);
      const nextQuotes = tickers.length ? await fetchQuotes(tickers) : {};
      setHoldings(nextHoldings);
      setHistory(nextHistory);
      setSnapshots(nextSnapshots);
      setQuotes({ CASH: { price: 1, prev_close: 1 }, ...nextQuotes });
      if (nextHistory.length === 0 && nextHoldings.length > 0) {
        triggerSync().then(refresh);
      }
      setLastUpdate(selectedSnapshotDate ? lastUpdate : `Synced: ${new Date().toLocaleTimeString()}`);
    } catch {
      setLastUpdate('Connection Error');
    }
  }, [lastUpdate, selectedSnapshotDate]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const summary = useMemo(() => calculateSummary(holdings, quotes), [holdings, quotes]);
  const { groups, cashHoldings, totalValue } = useMemo(() => buildAssetGroups(holdings, quotes), [holdings, quotes]);
  const sortedGroups = useMemo(() => sortData(groups, sortKey, sortDir), [groups, sortKey, sortDir]);
  const pieAllocations = useMemo(
    () => buildPortfolioPieAllocations(groups, summary.cashVal, pieMode),
    [groups, pieMode, summary.cashVal]
  );

  function handleSort(key: keyof AssetGroup) {
    if (sortKey === key) setSortDir(current => (current === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: HoldingPayload = {
      ticker: form.ticker.toUpperCase(),
      asset_type: normalizeFormAssetType(form.ticker, form.asset_type, form.is_manual),
      account: form.account,
      shares: Number(form.shares),
      average_cost: Number(form.average_cost),
      is_manual: form.is_manual,
      manual_price: form.is_manual ? Number(form.manual_price) : null
    };
    if (payload.is_manual && !Number.isFinite(payload.manual_price)) return;
    const saved = await saveHolding(payload);
    setExpandedTickers(current => current.includes(saved.ticker) ? current : [...current, saved.ticker]);
    setForm(emptyForm);
    await refresh();
  }

  async function handleDelete(ticker: string, account: string) {
    if (await deleteHolding(ticker, account)) await refresh();
  }

  async function handleInlineSave(lot: Holding) {
    const account = (document.getElementById(`edit-account-${lot.id}`) as HTMLInputElement).value;
    const shares = Number((document.getElementById(`edit-shares-${lot.id}`) as HTMLInputElement).value);
    const averageCostInput = document.getElementById(`edit-cost-${lot.id}`) as HTMLInputElement | null;
    const averageCost = averageCostInput ? Number(averageCostInput.value) : lot.average_cost;
    await saveHolding({
      id: lot.id,
      ticker: lot.ticker,
      asset_type: normalizeFormAssetType(lot.ticker, lot.asset_type || 'stock', Boolean(lot.is_manual)),
      account,
      shares,
      average_cost: averageCost,
      is_manual: Boolean(lot.is_manual),
      manual_price: lot.manual_price ?? null
    });
    setEditingId(null);
    await refresh();
  }

  async function handleTickerTypeChange(ticker: string, assetType: AssetType) {
    await updateTickerAssetType(ticker, assetType);
    await refresh();
  }

  async function handleSync() {
    setBusySync(true);
    setLastUpdate('Syncing history...');
    try {
      await triggerSync();
      await refresh();
    } finally {
      setBusySync(false);
    }
  }

  async function handleSnapshotSave(overwrite = false) {
    setBusySnapshot(true);
    try {
      const res = await saveSnapshot(overwrite);
      if (res.status === 409) {
        const body = await res.json();
        const date = body.detail?.snapshot?.date || 'today';
        if (confirm(`A snapshot already exists for ${date}. Overwrite it with the current account data?`)) {
          await handleSnapshotSave(true);
        }
        return;
      }
      if (!res.ok) throw new Error('Snapshot failed');
      await refresh();
      setLastUpdate('Snapshot saved');
    } catch {
      setLastUpdate('Snapshot failed');
    } finally {
      setBusySnapshot(false);
    }
  }

  function handleSnapshotSelect(date: string) {
    setSelectedSnapshotDate(date);
    if (!date) {
      setLastUpdate(`Synced: ${new Date().toLocaleTimeString()}`);
      return;
    }
    const snapshot = snapshots.find(item => item.date === date);
    if (snapshot) setLastUpdate(`Snapshot ${snapshot.date}: ${wholeMoney(snapshot.total_value || 0)}`);
  }

  function addAccountLot(ticker: string) {
    const existing = holdings.find(h => h.ticker === ticker && h.is_manual);
    setForm({
      ticker,
      asset_type: existing?.asset_type || (existing?.is_manual ? 'other' : 'stock'),
      account: '',
      shares: '',
      average_cost: '',
      is_manual: Boolean(existing),
      manual_price: existing?.manual_price ? String(existing.manual_price) : ''
    });
    document.getElementById('position-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const controls = (
    <>
      <button type="button" onClick={handleSync} disabled={busySync} className="text-xs font-bold text-emerald-700 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
        {busySync ? 'Syncing...' : 'Sync'}
      </button>
      <button type="button" onClick={() => handleSnapshotSave()} disabled={busySnapshot} className="text-xs font-bold text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors">
        {busySnapshot ? 'Snapshotting...' : 'Update Snapshot'}
      </button>
      <button type="button" onClick={() => setSplitByType(current => !current)} className="text-xs font-bold text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
        {splitByType ? 'Single Table' : 'By Type'}
      </button>
      <select value={selectedSnapshotDate} onChange={event => handleSnapshotSelect(event.target.value)} className="text-xs font-semibold text-gray-500 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 transition-all duration-200 text-center">
        <option value="">Current</option>
        {snapshots.map(snapshot => {
          const created = snapshot.created_at ? new Date(snapshot.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
          return <option key={snapshot.date} value={snapshot.date}>Snapshot - {snapshot.date}{created ? ` ${created}` : ''}</option>;
        })}
      </select>
      <div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{lastUpdate}</div>
    </>
  );

  const stats = (
    <>
      <div className="text-gray-500">Value: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.totalValue)}</span></div>
      <div className="text-gray-500">Cash: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.cashVal)}</span></div>
      <div className="text-gray-500">Daily: <span className={`font-bold ${summary.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{signedMoney(summary.dailyPnl, 0)} ({summary.dailyPercent.toFixed(1)}%)</span></div>
      <div className="text-gray-500">P/L: <span className={`font-bold ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{signedMoney(summary.profit, 0)} ({summary.profitPercent.toFixed(1)}%)</span></div>
    </>
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="portfolio" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 mb-8">
        <div className="bg-white dark:bg-indigo-950/50 rounded-3xl shadow-xl shadow-emerald-200/20 dark:shadow-none border border-emerald-100 dark:border-emerald-900/30 p-6 h-72 overflow-hidden">
          <div className="chart-container">
            <PortfolioLineChart history={history} privacyMode={privacyMode} themeSignal={theme} />
          </div>
        </div>
        <div className="relative bg-white dark:bg-indigo-950/50 rounded-3xl shadow-xl shadow-emerald-200/20 dark:shadow-none border border-emerald-100 dark:border-emerald-900/30 p-6 h-72 overflow-hidden">
          <button
            type="button"
            onClick={() => setPieMode(current => current === 'ticker' ? 'type' : 'ticker')}
            aria-label={pieMode === 'ticker' ? 'Show allocation by type' : 'Show allocation by ticker'}
            title={pieMode === 'ticker' ? 'Show by type' : 'Show by ticker'}
            className="absolute right-4 top-4 z-10 rounded-full bg-emerald-50 p-2 text-emerald-700 shadow-sm hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
          >
            <PieModeIcon />
          </button>
          <div className="mb-2 text-xs font-black uppercase tracking-widest text-emerald-600">
            {pieMode === 'ticker' ? 'Allocation by Ticker' : 'Allocation by Type'}
          </div>
          <div className="h-[13.5rem]">
            <PortfolioAllocationPieChart allocations={pieAllocations} privacyMode={privacyMode} themeSignal={theme} mode={pieMode} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 mb-4 items-start">
        <CashTable cashHoldings={cashHoldings} totalValue={totalValue} editingId={editingId} onEdit={setEditingId} onSave={handleInlineSave} onCancel={() => setEditingId(null)} onDelete={handleDelete} onAddCash={() => setForm({ ...emptyForm, ticker: 'CASH', asset_type: 'cash equivalents' })} />

        <section className="bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-4">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">🌱 Plant Capital</h2>
          <form id="position-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 items-end">
            <Field label="Symbol"><input value={form.ticker} onChange={event => setForm({ ...form, ticker: event.target.value })} required placeholder="AAPL" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all uppercase" /></Field>
            <Field label="Type">
              <select value={form.ticker.toUpperCase() === 'CASH' ? 'cash equivalents' : form.asset_type} onChange={event => setForm({ ...form, asset_type: event.target.value as AssetType })} disabled={form.ticker.toUpperCase() === 'CASH'} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all">
                {ASSET_TYPES.map(type => <option key={type} value={type}>{formatAssetType(type)}</option>)}
              </select>
            </Field>
            <Field label="Account"><input value={form.account} onChange={event => setForm({ ...form, account: event.target.value })} required placeholder="E-Trade" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" /></Field>
            <Field label="Quantity"><input type="number" step="any" value={form.shares} onChange={event => setForm({ ...form, shares: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" /></Field>
            <Field label="Avg Price"><input type="number" step="any" value={form.average_cost} onChange={event => setForm({ ...form, average_cost: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" /></Field>
            <Field label="Pricing"><label className="flex items-center gap-2 h-[42px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 rounded-lg px-3 text-sm font-bold cursor-pointer"><input type="checkbox" checked={form.is_manual} onChange={event => setForm({ ...form, is_manual: event.target.checked, asset_type: event.target.checked && form.asset_type === 'stock' ? 'other' : form.asset_type, manual_price: event.target.checked ? form.manual_price : '' })} className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />Manual</label></Field>
            {form.is_manual && <Field label="Live Price"><input type="number" step="any" value={form.manual_price} onChange={event => setForm({ ...form, manual_price: event.target.value })} required placeholder="0.00" className="w-full bg-amber-50 dark:bg-amber-900/20 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-amber-500 transition-all" /></Field>}
            <div className="flex gap-2 col-span-2">
              <button type="submit" className="flex-1 cali-gradient text-white font-bold py-2.5 px-4 rounded-lg hover:opacity-90 transition-all shadow-sm shadow-emerald-200">Save</button>
              <button type="button" onClick={() => setForm(emptyForm)} className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 font-bold py-2.5 px-4 rounded-lg hover:bg-amber-100 transition-all">Clear</button>
            </div>
          </form>
        </section>
      </div>

      {splitByType ? (
        <div className="space-y-6">
          {groupByAssetType(sortedGroups).map(section => (
            <section key={section.type}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-600">{formatAssetType(section.type)}</h2>
              <PortfolioTable groups={section.groups} sortKey={sortKey} sortDir={sortDir} expandedTickers={expandedTickers} editingId={editingId} onSort={handleSort} onToggle={ticker => setExpandedTickers(current => current.includes(ticker) ? current.filter(item => item !== ticker) : [...current, ticker])} onAddLot={addAccountLot} onTypeChange={handleTickerTypeChange} onEdit={setEditingId} onSave={handleInlineSave} onCancel={() => setEditingId(null)} onDelete={handleDelete} />
            </section>
          ))}
        </div>
      ) : (
        <PortfolioTable groups={sortedGroups} sortKey={sortKey} sortDir={sortDir} expandedTickers={expandedTickers} editingId={editingId} onSort={handleSort} onToggle={ticker => setExpandedTickers(current => current.includes(ticker) ? current.filter(item => item !== ticker) : [...current, ticker])} onAddLot={addAccountLot} onTypeChange={handleTickerTypeChange} onEdit={setEditingId} onSave={handleInlineSave} onCancel={() => setEditingId(null)} onDelete={handleDelete} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><label className="text-[11px] font-bold text-gray-400 uppercase ml-0.5">{label}</label>{children}</div>;
}

function normalizeFormAssetType(ticker: string, assetType: AssetType, isManual: boolean): AssetType {
  if (ticker.toUpperCase() === 'CASH') return 'cash equivalents';
  return assetType || (isManual ? 'other' : 'stock');
}

function groupByAssetType(groups: AssetGroup[]) {
  return ASSET_TYPES
    .map(type => ({ type, groups: groups.filter(group => group.asset_type === type) }))
    .filter(section => section.groups.length > 0);
}

function buildPortfolioPieAllocations(groups: AssetGroup[], cashValue: number, mode: 'ticker' | 'type') {
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

  const allocations = groups.map(group => ({
    label: group.ticker,
    asset_type: group.asset_type,
    value: group.market_value
  }));
  if (cashValue > 0) {
    allocations.push({ label: 'CASH', asset_type: 'cash equivalents', value: cashValue });
  }
  return allocations
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

type CashSortKey = 'account' | 'shares' | 'percent';

function CashTable(props: {
  cashHoldings: Holding[];
  totalValue: number;
  editingId: number | null;
  onEdit: (id: number) => void;
  onSave: (lot: Holding) => void;
  onCancel: () => void;
  onDelete: (ticker: string, account: string) => void;
  onAddCash: () => void;
}) {
  const [sortKey, setSortKey] = useState<CashSortKey>('account');
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const sortedCashHoldings = useMemo(
    () => sortCashHoldings(props.cashHoldings, props.totalValue, sortKey, sortDir),
    [props.cashHoldings, props.totalValue, sortDir, sortKey]
  );

  function handleSort(key: CashSortKey) {
    if (sortKey === key) setSortDir(current => (current === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto h-full flex flex-col justify-center">
      <table className="w-full text-left">
        <thead><tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
          <SortHeader active={sortKey === 'account'} dir={sortDir} onClick={() => handleSort('account')}>🪙 Cash Account</SortHeader>
          <SortHeader active={sortKey === 'shares'} dir={sortDir} onClick={() => handleSort('shares')}>🏦 Balance</SortHeader>
          <SortHeader active={sortKey === 'percent'} dir={sortDir} onClick={() => handleSort('percent')}>% Port</SortHeader>
          <th className="px-5 py-2 text-right w-16"><button onClick={props.onAddCash} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded transition-all" title="Add Cash"><PlusIcon /></button></th>
        </tr></thead>
        <tbody id="cash-list" className="divide-y divide-gray-50 text-sm">
          {props.cashHoldings.length === 0 && <tr><td colSpan={4} className="px-5 py-4 text-center text-gray-400 italic">No cash lots found.</td></tr>}
          {sortedCashHoldings.map(cash => props.editingId === cash.id
            ? <EditRow key={cash.id} lot={cash} colSpan={1} isCashTable showCost={false} onSave={props.onSave} onCancel={props.onCancel} />
            : <tr key={cash.id} className="bg-gray-50/30 dark:bg-gray-800/30 text-sm text-gray-600 dark:text-gray-300 group row-transition">
              <td className="px-5 py-2 font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap">🪙 {cash.account}</td>
              <td className="px-5 py-2 whitespace-nowrap">{cash.shares.toLocaleString()}</td>
              <td className="px-5 py-2 font-mono text-gray-500 dark:text-gray-300 whitespace-nowrap">{props.totalValue > 0 ? (cash.shares / props.totalValue * 100).toFixed(1) : '0.0'}%</td>
              <td className="px-5 py-2 text-right whitespace-nowrap"><RowActions onEdit={() => props.onEdit(cash.id)} onDelete={() => props.onDelete('CASH', cash.account)} /></td>
            </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function sortCashHoldings(cashHoldings: Holding[], totalValue: number, key: CashSortKey, dir: SortDir): Holding[] {
  return [...cashHoldings].sort((a, b) => {
    const left = cashSortValue(a, totalValue, key);
    const right = cashSortValue(b, totalValue, key);
    if (left < right) return -1 * dir;
    if (left > right) return 1 * dir;
    return a.account.localeCompare(b.account);
  });
}

function cashSortValue(cash: Holding, totalValue: number, key: CashSortKey): string | number {
  if (key === 'account') return cash.account.toLowerCase();
  if (key === 'percent') return totalValue > 0 ? cash.shares / totalValue : 0;
  return cash.shares;
}

function PortfolioTable(props: {
  groups: AssetGroup[];
  sortKey: keyof AssetGroup;
  sortDir: SortDir;
  expandedTickers: string[];
  editingId: number | null;
  onSort: (key: keyof AssetGroup) => void;
  onToggle: (ticker: string) => void;
  onAddLot: (ticker: string) => void;
  onTypeChange: (ticker: string, assetType: AssetType) => void;
  onEdit: (id: number) => void;
  onSave: (lot: Holding) => void;
  onCancel: () => void;
  onDelete: (ticker: string, account: string) => void;
}) {
  const headers: [keyof AssetGroup, string][] = [['ticker', '🌿 Asset'], ['asset_type', 'Type'], ['shares', '📦 Size'], ['average_cost', 'Cost'], ['daily_percent', '📈 Today'], ['daily_pnl', '🌱 Daily'], ['market_value', '💎 Worth'], ['percent', '% Port'], ['pnl', '🪙 Total'], ['pnl_percent', 'Total %']];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-left" id="holdings-table">
        <thead><tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
          {headers.slice(0, 4).map(([key, label]) => <SortHeader key={key} active={props.sortKey === key} dir={props.sortDir} onClick={() => props.onSort(key)}>{label}</SortHeader>)}
          <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Live Price</th>
          {headers.slice(4).map(([key, label]) => <SortHeader key={key} active={props.sortKey === key} dir={props.sortDir} onClick={() => props.onSort(key)}>{label}</SortHeader>)}
          <th className="px-5 py-2 text-right w-16"></th>
        </tr></thead>
        <tbody id="holdings-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
          {props.groups.length === 0 && <tr><td colSpan={12} className="p-10 text-center text-gray-400">No positions found. Add one above.</td></tr>}
          {props.groups.map(group => {
            const expanded = props.expandedTickers.includes(group.ticker);
            const icon = getAssetTypeIcon(group.asset_type);
            const quoteUrl = getYahooFinanceUrl(group.ticker, group.lots.every(lot => Boolean(lot.is_manual)));
            return (
              <FragmentGroup key={group.ticker}>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors" onClick={() => props.onToggle(group.ticker)}>
                  <td className="px-5 py-3 text-gray-900 dark:text-white whitespace-nowrap flex items-center gap-2">
                    <ChevronIcon open={expanded} />
                    <span className="text-base leading-none" title={formatAssetType(group.asset_type)}>{icon}</span>
                    {quoteUrl
                      ? <a href={quoteUrl} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline underline-offset-4">{group.ticker}</a>
                      : <span>{group.ticker}</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap" onClick={event => event.stopPropagation()}>
                    <select value={group.asset_type} onChange={event => props.onTypeChange(group.ticker, event.target.value as AssetType)} className="min-w-[8rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500">
                      {ASSET_TYPES.map(type => <option key={type} value={type}>{formatAssetType(type)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap">{group.shares.toLocaleString()}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-300 whitespace-nowrap">{money(group.average_cost)}</td>
                  <td className="px-5 py-3 whitespace-nowrap"><PriceBadge live={group.live} prev={group.prev_close} /></td>
                  <td className={`px-5 py-3 font-bold ${group.daily_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedPct(group.daily_percent)}</td>
                  <td className={`px-5 py-3 font-bold ${group.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedMoney(group.daily_pnl)}</td>
                  <td className="px-5 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">{money(group.market_value)}</td>
                  <td className="px-5 py-3 text-gray-500 dark:text-gray-300 font-mono text-xs whitespace-nowrap">{group.percent.toFixed(1)}%</td>
                  <td className={`px-5 py-3 font-bold ${group.pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedMoney(group.pnl)}</td>
                  <td className={`px-5 py-3 font-bold ${group.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedPct(group.pnl_percent)}</td>
                  <td className="px-5 py-3 text-right"><button onClick={event => { event.stopPropagation(); props.onAddLot(group.ticker); }} className="p-1.5 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all" title="Add Account Lot"><PlusIcon /></button></td>
                </tr>
                {expanded && group.lots.map(lot => props.editingId === lot.id
                  ? <EditRow key={lot.id} lot={lot} colSpan={7} onSave={props.onSave} onCancel={props.onCancel} />
                  : <tr key={lot.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/60 text-sm text-gray-500 dark:text-gray-300 group row-transition">
                    <td className="px-8 py-2 italic text-gray-600 dark:text-gray-300 whitespace-nowrap">{lot.is_manual ? '💎' : '🧭'} {lot.account}</td>
                    <td className="px-5 py-2"></td>
                    <td className="px-5 py-2 whitespace-nowrap">{lot.shares.toLocaleString()}</td>
                    <td className="px-5 py-2 whitespace-nowrap">{money(lot.average_cost)}</td>
                    <td className="px-5 py-2" colSpan={2}></td>
                    <td className="px-5 py-2 whitespace-nowrap">{signedMoney(lot.daily_pnl)}</td>
                    <td className="px-5 py-2 text-gray-700 dark:text-gray-100 whitespace-nowrap">{money(lot.market_value)}</td>
                    <td className="px-5 py-2"></td>
                    <td className={`px-5 py-2 whitespace-nowrap ${lot.pnl >= 0 ? 'text-green-500' : 'text-red-400'}`}>{signedMoney(lot.pnl)}</td>
                    <td className="px-5 py-2"></td>
                    <td className="px-5 py-2 text-right whitespace-nowrap"><RowActions onEdit={() => props.onEdit(lot.id)} onDelete={() => props.onDelete(lot.ticker, lot.account)} /></td>
                  </tr>)}
              </FragmentGroup>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function SortHeader({ children, active, dir, onClick }: { children: ReactNode; active: boolean; dir: SortDir; onClick: () => void }) {
  return <th onClick={onClick} className={`sort-header px-5 pr-8 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${active ? (dir === 1 ? 'sort-asc' : 'sort-desc') : ''}`}>{children}</th>;
}

function PriceBadge({ live, prev }: { live: number; prev: number }) {
  return <span className={`px-2 py-1 rounded-md font-bold ${live >= prev ? 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30' : 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30'}`}>{live ? money(live) : '...'}</span>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex justify-end items-center space-x-1"><button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-blue-600 transition-all" title="Edit"><EditIcon /></button><button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all" title="Delete"><TrashIcon /></button></div>;
}

function EditRow({ lot, colSpan, isCashTable = false, showCost = true, onSave, onCancel }: { lot: Holding; colSpan: number; isCashTable?: boolean; showCost?: boolean; onSave: (lot: Holding) => void; onCancel: () => void }) {
  return (
    <tr className="bg-blue-50/50 dark:bg-blue-950/30 text-sm">
      <td className="px-8 py-2 italic"><input id={`edit-account-${lot.id}`} type="text" defaultValue={lot.account} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>
      {!isCashTable && <td className="px-5 py-2"></td>}
      <td className="px-5 py-2"><input id={`edit-shares-${lot.id}`} type="number" step="any" defaultValue={lot.shares} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>
      {showCost && <td className="px-5 py-2"><input id={`edit-cost-${lot.id}`} type="number" step="any" defaultValue={lot.average_cost} disabled={lot.ticker === 'CASH'} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>}
      <td className="px-5 py-2" colSpan={colSpan}></td>
      <td className="px-5 py-2 text-right whitespace-nowrap"><div className="flex justify-end items-center space-x-3"><button onClick={() => onSave(lot)} className="text-[10px] font-bold text-green-600 hover:underline">SAVE</button><button onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">✕</button></div></td>
    </tr>
  );
}
