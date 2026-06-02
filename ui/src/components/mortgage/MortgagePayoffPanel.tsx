import { formatMortgageDate, mortgageIcons, type MortgagePayoff } from '../../domain/mortgage';
import { money } from '../../finance';
import type { MortgageProfile } from '../../types';
import { MortgagePayoffChart } from '../Charts';
import { DetailTile } from './MortgageTiles';

type MortgagePayoffPanelProps = {
  payoff: MortgagePayoff;
  profile: MortgageProfile | null;
  privacyMode: boolean;
  themeSignal: string;
};

export function MortgagePayoffPanel({ payoff, profile, privacyMode, themeSignal }: MortgagePayoffPanelProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <section className="xl:col-span-2 bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6 h-[420px]">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{mortgageIcons.progress} Mortgage Payoff</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-300">Projected balance, equity, and interest over the remaining term.</p>
          </div>
          <div className="text-right text-xs font-bold text-gray-400">
            Payoff: <span className="money-value text-gray-700 dark:text-gray-200">{formatMortgageDate(payoff.projectedPayoffDate)}</span>
          </div>
        </div>
        <div className="h-72">
          <MortgagePayoffChart schedule={payoff.schedule} privacyMode={privacyMode} themeSignal={themeSignal} />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">Payoff Summary</h2>
        <div className="grid grid-cols-1 gap-3">
          <DetailTile label="Monthly Equity" value={payoff.monthlyEquity !== null ? money(payoff.monthlyEquity) : '-'} />
          <DetailTile label="Monthly Interest" value={payoff.monthlyInterest !== null ? money(payoff.monthlyInterest) : '-'} />
          <DetailTile label="Total Interest To Pay" value={payoff.totalInterest !== null ? money(payoff.totalInterest) : '-'} />
          <DetailTile label="Principal To Pay" value={profile ? money(profile.principal_balance) : '-'} />
          <DetailTile label="Interest Share" value={payoff.interestShare !== null ? `${payoff.interestShare.toFixed(1)}%` : '-'} />
        </div>
      </section>
    </div>
  );
}
