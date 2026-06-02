import type { AssetType, HistoryPoint } from '../../types';
import { PortfolioAllocationPieChart, PortfolioLineChart } from '../Charts';
import { PieModeIcon } from '../Icons';

type PortfolioChartsPanelProps = {
  history: HistoryPoint[];
  allocations: { label: string; value: number; asset_type?: AssetType }[];
  privacyMode: boolean;
  themeSignal: string;
  pieMode: 'ticker' | 'type';
  onTogglePieMode: () => void;
};

export function PortfolioChartsPanel({
  history,
  allocations,
  privacyMode,
  themeSignal,
  pieMode,
  onTogglePieMode
}: PortfolioChartsPanelProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 mb-8">
      <div className="bg-white dark:bg-indigo-950/50 rounded-3xl shadow-xl shadow-emerald-200/20 dark:shadow-none border border-emerald-100 dark:border-emerald-900/30 p-6 h-72 overflow-hidden">
        <div className="chart-container">
          <PortfolioLineChart history={history} privacyMode={privacyMode} themeSignal={themeSignal} />
        </div>
      </div>
      <div className="relative bg-white dark:bg-indigo-950/50 rounded-3xl shadow-xl shadow-emerald-200/20 dark:shadow-none border border-emerald-100 dark:border-emerald-900/30 p-6 h-72 overflow-hidden">
        <button
          type="button"
          onClick={onTogglePieMode}
          aria-label={pieMode === 'ticker' ? 'Show allocation by type' : 'Show allocation by ticker'}
          title={pieMode === 'ticker' ? 'Show by type' : 'Show by ticker'}
          className="absolute right-4 top-4 z-10 rounded-full bg-emerald-50 p-2 text-emerald-700 shadow-sm hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
        >
          <PieModeIcon />
        </button>
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-emerald-600">
          {pieMode === 'ticker' ? 'Allocation by Ticker' : 'Allocation by Type'}
        </div>
        <div className="h-[13.5rem]">
          <PortfolioAllocationPieChart allocations={allocations} privacyMode={privacyMode} themeSignal={themeSignal} mode={pieMode} />
        </div>
      </div>
    </div>
  );
}
