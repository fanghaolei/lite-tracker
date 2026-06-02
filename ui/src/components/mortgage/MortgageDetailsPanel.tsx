import { buildLoanTermRows, mortgageIcons, type MortgageMetrics } from '../../domain/mortgage';
import type { MortgageProfile } from '../../types';
import { InfoGrid } from './MortgageTiles';

type MortgageDetailsPanelProps = {
  profile: MortgageProfile | null;
  metrics: MortgageMetrics;
};

export function MortgageDetailsPanel({ profile, metrics }: MortgageDetailsPanelProps) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{mortgageIcons.terms} Loan Terms</h2>
      <InfoGrid rows={buildLoanTermRows(profile, metrics)} />
    </section>
  );
}
