import { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { wholeMoney } from '../../finance';
import { getThemeColors } from '../../hooks';
import {
  axisTick,
  EmptyChart,
  formatAxisMoney,
  formatFullDate,
  renderLegendText,
  TooltipShell,
  type TooltipContentProps
} from './ChartShared';

type CashFlowTimelineItem = {
  name: string;
  category: string;
  flow_type?: 'income' | 'expense';
  amount: number;
  due_date: string;
  is_paid: boolean;
};

type CashFlowTimelineProps = {
  items: CashFlowTimelineItem[];
  privacyMode: boolean;
  themeSignal: string;
};

type CashFlowChartDatum = {
  date: string;
  label: string;
  income: number;
  payments: number;
  incomeNames: string;
  paymentNames: string;
  paymentColor: string;
};

type CashFlowGroup = {
  income: number;
  payments: number;
  incomeNames: string[];
  paymentNames: string[];
  paymentCategory: string;
};

export const CashFlowTimelineChart = memo(function CashFlowTimelineChart({
  items,
  privacyMode,
  themeSignal
}: CashFlowTimelineProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = useMemo(() => buildCashFlowData(items), [items]);

  if (data.length === 0) return <EmptyChart label="No upcoming cash flows." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" interval={0} tick={axisTick(colors.text, 10, 700)} tickMargin={8} height={52} />
        <YAxis tickFormatter={value => formatAxisMoney(value, privacyMode)} tick={axisTick(colors.text)} width={72} />
        <Tooltip content={props => <CashFlowTooltip {...props} privacyMode={privacyMode} />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
        <Legend formatter={value => renderLegendText(value, colors.text)} />
        <Bar dataKey="income" name="Income" fill="#34d399" radius={[8, 8, 8, 8]} maxBarSize={34} isAnimationActive={false} />
        <Bar dataKey="payments" name="Payments" radius={[8, 8, 8, 8]} maxBarSize={34} isAnimationActive={false}>
          {data.map(item => <Cell key={item.date} fill={item.paymentColor} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

function CashFlowTooltip({ active, payload, label, privacyMode }: TooltipContentProps & { privacyMode: boolean }) {
  const data = payload?.[0]?.payload || {};
  const income = Number(data.income || 0);
  const payments = Math.abs(Number(data.payments || 0));
  return (
    <TooltipShell active={active}>
      <div className="font-black text-gray-900 dark:text-white">{label}</div>
      {income > 0 && <div>In: {privacyMode ? '$***' : wholeMoney(income)} {data.incomeNames ? `(${String(data.incomeNames)})` : ''}</div>}
      {payments > 0 && <div>Out: {privacyMode ? '$***' : wholeMoney(payments)} {data.paymentNames ? `(${String(data.paymentNames)})` : ''}</div>}
    </TooltipShell>
  );
}

function buildCashFlowData(items: CashFlowTimelineItem[]): CashFlowChartDatum[] {
  const groups = new Map<string, CashFlowGroup>();

  items.forEach(item => {
    if (item.is_paid) return;
    const group = groups.get(item.due_date) || {
      income: 0,
      payments: 0,
      incomeNames: [],
      paymentNames: [],
      paymentCategory: ''
    };

    if (item.flow_type === 'income') {
      group.income += item.amount;
      group.incomeNames.push(item.name);
    } else {
      group.payments -= item.amount;
      group.paymentNames.push(item.name);
      if (!group.paymentCategory) group.paymentCategory = item.category;
    }

    groups.set(item.due_date, group);
  });

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, group]) => ({
      date,
      label: formatFullDate(date),
      income: group.income,
      payments: group.payments,
      incomeNames: group.incomeNames.join(', '),
      paymentNames: group.paymentNames.join(', '),
      paymentColor: getCashFlowColor(group.paymentCategory)
    }));
}

function getCashFlowColor(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('credit')) return '#60a5fa';
  if (normalized.includes('rent') || normalized.includes('mortgage')) return '#f97316';
  if (normalized.includes('utility') || normalized.includes('bill')) return '#34d399';
  if (normalized.includes('loan')) return '#f472b6';
  return '#fbbf24';
}
