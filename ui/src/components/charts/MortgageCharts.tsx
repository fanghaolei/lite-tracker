import { memo, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { MortgagePayoffPoint } from '../../domain/mortgage';
import { wholeMoney } from '../../finance';
import { getThemeColors } from '../../hooks';
import {
  axisTick,
  EmptyChart,
  formatAxisMoney,
  renderLegendText,
  TooltipShell,
  type TooltipContentProps
} from './ChartShared';

type MortgagePayoffProps = {
  schedule: MortgagePayoffPoint[];
  privacyMode: boolean;
  themeSignal: string;
};

export const MortgagePayoffChart = memo(function MortgagePayoffChart({
  schedule,
  privacyMode,
  themeSignal
}: MortgagePayoffProps) {
  void themeSignal;
  const colors = getThemeColors();
  const hasEquity = useMemo(() => schedule.some(point => point.equity !== null), [schedule]);
  const data = useMemo(() => schedule.map(point => ({
    ...point,
    equity: point.equity ?? undefined
  })), [schedule]);

  if (data.length === 0) return <EmptyChart label="No mortgage schedule yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 2 }}>
        <defs>
          <linearGradient id="loanBalanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#d97706" stopOpacity={0.16} />
            <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" tick={axisTick(colors.text)} minTickGap={18} tickMargin={8} />
        <YAxis tickFormatter={value => formatAxisMoney(value, privacyMode)} tick={axisTick(colors.text)} width={72} />
        <Tooltip cursor={{ stroke: colors.grid }} content={props => <MortgageTooltip {...props} privacyMode={privacyMode} />} />
        <Legend formatter={value => renderLegendText(value, colors.text)} />
        <Area type="monotone" dataKey="balance" name="Loan Balance" stroke="#d97706" strokeWidth={2} fill="url(#loanBalanceFill)" dot={false} isAnimationActive={false} />
        {hasEquity && <Line type="monotone" dataKey="equity" name="Projected Equity" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
});

function MortgageTooltip({ active, label, payload, privacyMode }: TooltipContentProps & { privacyMode: boolean }) {
  const data = payload?.[0]?.payload || {};
  return (
    <TooltipShell active={active}>
      <div className="font-black text-gray-900 dark:text-white">{label}</div>
      {payload?.map(item => (
        <div key={String(item.dataKey)}>{String(item.name || item.dataKey)}: {privacyMode ? '$***' : wholeMoney(Number(item.value || 0))}</div>
      ))}
      <div>Interest paid: {privacyMode ? '$***' : wholeMoney(Number(data.interestPaid || 0))}</div>
    </TooltipShell>
  );
}
