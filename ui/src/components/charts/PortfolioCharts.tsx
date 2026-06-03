import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getThemeColors } from '../../hooks';
import { getPalette, wholeMoney } from '../../finance';
import type { AssetType, HistoryPoint } from '../../types';
import {
  axisTick,
  EmptyChart,
  formatAxisMoney,
  paddedMoneyDomain,
  sumValues,
  TooltipShell,
  type TooltipContentProps
} from './ChartShared';

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  stock: '#059669',
  fund: '#84cc16',
  'cash equivalents': '#d97706',
  crypto: '#0f766e',
  other: '#475569'
};

type PortfolioLineProps = {
  history: HistoryPoint[];
  privacyMode: boolean;
  themeSignal: string;
};

type PortfolioAllocation = {
  label: string;
  value: number;
  asset_type?: AssetType;
};

type PortfolioPieProps = {
  allocations: PortfolioAllocation[];
  privacyMode: boolean;
  themeSignal: string;
  mode: 'ticker' | 'type';
};

export const PortfolioLineChart = memo(function PortfolioLineChart({ history, privacyMode, themeSignal }: PortfolioLineProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = useMemo(() => history.map(point => ({
    date: point.date,
    value: point.value,
    sourceLabel: point.source === 'snapshot' ? 'Snapshot' : 'Backfill'
  })), [history]);
  const yDomain = useMemo(() => paddedMoneyDomain(data.map(point => point.value)), [data]);

  if (data.length === 0) return <EmptyChart label="No portfolio history yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 2 }}>
        <defs>
          <linearGradient id="portfolioLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="date" tick={axisTick(colors.text)} minTickGap={28} tickMargin={8} />
        <YAxis domain={yDomain} tickFormatter={value => formatAxisMoney(value, privacyMode)} tick={axisTick(colors.text)} width={72} />
        <Tooltip cursor={{ stroke: colors.grid }} content={props => <PortfolioTooltip {...props} privacyMode={privacyMode} />} />
        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#portfolioLineFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export const PortfolioAllocationPieChart = memo(function PortfolioAllocationPieChart({
  allocations,
  privacyMode,
  themeSignal,
  mode
}: PortfolioPieProps) {
  void themeSignal;
  const colors = getThemeColors();
  const palette = useMemo(() => getPalette(), []);
  const data = useMemo(() => allocations.filter(item => item.value > 0), [allocations]);
  const total = useMemo(() => sumValues(data), [data]);

  if (data.length === 0) return <EmptyChart label="No allocation data yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={props => <AllocationTooltip {...props} privacyMode={privacyMode} total={total} />} />
        <Pie data={data} dataKey="value" nameKey="label" outerRadius="86%" paddingAngle={1} stroke={colors.border} strokeWidth={2} isAnimationActive={false}>
          {data.map((item, index) => <Cell key={item.label} fill={allocationColor(item, index, mode, palette)} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
});

function PortfolioTooltip({ active, label, payload, privacyMode }: TooltipContentProps & { privacyMode: boolean }) {
  const point = payload?.[0]?.payload || {};
  const value = Number(payload?.[0]?.value || 0);
  return (
    <TooltipShell active={active}>
      <div className="font-black text-gray-900 dark:text-white">{label}</div>
      <div>Portfolio: {privacyMode ? '$***' : wholeMoney(value)}</div>
      <div>Source: {String(point.sourceLabel || 'Backfill')}</div>
    </TooltipShell>
  );
}

function AllocationTooltip({ active, payload, privacyMode, total }: TooltipContentProps & { privacyMode: boolean; total: number }) {
  const item = payload?.[0];
  const value = Number(item?.value || 0);
  const percent = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
  return (
    <TooltipShell active={active}>
      <div className="font-black text-gray-900 dark:text-white">{String(item?.name || '')}</div>
      <div>{privacyMode ? '$***' : wholeMoney(value)} ({percent}%)</div>
    </TooltipShell>
  );
}

function allocationColor(item: PortfolioAllocation, index: number, mode: 'ticker' | 'type', palette: string[]) {
  if (mode === 'type') return ASSET_TYPE_COLORS[item.asset_type || 'other'];
  return palette[index % palette.length];
}
