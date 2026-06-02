import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchHoldings, fetchQuotes } from '../api';
import { usePrivacyMode, useTheme } from '../hooks';
import {
  buildAccountGroups,
  calculateSummary,
  getAccountAllocations,
  getQuoteTickers,
  signedMoney,
  wholeMoney
} from '../finance';
import type { Holding, Quotes } from '../types';
import { AccountsChartPanel } from './accounts/AccountsChartPanel';
import { AccountsTable } from './accounts/AccountsTable';
import { Header } from './Header';

export function AccountsPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [quotes, setQuotes] = useState<Quotes>({ CASH: { price: 1, prev_close: 1 } });
  const [lastUpdate, setLastUpdate] = useState('Initializing...');

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
  const groups = useMemo(() => buildAccountGroups(holdings, quotes), [holdings, quotes]);

  const stats = (
    <>
      <div className="text-gray-500">Value: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.totalValue)}</span></div>
      <div className="text-gray-500">Cash: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(summary.cashVal)}</span></div>
      <div className="text-gray-500">P/L: <span className={`font-bold ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{signedMoney(summary.profit, 0)} ({summary.profitPercent.toFixed(1)}%)</span></div>
    </>
  );

  const controls = <div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{lastUpdate}</div>;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="accounts" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />
      <AccountsChartPanel allocations={allocations} privacyMode={privacyMode} themeSignal={theme} />
      <AccountsTable groups={groups} />
    </div>
  );
}
