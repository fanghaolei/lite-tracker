import { money, wholeMoney } from '../../finance';
import type { MortgageMetrics } from '../../domain/mortgage';
import type { MortgageProfile } from '../../types';
import { MetricCard } from './MortgageTiles';

type MortgageStatsGridProps = {
  profile: MortgageProfile | null;
  metrics: MortgageMetrics;
};

export function MortgageStatsGrid({ profile, metrics }: MortgageStatsGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-8" id="mortgage-stats">
      <MetricCard label="Estimated Value" value={metrics.propertyEstimate > 0 ? wholeMoney(metrics.propertyEstimate) : '-'} tone="emerald" />
      <MetricCard label="Current Balance" value={profile ? money(profile.principal_balance) : '-'} tone="amber" />
      <MetricCard label="Home Equity" value={metrics.propertyEstimate > 0 ? money(metrics.equity) : '-'} tone="green" />
      <MetricCard label="Equity Share" value={metrics.equityPercent !== null ? `${metrics.equityPercent.toFixed(1)}%` : '-'} tone="blue" />
    </div>
  );
}
