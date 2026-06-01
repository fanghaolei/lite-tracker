import { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PieController,
  PointElement,
  Tooltip
} from 'chart.js';
import { getThemeColors } from '../hooks';
import { getPalette, wholeMoney } from '../finance';
import type { AssetType, HistoryPoint } from '../types';

Chart.register(
  LineController,
  PieController,
  DoughnutController,
  BarController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

type LineProps = {
  history: HistoryPoint[];
  privacyMode: boolean;
  themeSignal: string;
};

export function PortfolioLineChart({ history, privacyMode, themeSignal }: LineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return undefined;
    const colors = getThemeColors();
    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: history.map(point => point.date),
        datasets: [{
          label: 'Portfolio',
          data: history.map(point => point.value),
          borderColor: '#3b82f6',
          backgroundColor: colors.bg,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => {
                const value = context.parsed.y || 0;
                return privacyMode ? 'Portfolio: $***' : `Portfolio: ${wholeMoney(value)}`;
              },
              afterLabel: context => {
                const point = history[context.dataIndex];
                return `Source: ${point?.source === 'snapshot' ? 'Snapshot' : 'Backfill'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6, font: { size: 10 }, color: colors.text }
          },
          y: {
            grid: { color: colors.grid },
            ticks: {
              callback: value => privacyMode ? '$***' : '$' + Number(value).toLocaleString(),
              font: { size: 10 },
              color: colors.text
            }
          }
        }
      }
    });
    return () => chart.destroy();
  }, [history, privacyMode, themeSignal]);

  return <canvas ref={canvasRef} />;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const colors = getThemeColors();
    const total = allocations.reduce((sum, item) => sum + item.value, 0);
    const chart = new Chart(canvasRef.current, {
      type: 'pie',
      data: {
        labels: allocations.map(item => item.label),
        datasets: [{
          label: mode === 'type' ? 'By Type' : 'By Ticker',
          data: allocations.map(item => item.value),
          backgroundColor: allocationColors(allocations, mode),
          borderColor: colors.border,
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: context => {
                const value = Number(context.parsed || 0);
                const percent = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
                if (privacyMode) return `${context.label}: $*** (${percent}%)`;
                return `${context.label}: ${wholeMoney(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
    return () => chart.destroy();
  }, [allocations, mode, privacyMode, themeSignal]);

  return <canvas ref={canvasRef} />;
}

function allocationColors(allocations: PortfolioAllocation[], mode: 'ticker' | 'type'): string[] {
  if (mode === 'type') {
    const typeColors: Record<AssetType, string> = {
      stock: '#059669',
      fund: '#84cc16',
      'cash equivalents': '#d97706',
      crypto: '#0f766e',
      other: '#475569'
    };
    return allocations.map(item => typeColors[item.asset_type || 'other']);
  }
  const palette = getPalette();
  return allocations.map((_, index) => palette[index % palette.length]);
}

type DoughnutProps = {
  allocations: { account: string; value: number }[];
  privacyMode: boolean;
  themeSignal: string;
};

export function AccountDoughnutChart({ allocations, privacyMode, themeSignal }: DoughnutProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || allocations.length === 0) return undefined;
    const colors = getThemeColors();
    const total = allocations.reduce((sum, item) => sum + item.value, 0);
    const chart = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: allocations.map(item => item.account),
        datasets: [{
          label: 'Account Value',
          data: allocations.map(item => item.value),
          backgroundColor: getPalette(),
          borderColor: colors.border,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: colors.text,
              boxWidth: 12,
              boxHeight: 12,
              padding: 16,
              font: { size: 11, weight: 'bold' }
            }
          },
          tooltip: {
            callbacks: {
              label: context => {
                const value = Number(context.parsed || 0);
                const percent = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
                return privacyMode ? `${context.label}: $*** (***%)` : `${context.label}: ${wholeMoney(value)} (${percent}%)`;
              }
            }
          }
        }
      }
    });
    return () => chart.destroy();
  }, [allocations, privacyMode, themeSignal]);

  return <canvas ref={canvasRef} />;
}

type CashFlowTimelineProps = {
  items: { name: string; category: string; flow_type?: 'income' | 'expense'; amount: number; due_date: string; is_paid: boolean }[];
  privacyMode: boolean;
  themeSignal: string;
};

export function CashFlowTimelineChart({ items, privacyMode, themeSignal }: CashFlowTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const colors = getThemeColors();
    const upcoming = [...items]
      .filter(item => !item.is_paid)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const dates = [...new Set(upcoming.map(item => item.due_date))];
    const incomeByDate = dates.map(date => upcoming
      .filter(item => item.due_date === date && item.flow_type === 'income')
      .reduce((sum, item) => sum + item.amount, 0));
    const expenseByDate = dates.map(date => -upcoming
      .filter(item => item.due_date === date && item.flow_type !== 'income')
      .reduce((sum, item) => sum + item.amount, 0));

    const chart = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: dates.map(formatFullDate),
        datasets: [{
          label: 'Income',
          data: incomeByDate,
          backgroundColor: '#34d399',
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 34
        }, {
          label: 'Payments',
          data: expenseByDate,
          backgroundColor: dates.map(date => {
            const firstExpense = upcoming.find(item => item.due_date === date && item.flow_type !== 'income');
            return firstExpense ? getCashFlowColor(firstExpense.category) : '#f97316';
          }),
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 8,
          maxBarThickness: 34
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 6, right: 12, bottom: 4 } },
        plugins: {
          legend: {
            display: true,
            labels: { color: colors.text, boxWidth: 12, boxHeight: 12, font: { size: 11, weight: 'bold' } }
          },
          tooltip: {
            callbacks: {
              title: contexts => {
                const date = dates[contexts[0]?.dataIndex ?? 0];
                return date ? formatFullDate(date) : '';
              },
              label: context => {
                const date = dates[context.dataIndex];
                const entries = upcoming.filter(item => item.due_date === date && (context.dataset.label === 'Income' ? item.flow_type === 'income' : item.flow_type !== 'income'));
                const total = entries.reduce((sum, item) => sum + item.amount, 0);
                if (entries.length === 0) return '';
                const names = entries.map(item => item.name).join(', ');
                const prefix = context.dataset.label === 'Income' ? 'In' : 'Out';
                return privacyMode ? `${prefix}: $***` : `${prefix}: ${wholeMoney(total)} (${names})`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: colors.grid },
            ticks: {
              callback: value => {
                const numeric = Number(value);
                if (privacyMode) return numeric < 0 ? '-$***' : '$***';
                return `${numeric < 0 ? '-' : ''}$${Math.abs(numeric).toLocaleString()}`;
              },
              color: colors.text,
              font: { size: 10 }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              autoSkip: false,
              color: colors.text,
              font: { size: 11, weight: 'bold' }
            }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [items, privacyMode, themeSignal]);

  return <canvas ref={canvasRef} />;
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
