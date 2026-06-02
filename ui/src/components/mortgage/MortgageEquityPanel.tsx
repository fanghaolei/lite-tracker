import { money, wholeMoney } from '../../finance';
import { mortgageIcons, type MortgageMetrics } from '../../domain/mortgage';
import type { MortgageEstimateResponse, MortgageProfile, PropertyEstimate } from '../../types';
import { DetailTile } from './MortgageTiles';

type MortgageEquityPanelProps = {
  profile: MortgageProfile | null;
  estimateData: MortgageEstimateResponse;
  estimate: PropertyEstimate | null;
  metrics: MortgageMetrics;
  loadingEstimate: boolean;
};

export function MortgageEquityPanel({ profile, estimateData, estimate, metrics, loadingEstimate }: MortgageEquityPanelProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <section className="xl:col-span-2 bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{mortgageIcons.property} Property Equity</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <ProgressCard
            label="Equity vs Debt"
            value={metrics.equityPercent !== null && metrics.ltv !== null ? `${metrics.equityPercent.toFixed(1)}% equity / ${metrics.ltv.toFixed(1)}% debt` : '-'}
            percent={metrics.equityPercent}
            barClassName="bg-emerald-500"
          />
          <ProgressCard
            label="Term Progress"
            value={profile ? `${metrics.paidMonths} of ${profile.original_term_months} months` : '-'}
            percent={metrics.termProgress}
            barClassName="bg-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DetailTile label="Loan To Value" value={metrics.ltv !== null ? `${metrics.ltv.toFixed(2)}%` : '-'} />
          <DetailTile label="Est. Principal + Interest" value={metrics.estimatedPayment !== null ? money(metrics.estimatedPayment) : '-'} />
          <DetailTile label="Daily Interest" value={metrics.dailyInterest !== null ? money(metrics.dailyInterest) : '-'} />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{mortgageIcons.sources} Online Value Sources</h2>
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
  );
}

function ProgressCard({ label, value, percent, barClassName }: { label: string; value: string; percent: number | null; barClassName: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="money-value text-xs font-bold text-gray-500 dark:text-gray-300">{value}</span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-white dark:bg-gray-950">
        <div className={`h-full ${barClassName}`} style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }} />
      </div>
      <div className="money-value mt-3 text-2xl font-black text-gray-900 dark:text-white">{percent !== null ? `${percent.toFixed(1)}%` : '-'}</div>
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
