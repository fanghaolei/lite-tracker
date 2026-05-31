import { useEffect, useMemo, useState } from 'react';
import { fetchMortgageEstimate, refreshMortgageEstimate } from '../api';
import { money, wholeMoney } from '../finance';
import { usePrivacyMode, useTheme } from '../hooks';
import type { MortgageEstimateResponse, MortgageProfile, PropertyEstimate } from '../types';
import { Header } from './Header';

const emptyEstimateData: MortgageEstimateResponse = {
  profile: null,
  date: null,
  estimates: []
};

const icons = {
  property: '\u{1F3E0}',
  sources: '\u{1F4CD}',
  terms: '\u{1F4CB}',
  progress: '\u23F3'
};

function primaryEstimate(estimates: PropertyEstimate[]) {
  return estimates[0] || null;
}

export function MortgagePage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [estimateData, setEstimateData] = useState<MortgageEstimateResponse>(emptyEstimateData);
  const [loadingEstimate, setLoadingEstimate] = useState(true);
  const [refreshingEstimate, setRefreshingEstimate] = useState(false);
  const [estimateMessage, setEstimateMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchMortgageEstimate()
      .then((data) => {
        if (!mounted) return;
        setEstimateData(data);
        setEstimateMessage('');
      })
      .catch((error) => {
        if (mounted) setEstimateMessage(error instanceof Error ? error.message : 'Unable to load mortgage data.');
      })
      .finally(() => {
        if (mounted) setLoadingEstimate(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const profile = estimateData.profile;
  const estimate = primaryEstimate(estimateData.estimates);
  const estimateDate = estimateData.date || estimate?.date || null;

  const metrics = useMemo(() => calculateMetrics(profile, estimate), [profile, estimate]);

  async function handleRefreshEstimate() {
    setRefreshingEstimate(true);
    setEstimateMessage('');
    try {
      const data = await refreshMortgageEstimate();
      setEstimateData(data);
      const errorCount = data.errors?.length || 0;
      setEstimateMessage(errorCount ? `Updated today's saved estimate with latest available cached values. ${errorCount} source refresh failed.` : "Updated today's property estimate snapshot.");
    } catch (error) {
      setEstimateMessage(error instanceof Error ? error.message : 'Unable to update estimate.');
    } finally {
      setRefreshingEstimate(false);
      setLoadingEstimate(false);
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
        Estimate: {formatDate(estimateDate)}
      </div>
    </>
  );

  return (
    <div id="mortgage-page" className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="mortgage" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />

      {estimateMessage && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm font-semibold text-amber-700 dark:text-amber-200">
          {estimateMessage}
        </div>
      )}

      {!loadingEstimate && !profile && (
        <div className="mb-5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 p-5 text-sm font-semibold text-gray-500 dark:text-gray-300">
          No mortgage profile is configured in the local database yet.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-8" id="mortgage-stats">
        <MetricCard label="Estimated Value" value={metrics.propertyEstimate > 0 ? wholeMoney(metrics.propertyEstimate) : '-'} tone="emerald" />
        <MetricCard label="Current Balance" value={profile ? money(profile.principal_balance) : '-'} tone="amber" />
        <MetricCard label="Home Equity" value={metrics.propertyEstimate > 0 ? money(metrics.equity) : '-'} tone="green" />
        <MetricCard label="Equity Share" value={metrics.equityPercent !== null ? `${metrics.equityPercent.toFixed(1)}%` : '-'} tone="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
        <section className="xl:col-span-2 bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{icons.property} Property Equity</h2>
              <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{profile?.property_address_line1 || 'Property address'}</p>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-300">{profile?.property_address_line2 || 'Stored in local database'}</p>
            </div>
            <div className="text-right text-xs text-gray-400">
              <div>{loadingEstimate ? 'Loading estimate' : 'Primary estimate'}</div>
              {estimate
                ? <a className="font-bold text-emerald-600 dark:text-emerald-300 hover:underline" href={estimate.url} target="_blank" rel="noreferrer">{estimate.source}</a>
                : <span className="font-bold text-gray-400">No source</span>}
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Equity vs Debt</span>
              <span className="money-value text-xs font-bold text-gray-500 dark:text-gray-300">
                {metrics.equityPercent !== null && metrics.ltv !== null ? `${metrics.equityPercent.toFixed(1)}% equity / ${metrics.ltv.toFixed(1)}% debt` : '-'}
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, metrics.equityPercent || 0))}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DetailTile label="Loan To Value" value={metrics.ltv !== null ? `${metrics.ltv.toFixed(2)}%` : '-'} />
            <DetailTile label="Est. Principal + Interest" value={metrics.estimatedPayment !== null ? money(metrics.estimatedPayment) : '-'} />
            <DetailTile label="Daily Interest" value={metrics.dailyInterest !== null ? money(metrics.dailyInterest) : '-'} />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{icons.sources} Online Value Sources</h2>
          {estimateData.estimates.length === 0 && <div className="py-6 text-sm text-gray-400">No property estimate sources are stored yet.</div>}
          {estimateData.estimates.map((sourceEstimate) => (
            <SourceRow
              key={`${sourceEstimate.source}-${sourceEstimate.date}`}
              label={sourceEstimate.source}
              value={wholeMoney(sourceEstimate.value)}
              href={sourceEstimate.url}
              primary={sourceEstimate === estimate}
            />
          ))}
          <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-xs leading-5 text-amber-700 dark:text-amber-200">
            One estimate snapshot is kept per source per day. Updating again today overwrites today&apos;s saved value and preserves older dates for equity history.
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{icons.terms} Loan Terms</h2>
          <InfoGrid rows={[
            ['Origination Date', formatDate(profile?.origination_date)],
            ['Loan Maturity Date', formatDate(profile?.maturity_date)],
            ['Original Term', profile ? `${profile.original_term_months} months` : '-'],
            ['Remaining Term', profile ? `${profile.remaining_term_months} months` : '-'],
            ['Current Annual Interest Rate', profile ? `${(profile.annual_interest_rate * 100).toFixed(3)}%` : '-'],
            ['Months Paid', profile ? `${metrics.paidMonths} months` : '-']
          ]} />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{icons.progress} Term Progress</h2>
          <div className="flex items-end justify-between mb-3">
            <div className="money-value text-3xl font-black text-gray-900 dark:text-white">{metrics.termProgress !== null ? `${metrics.termProgress.toFixed(1)}%` : '-'}</div>
            <div className="money-value text-sm font-bold text-gray-400">{profile ? `${metrics.paidMonths} of ${profile.original_term_months} months` : '-'}</div>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
            <div className="h-full bg-blue-500" style={{ width: `${metrics.termProgress || 0}%` }} />
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-300">
            Mortgage details and online estimate sources are read from the local database. Estimate refreshes are cached as one saved snapshot per source per day.
          </p>
        </section>
      </div>
    </div>
  );
}

function calculateMetrics(profile: MortgageProfile | null, estimate: PropertyEstimate | null) {
  const propertyEstimate = estimate?.value || 0;
  const principal = profile?.principal_balance || 0;
  const originalTerm = profile?.original_term_months || 0;
  const remainingTerm = profile?.remaining_term_months || 0;
  const annualRate = profile?.annual_interest_rate || 0;
  const equity = propertyEstimate - principal;
  const ltv = propertyEstimate > 0 ? principal / propertyEstimate * 100 : null;
  const equityPercent = propertyEstimate > 0 ? equity / propertyEstimate * 100 : null;
  const paidMonths = Math.max(0, originalTerm - remainingTerm);
  const termProgress = originalTerm > 0 ? paidMonths / originalTerm * 100 : null;
  const monthlyRate = annualRate / 12;
  const estimatedPayment = principal > 0 && remainingTerm > 0 && monthlyRate > 0
    ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingTerm))
    : null;
  const dailyInterest = principal > 0 && annualRate > 0 ? principal * annualRate / 365 : null;
  return { propertyEstimate, equity, ltv, equityPercent, paidMonths, termProgress, estimatedPayment, dailyInterest };
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'green' | 'amber' | 'blue' }) {
  const toneClasses = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30'
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${toneClasses[tone]}`}>{label}</div>
      <div className="money-value mt-4 text-3xl font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
      <div className="money-value mt-2 text-lg font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function SourceRow({ label, value, href, primary = false }: { label: string; value: string; href: string; primary?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{label}</div>
          <div className="text-xs text-gray-400">{primary ? 'Primary estimate' : 'Reference estimate'}</div>
        </div>
        <div className="money-value text-lg font-black text-gray-900 dark:text-white">{value}</div>
      </div>
    </a>
  );
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
          <div className="money-value mt-2 text-sm font-black text-gray-900 dark:text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function formatDate(date: string | null | undefined) {
  if (!date) return 'Unknown';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
