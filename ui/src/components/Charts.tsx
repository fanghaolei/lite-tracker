import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { getThemeColors } from '../hooks';
import { getPalette, wholeMoney } from '../finance';
import type { AssetType, HistoryPoint } from '../types';

type ChartDatum = Record<string, unknown>;
type TooltipPayload = {
  name?: string | number;
  value?: unknown;
  dataKey?: unknown;
  payload?: ChartDatum;
};
type TooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipPayload[];
};

type LineProps = {
  history: HistoryPoint[];
  privacyMode: boolean;
  themeSignal: string;
};

export function PortfolioLineChart({ history, privacyMode, themeSignal }: LineProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = history.map(point => ({
    date: point.date,
    value: point.value,
    sourceLabel: point.source === 'snapshot' ? 'Snapshot' : 'Backfill'
  }));
  const yDomain = paddedMoneyDomain(data.map(point => point.value));

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
}

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

export function PortfolioAllocationPieChart({ allocations, privacyMode, themeSignal, mode }: PortfolioPieProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = allocations.filter(item => item.value > 0);

  if (data.length === 0) return <EmptyChart label="No allocation data yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={props => <AllocationTooltip {...props} privacyMode={privacyMode} total={sumValues(data)} />} />
        <Pie data={data} dataKey="value" nameKey="label" outerRadius="86%" paddingAngle={1} stroke={colors.border} strokeWidth={2} isAnimationActive={false}>
          {data.map((item, index) => <Cell key={item.label} fill={allocationColor(item, index, mode)} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

type DoughnutProps = {
  allocations: { account: string; value: number }[];
  privacyMode: boolean;
  themeSignal: string;
};

export function AccountDoughnutChart({ allocations, privacyMode, themeSignal }: DoughnutProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = allocations.filter(item => item.value > 0).map(item => ({ label: item.account, value: item.value }));

  if (data.length === 0) return <EmptyChart label="No account allocation data yet." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip content={props => <AllocationTooltip {...props} privacyMode={privacyMode} total={sumValues(data)} />} />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          formatter={value => <span style={{ color: colors.text, fontSize: 11, fontWeight: 700 }}>{String(value)}</span>}
        />
        <Pie data={data} dataKey="value" nameKey="label" cx="38%" innerRadius="58%" outerRadius="84%" paddingAngle={2} stroke={colors.border} strokeWidth={2} isAnimationActive={false}>
          {data.map((item, index) => <Cell key={item.label} fill={getPalette()[index % getPalette().length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

type CashFlowTimelineProps = {
  items: { name: string; category: string; flow_type?: 'income' | 'expense'; amount: number; due_date: string; is_paid: boolean }[];
  privacyMode: boolean;
  themeSignal: string;
};

export function CashFlowTimelineChart({ items, privacyMode, themeSignal }: CashFlowTimelineProps) {
  void themeSignal;
  const colors = getThemeColors();
  const data = buildCashFlowData(items);

  if (data.length === 0) return <EmptyChart label="No upcoming cash flows." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" interval={0} tick={axisTick(colors.text, 10, 700)} tickMargin={8} height={52} />
        <YAxis tickFormatter={value => formatAxisMoney(value, privacyMode)} tick={axisTick(colors.text)} width={72} />
        <Tooltip content={props => <CashFlowTooltip {...props} privacyMode={privacyMode} />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
        <Legend formatter={value => <span style={{ color: colors.text, fontSize: 11, fontWeight: 700 }}>{String(value)}</span>} />
        <Bar dataKey="income" name="Income" fill="#34d399" radius={[8, 8, 8, 8]} maxBarSize={34} isAnimationActive={false} />
        <Bar dataKey="payments" name="Payments" radius={[8, 8, 8, 8]} maxBarSize={34} isAnimationActive={false}>
          {data.map(item => <Cell key={String(item.date)} fill={String(item.paymentColor)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

type MortgagePayoffPoint = {
  label: string;
  balance: number;
  equity: number | null;
  interestPaid: number;
};

type MortgagePayoffProps = {
  schedule: MortgagePayoffPoint[];
  privacyMode: boolean;
  themeSignal: string;
};

export function MortgagePayoffChart({ schedule, privacyMode, themeSignal }: MortgagePayoffProps) {
  void themeSignal;
  const colors = getThemeColors();
  const hasEquity = schedule.some(point => point.equity !== null);
  const data = schedule.map(point => ({
    ...point,
    equity: point.equity ?? undefined
  }));

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
        <Legend formatter={value => <span style={{ color: colors.text, fontSize: 11, fontWeight: 700 }}>{String(value)}</span>} />
        <Area type="monotone" dataKey="balance" name="Loan Balance" stroke="#d97706" strokeWidth={2} fill="url(#loanBalanceFill)" dot={false} isAnimationActive={false} />
        {hasEquity && <Line type="monotone" dataKey="equity" name="Projected Equity" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

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

function MortgageTooltip({ active, label, payload, privacyMode }: TooltipContentProps & { privacyMode: boolean }) {
  const data = payload?.[0]?.payload || {};
  return (
    <TooltipShell active={active}>
      <div className="font-black text-gray-900 dark:text-white">{label}</div>
      {payload?.map(item => (
        <div key={String(item.dataKey)}>{item.name}: {privacyMode ? '$***' : wholeMoney(Number(item.value || 0))}</div>
      ))}
      <div>Interest paid: {privacyMode ? '$***' : wholeMoney(Number(data.interestPaid || 0))}</div>
    </TooltipShell>
  );
}

function TooltipShell({ active, children }: { active?: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200">
      {children}
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
      {label}
    </div>
  );
}

function buildCashFlowData(items: CashFlowTimelineProps['items']): ChartDatum[] {
  const upcoming = [...items]
    .filter(item => !item.is_paid)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const dates = [...new Set(upcoming.map(item => item.due_date))];

  return dates.map(date => {
    const incomeItems = upcoming.filter(item => item.due_date === date && item.flow_type === 'income');
    const paymentItems = upcoming.filter(item => item.due_date === date && item.flow_type !== 'income');
    return {
      date,
      label: formatFullDate(date),
      income: sumAmounts(incomeItems),
      payments: -sumAmounts(paymentItems),
      incomeNames: incomeItems.map(item => item.name).join(', '),
      paymentNames: paymentItems.map(item => item.name).join(', '),
      paymentColor: getCashFlowColor(paymentItems[0]?.category || '')
    };
  });
}

function allocationColor(item: PortfolioAllocation, index: number, mode: 'ticker' | 'type') {
  if (mode === 'type') {
    const typeColors: Record<AssetType, string> = {
      stock: '#059669',
      fund: '#84cc16',
      'cash equivalents': '#d97706',
      crypto: '#0f766e',
      other: '#475569'
    };
    return typeColors[item.asset_type || 'other'];
  }
  const palette = getPalette();
  return palette[index % palette.length];
}

function sumValues(items: { value: number }[]) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

function sumAmounts(items: { amount: number }[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function axisTick(fill: string, fontSize = 10, fontWeight: number | string = 400) {
  return { fill, fontSize, fontWeight };
}

function formatAxisMoney(value: unknown, privacyMode: boolean) {
  const numeric = Number(value);
  if (privacyMode) return numeric < 0 ? '-$***' : '$***';
  return `${numeric < 0 ? '-' : ''}$${Math.abs(numeric).toLocaleString()}`;
}

function paddedMoneyDomain(values: number[]): [number, number] {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return [0, 1];

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const span = max - min;
  const base = Math.max(Math.abs(max), Math.abs(min), 1);
  const padding = span > 0 ? span * 0.12 : base * 0.02;

  return [
    Math.max(0, Math.floor(min - padding)),
    Math.ceil(max + padding)
  ];
}

function getCashFlowColor(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('credit')) return '#60a5fa';
  if (normalized.includes('rent') || normalized.includes('mortgage')) return '#f97316';
  if (normalized.includes('utility') || normalized.includes('bill')) return '#34d399';
  if (normalized.includes('loan')) return '#f472b6';
  return '#fbbf24';
}

function formatFullDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
