import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deleteHolding, fetchHoldings, fetchQuotes } from '../api';
import { usePrivacyMode, useTheme } from '../hooks';
import {
  buildAccountGroups,
  calculateSummary,
  getAccountAllocations,
  getYahooFinanceUrl,
  getQuoteTickers,
  money,
  signedMoney,
  signedPct,
  sortData,
  wholeMoney
} from '../finance';
import type { AccountGroup, Holding, Quotes, SortDir } from '../types';
import { AccountDoughnutChart } from './Charts';
import { ChevronIcon } from './Icons';
import { Header } from './Header';

export function AccountsPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Quotes>({ CASH: { price: 1, prev_close: 1 } });
  const [lastUpdate, setLastUpdate] = useState('Initializing...');
  const [sortKey, setSortKey] = useState<keyof AccountGroup>('account');
  const [sortDir, setSortDir] = useState<SortDir>(1);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const nextHoldings = await fetchHoldings();
      const tickers = getQuoteTickers(nextHoldings);
      const nextQuotes = tickers.length ? await fetchQuotes(tickers) : {};
      setHoldings(nextHoldings);
      setQuotes({ CASH: { price: 1, prev_close: 1 }, ...nextQuotes });
      setLastUpdate(`Synced: ${new Date().toLocaleTimeString()}`);
    } catch {
      setLastUpdate('Connection Error');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const summary = useMemo(() => calculateSummary(holdings, quotes), [holdings, quotes]);
  const allocations = useMemo(() => getAccountAllocations(holdings, quotes), [holdings, quotes]);
  const groups = useMemo(() => sortData(buildAccountGroups(holdings, quotes), sortKey, sortDir), [holdings, quotes, sortKey, sortDir]);

  function handleSort(key: keyof AccountGroup) {
    if (sortKey === key) setSortDir(current => (current === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  async function handleDelete(ticker: string, account: string) {
    if (await deleteHolding(ticker, account)) await refresh();
  }

  const stats = (
    <>
      <div className="text-gray-500">Value: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.totalValue)}</span></div>
      <div className="text-gray-500">Cash: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.cashVal)}</span></div>
      <div className="text-gray-500">P/L: <span className={`font-bold ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{signedMoney(summary.profit, 0)} ({summary.profitPercent.toFixed(1)}%)</span></div>
    </>
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header
        view="accounts"
        theme={theme}
        privacyMode={privacyMode}
        onToggleTheme={toggleTheme}
        onTogglePrivacy={togglePrivacy}
        controls={<div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{lastUpdate}</div>}
        stats={stats}
      />

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 h-72 overflow-hidden">
        <div className="chart-container">
          <AccountDoughnutChart allocations={allocations} privacyMode={privacyMode} themeSignal={theme} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-left" id="account-table">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
              <SortHeader active={sortKey === 'account'} dir={sortDir} onClick={() => handleSort('account')}>🧭 Account</SortHeader>
              <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">🌿 Lots</th>
              <SortHeader active={sortKey === 'cost_basis'} dir={sortDir} onClick={() => handleSort('cost_basis')}>Cost</SortHeader>
              <SortHeader active={sortKey === 'daily_pnl'} dir={sortDir} onClick={() => handleSort('daily_pnl')}>🌱 Daily</SortHeader>
              <SortHeader active={sortKey === 'market_value'} dir={sortDir} onClick={() => handleSort('market_value')}>💎 Worth</SortHeader>
              <SortHeader active={sortKey === 'percent'} dir={sortDir} onClick={() => handleSort('percent')}>% Port</SortHeader>
              <SortHeader active={sortKey === 'pnl'} dir={sortDir} onClick={() => handleSort('pnl')}>🪙 Total</SortHeader>
              <SortHeader active={sortKey === 'pnl_percent'} dir={sortDir} onClick={() => handleSort('pnl_percent')}>Total %</SortHeader>
            </tr>
          </thead>
          <tbody id="account-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
            {groups.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-gray-400">No data found.</td></tr>}
            {groups.map(group => {
              const expanded = expandedAccounts.includes(group.account);
              return (
                <FragmentGroup key={group.account}>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors" onClick={() => setExpandedAccounts(current => current.includes(group.account) ? current.filter(item => item !== group.account) : [...current, group.account])}>
                    <td className="px-5 py-3 text-gray-900 dark:text-white whitespace-nowrap flex items-center gap-2"><ChevronIcon open={expanded} />🧭 {group.account}</td>
                    <td className="px-5 py-3 text-gray-400 dark:text-gray-500 font-normal">{group.lots.length} lots</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{money(group.cost_basis)}</td>
                    <td className={`px-5 py-3 font-bold ${group.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedMoney(group.daily_pnl)}</td>
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">{money(group.market_value)}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap">{group.percent.toFixed(1)}%</td>
                    <td className={`px-5 py-3 font-bold ${group.pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedMoney(group.pnl)}</td>
                    <td className={`px-5 py-3 font-bold ${group.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`}>{signedPct(group.pnl_percent)}</td>
                  </tr>
                  {expanded && group.lots.map(lot => {
                    const costBasis = lot.ticker === 'CASH' ? lot.shares : lot.shares * lot.average_cost;
                    const pnlPct = lot.ticker !== 'CASH' && lot.average_cost > 0 ? ((lot.live - lot.average_cost) / lot.average_cost) * 100 : 0;
                    const sizeLabel = lot.ticker === 'CASH' ? 'Cash balance' : `${lot.shares.toLocaleString()} @ ${money(lot.average_cost)}`;
                    const icon = lot.ticker === 'CASH' ? '🪙' : (lot.is_manual ? '💎' : '🌿');
                    const quoteUrl = getYahooFinanceUrl(lot.ticker, Boolean(lot.is_manual));
                    return (
                      <tr key={lot.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/60 text-sm text-gray-500 dark:text-gray-300 group row-transition">
                        <td className="px-8 py-2 italic whitespace-nowrap">
                          {icon}{' '}
                          {quoteUrl
                            ? <a href={quoteUrl} target="_blank" rel="noreferrer" className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline underline-offset-4">{lot.ticker}</a>
                            : lot.ticker}
                        </td>
                        <td className="px-5 py-2 whitespace-nowrap">{sizeLabel}</td>
                        <td className="px-5 py-2">{money(costBasis)}</td>
                        <td className="px-5 py-2 whitespace-nowrap">{signedMoney(lot.daily_pnl)}</td>
                        <td className="px-5 py-2 whitespace-nowrap">{money(lot.market_value)}</td>
                        <td></td>
                        <td className={`px-5 py-2 whitespace-nowrap ${lot.pnl >= 0 ? 'text-green-500' : 'text-red-400'}`}>{signedMoney(lot.pnl)}</td>
                        <td className="px-5 py-2">{pnlPct.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </FragmentGroup>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({ children, active, dir, onClick }: { children: ReactNode; active: boolean; dir: SortDir; onClick: () => void }) {
  return <th onClick={onClick} className={`sort-header px-5 pr-8 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${active ? (dir === 1 ? 'sort-asc' : 'sort-desc') : ''}`}>{children}</th>;
}

function FragmentGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
