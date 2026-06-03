import { memo } from 'react';
import type { DisplayCashFlowItem } from '../../domain/cashFlow';
import { CashFlowTimelineChart } from '../charts/CashFlowCharts';

const calendarIcon = String.fromCodePoint(0x1F4C5);

type CashFlowTimelinePanelProps = {
  items: DisplayCashFlowItem[];
  privacyMode: boolean;
  themeSignal: string;
  timelineRange: string;
  timelineWidth: string;
};

export const CashFlowTimelinePanel = memo(function CashFlowTimelinePanel({
  items,
  privacyMode,
  themeSignal,
  timelineRange,
  timelineWidth
}: CashFlowTimelinePanelProps) {
  return (
    <div className="mb-8">
      <section className="bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{calendarIcon} Cash Flow Timeline</h2>
            <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-300">{timelineRange}</div>
          </div>
        </div>
        <div className="overflow-x-auto pb-3">
          <div className="h-[360px] min-w-[1120px]" style={{ width: timelineWidth }}>
            <CashFlowTimelineChart items={items} privacyMode={privacyMode} themeSignal={themeSignal} />
          </div>
        </div>
      </section>
    </div>
  );
});
