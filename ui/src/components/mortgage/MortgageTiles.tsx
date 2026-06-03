export function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'green' | 'amber' | 'blue' }) {
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

export function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</div>
      <div className="money-value mt-2 text-lg font-black text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}
