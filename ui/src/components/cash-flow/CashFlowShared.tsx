import type { ReactNode } from 'react';
import { money } from '../../finance';
import type { Holding } from '../../types';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-gray-400 uppercase ml-0.5">{label}</label>
      {children}
    </div>
  );
}

export function CashAccountSelect({
  value,
  accounts,
  onChange,
  compact = false
}: {
  value: string;
  accounts: Holding[];
  onChange: (account: string) => void;
  compact?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className={`${compact ? 'min-w-36 px-3 py-2 text-xs' : 'w-full px-4 py-3'} bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 transition-all`}
    >
      <option value="">Select account</option>
      {accounts.map(account => <option key={account.id} value={account.account}>{account.account} ({money(account.shares)})</option>)}
    </select>
  );
}

export function SummaryTile({
  label,
  value,
  tone,
  compact = false
}: {
  label: string;
  value: string;
  tone: 'emerald' | 'green' | 'amber' | 'gray';
  compact?: boolean;
}) {
  const toneClasses = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-800'
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${toneClasses[tone]}`}>{label}</div>
      <div className={`${compact ? 'text-lg' : 'text-3xl'} mt-4 font-black text-gray-900 dark:text-white`}>{value}</div>
    </div>
  );
}
