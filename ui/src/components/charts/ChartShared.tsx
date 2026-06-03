import type { ReactNode } from 'react';

export type ChartDatum = Record<string, unknown>;

export type TooltipPayload = {
  name?: string | number;
  value?: unknown;
  dataKey?: unknown;
  payload?: ChartDatum;
};

export type TooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: readonly TooltipPayload[];
};

export function TooltipShell({ active, children }: { active?: boolean; children: ReactNode }) {
  if (!active) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-600 shadow-lg dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200">
      {children}
    </div>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm font-bold text-gray-400">
      {label}
    </div>
  );
}

export function renderLegendText(value: unknown, color: string) {
  return <span style={{ color, fontSize: 11, fontWeight: 700 }}>{String(value)}</span>;
}

export function sumValues(items: { value: number }[]) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

export function axisTick(fill: string, fontSize = 10, fontWeight: number | string = 400) {
  return { fill, fontSize, fontWeight };
}

export function formatAxisMoney(value: unknown, privacyMode: boolean) {
  const numeric = Number(value);
  if (privacyMode) return numeric < 0 ? '-$***' : '$***';
  return `${numeric < 0 ? '-' : ''}$${Math.abs(numeric).toLocaleString()}`;
}

export function paddedMoneyDomain(values: number[]): [number, number] {
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

export function formatFullDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
