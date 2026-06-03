import { buildLoanTermRows, formatMortgageDate, mortgageIcons, type MortgageMetrics, type MortgagePayoff } from '../../domain/mortgage';
import { money } from '../../finance';
import type { MortgageProfile } from '../../types';
import { MortgagePayoffChart } from '../charts/MortgageCharts';

type MortgagePayoffPanelProps = {
  payoff: MortgagePayoff;
  profile: MortgageProfile | null;
  metrics: MortgageMetrics;
  privacyMode: boolean;
  themeSignal: string;
};

export function MortgagePayoffPanel({ payoff, profile, metrics, privacyMode, themeSignal }: MortgagePayoffPanelProps) {
  const summaryRows = buildMortgageSummaryRows(profile, metrics, payoff);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
      <section className="xl:col-span-2 bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6 h-[420px]">
        <div className="mb-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{mortgageIcons.progress} Mortgage Payoff</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500 dark:text-gray-300">Projected balance, equity, and interest over the remaining term.</p>
          </div>
        </div>
        <div className="h-72">
          <MortgagePayoffChart schedule={payoff.schedule} privacyMode={privacyMode} themeSignal={themeSignal} />
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">Loan Summary</h2>
        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {summaryRows.map(row => (
                <tr key={`${row.section}-${row.label}`} className="bg-gray-50/60 dark:bg-gray-900/40">
                  <td className="w-20 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">{row.section}</td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400">{row.label}</td>
                  <td className="money-value px-3 py-2 text-right font-black text-gray-900 dark:text-white whitespace-nowrap">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function buildMortgageSummaryRows(profile: MortgageProfile | null, metrics: MortgageMetrics, payoff: MortgagePayoff) {
  const payoffRows = [
    ['Projected Payoff', formatMortgageDate(payoff.projectedPayoffDate)],
    ['Monthly Equity', payoff.monthlyEquity !== null ? money(payoff.monthlyEquity) : '-'],
    ['Monthly Interest', payoff.monthlyInterest !== null ? money(payoff.monthlyInterest) : '-'],
    ['Total Interest To Pay', payoff.totalInterest !== null ? money(payoff.totalInterest) : '-'],
    ['Interest Share', payoff.interestShare !== null ? `${payoff.interestShare.toFixed(1)}%` : '-']
  ];

  return [
    ...payoffRows.map(([label, value]) => ({ section: 'Payoff', label, value })),
    ...buildLoanTermRows(profile, metrics).map(([label, value]) => ({ section: 'Terms', label, value }))
  ];
}
