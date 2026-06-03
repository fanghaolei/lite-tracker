import { memo, useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { getPalette, wholeMoney } from '../../finance';
import { getThemeColors } from '../../hooks';
import { EmptyChart, renderLegendText, sumValues, TooltipShell, type TooltipContentProps } from './ChartShared';

type AccountDoughnutProps = {
  allocations: { account: string; value: number }[];
  privacyMode: boolean;
  themeSignal: string;
};

export const AccountDoughnutChart = memo(function AccountDoughnutChart({
  allocations,
  privacyMode,
  themeSignal
}: AccountDoughnutProps) {
  void themeSignal;
  const colors = getThemeColors();
  const palette = useMemo(() => getPalette(), []);
  const data = useMemo(() => allocations
    .filter(item => item.value > 0)
    .map(item => ({ label: item.account, value: item.value })), [allocations]);
  const total = useMemo(() => sumValues(data), [data]);

  if (data.length === 0) return <EmptyChart label="No account allocation data yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={props => <AllocationTooltip {...props} privacyMode={privacyMode} total={total} />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          formatter={value => renderLegendText(value, colors.text)}
        />
        <Pie data={data} dataKey="value" nameKey="label" cx="38%" innerRadius="58%" outerRadius="84%" paddingAngle={2} stroke={colors.border} strokeWidth={2} isAnimationActive={false}>
          {data.map((item, index) => <Cell key={item.label} fill={palette[index % palette.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
});

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
