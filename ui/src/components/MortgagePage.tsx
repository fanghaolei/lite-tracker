import { useMemo, useState } from 'react';
import { useMortgageEstimateQuery, useRefreshMortgageEstimateMutation } from '../data/queries';
import {
  calculateMortgageMetrics,
  calculateMortgagePayoff,
  emptyEstimateData,
  formatMortgageDate,
  primaryEstimate
} from '../domain/mortgage';
import { money, wholeMoney } from '../finance';
import { usePrivacyMode, useTheme } from '../hooks';
import { Header } from './Header';
import { MortgageEquityPanel } from './mortgage/MortgageEquityPanel';
import { MortgagePayoffPanel } from './mortgage/MortgagePayoffPanel';
import { MortgageStatsGrid } from './mortgage/MortgageStatsGrid';

export function MortgagePage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [estimateMessage, setEstimateMessage] = useState('');
  const estimateQuery = useMortgageEstimateQuery();
  const refreshEstimate = useRefreshMortgageEstimateMutation();
  const estimateData = estimateQuery.data ?? emptyEstimateData;
  const loadingEstimate = estimateQuery.isLoading;
  const refreshingEstimate = refreshEstimate.isPending;
  const loadingMessage = estimateQuery.error instanceof Error ? estimateQuery.error.message : '';

  const profile = estimateData.profile;
  const estimate = primaryEstimate(estimateData.estimates);
  const estimateDate = estimateData.date || estimate?.date || null;
  const metrics = useMemo(() => calculateMortgageMetrics(profile, estimate), [profile, estimate]);
  const payoff = useMemo(() => calculateMortgagePayoff(profile, metrics.propertyEstimate), [profile, metrics.propertyEstimate]);

  async function handleRefreshEstimate() {
    setEstimateMessage('');
    try {
      const data = await refreshEstimate.mutateAsync();
      const errorCount = data.errors?.length || 0;
      setEstimateMessage(errorCount ? `Updated today's saved estimate with latest available cached values. ${errorCount} source refresh failed.` : "Updated today's property estimate snapshot.");
    } catch (error) {
      setEstimateMessage(error instanceof Error ? error.message : 'Unable to update estimate.');
    }
  }

  const stats = (
    <>
      <div className="text-gray-500">Value: <span className="money-value font-bold text-gray-900 dark:text-white">{metrics.propertyEstimate > 0 ? wholeMoney(metrics.propertyEstimate) : '-'}</span></div>
      <div className="text-gray-500">Balance: <span className="money-value font-bold text-gray-900 dark:text-white">{profile ? money(profile.principal_balance) : '-'}</span></div>
      <div className="text-gray-500">Equity: <span className="money-value font-bold text-green-600">{metrics.propertyEstimate > 0 ? money(metrics.equity) : '-'}</span></div>
      <div className="text-gray-500">LTV: <span className="money-value font-bold text-amber-600">{metrics.ltv !== null ? `${metrics.ltv.toFixed(1)}%` : '-'}</span></div>
    </>
  );

  const controls = (
    <>
      <button
        type="button"
        onClick={handleRefreshEstimate}
        disabled={refreshingEstimate || estimateData.estimates.length === 0}
        className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {refreshingEstimate ? 'Updating...' : 'Update Estimate'}
      </button>
      <div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
        Estimate: {formatMortgageDate(estimateDate)}
      </div>
    </>
  );

  return (
    <div id="mortgage-page" className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="mortgage" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />

      {(estimateMessage || loadingMessage) && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm font-semibold text-amber-700 dark:text-amber-200">
          {estimateMessage || loadingMessage}
        </div>
      )}

      {!loadingEstimate && !profile && (
        <div className="mb-5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 p-5 text-sm font-semibold text-gray-500 dark:text-gray-300">
          No mortgage profile is configured in the local database yet.
        </div>
      )}

      <MortgageStatsGrid profile={profile} metrics={metrics} />
      <MortgageEquityPanel profile={profile} estimateData={estimateData} estimate={estimate} metrics={metrics} loadingEstimate={loadingEstimate} />
      <MortgagePayoffPanel payoff={payoff} profile={profile} metrics={metrics} privacyMode={privacyMode} themeSignal={theme} />
    </div>
  );
}
