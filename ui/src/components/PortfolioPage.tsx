import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
import {
  buildPortfolioPieAllocations,
  emptyPortfolioForm,
  groupByAssetType,
  normalizeFormAssetType,
  saveErrorMessage,
  type PortfolioFormState
} from '../domain/portfolio';
import { buildAssetGroups, calculateSummary, formatAssetType, getQuoteTickers, signedMoney, wholeMoney } from '../finance';
import { usePrivacyMode, useTheme } from '../hooks';
import type { AssetType, Holding, HoldingPayload, HistoryPoint, Quotes, Snapshot } from '../types';
import { Header } from './Header';
import { PortfolioChartsPanel } from './portfolio/PortfolioChartsPanel';
import { PortfolioForm } from './portfolio/PortfolioForm';
import { CashTable, PortfolioTable } from './portfolio/PortfolioTables';

export function PortfolioPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Quotes>({ CASH: { price: 1, prev_close: 1 } });
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [lastUpdate, setLastUpdate] = useState('Initializing...');
  const [expandedTickers, setExpandedTickers] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PortfolioFormState>(emptyPortfolioForm);
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
      if (nextHistory.length === 0 && nextHoldings.length > 0) triggerSync().then(refresh);
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
  const pieAllocations = useMemo(() => buildPortfolioPieAllocations(groups, summary.cashVal, pieMode), [groups, pieMode, summary.cashVal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    try {
      const saved = await saveHolding(payload);
      setExpandedTickers(current => current.includes(saved.ticker) ? current : [...current, saved.ticker]);
      setForm(emptyPortfolioForm);
      setLastUpdate('Position saved');
      await refresh();
    } catch (error) {
      setLastUpdate(saveErrorMessage(error));
    }
  }

  async function handleDelete(ticker: string, account: string) {
    if (await deleteHolding(ticker, account)) await refresh();
  }

  async function handleInlineSave(lot: Holding) {
    const account = lot.account.trim();
    const shares = Number(lot.shares);
    const averageCost = Number(lot.average_cost);
    if (!account || !Number.isFinite(shares) || !Number.isFinite(averageCost)) {
      setLastUpdate('Save failed: check account, quantity, and cost.');
      return;
    }

    try {
      await saveHolding({
        id: lot.id,
        ticker: lot.ticker,
        asset_type: normalizeFormAssetType(lot.ticker, lot.asset_type || 'stock', Boolean(lot.is_manual)),
        account,
        shares,
        average_cost: averageCost,
        is_manual: Boolean(lot.is_manual),
        manual_price: lot.is_manual ? lot.manual_price ?? null : null
      });
      setEditingId(null);
      setLastUpdate('Position saved');
      await refresh();
    } catch (error) {
      setLastUpdate(saveErrorMessage(error));
    }
  }

  async function handleTickerTypeChange(ticker: string, assetType: AssetType) {
    try {
      await updateTickerAssetType(ticker, assetType);
      setLastUpdate('Asset type saved');
      await refresh();
    } catch (error) {
      setLastUpdate(saveErrorMessage(error));
    }
  }

  async function handleSync() {
    setBusySync(true);
    setLastUpdate('Syncing live prices...');
    try {
      const result = await triggerSync();
      await refresh();
      const label = result.tickers.length === 1 ? 'ticker' : 'tickers';
      setLastUpdate(`Synced ${result.tickers.length} ${label}: ${new Date().toLocaleTimeString()}`);
    } catch {
      setLastUpdate('Sync failed');
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
        if (confirm(`A snapshot already exists for ${date}. Overwrite it with the current account data?`)) await handleSnapshotSave(true);
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

      <PortfolioChartsPanel
        history={history}
        allocations={pieAllocations}
        privacyMode={privacyMode}
        themeSignal={theme}
        pieMode={pieMode}
        onTogglePieMode={() => setPieMode(current => current === 'ticker' ? 'type' : 'ticker')}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 mb-4 items-start">
        <CashTable
          cashHoldings={cashHoldings}
          totalValue={totalValue}
          editingId={editingId}
          onEdit={setEditingId}
          onSave={handleInlineSave}
          onCancel={() => setEditingId(null)}
          onDelete={handleDelete}
          onAddCash={() => setForm({ ...emptyPortfolioForm, ticker: 'CASH', asset_type: 'cash equivalents' })}
        />

        <PortfolioForm
          form={form}
          onChange={setForm}
          onSubmit={handleSubmit}
          onClear={() => setForm(emptyPortfolioForm)}
        />
      </div>

      {splitByType ? (
        <div className="space-y-6">
          {groupByAssetType(groups).map(section => (
            <section key={section.type}>
              <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-emerald-600">{formatAssetType(section.type)}</h2>
              <PortfolioTable groups={section.groups} expandedTickers={expandedTickers} editingId={editingId} onToggle={toggleTicker} onAddLot={addAccountLot} onTypeChange={handleTickerTypeChange} onEdit={setEditingId} onSave={handleInlineSave} onCancel={() => setEditingId(null)} onDelete={handleDelete} />
            </section>
          ))}
        </div>
      ) : (
        <PortfolioTable groups={groups} expandedTickers={expandedTickers} editingId={editingId} onToggle={toggleTicker} onAddLot={addAccountLot} onTypeChange={handleTickerTypeChange} onEdit={setEditingId} onSave={handleInlineSave} onCancel={() => setEditingId(null)} onDelete={handleDelete} />
      )}
    </div>
  );

  function toggleTicker(ticker: string) {
    setExpandedTickers(current => current.includes(ticker) ? current.filter(item => item !== ticker) : [...current, ticker]);
  }
}
