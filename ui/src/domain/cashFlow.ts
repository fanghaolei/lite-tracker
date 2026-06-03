import type { CashFlowItem, RecurringCashFlow, RecurringCashFlowSkip } from '../types';

export type CashFlowType = 'income' | 'expense';
export type CashFlowCadence = 'biweekly' | 'monthly-first';

export type CashFlowFormState = {
  id?: number;
  auto_id?: number;
  is_auto: boolean;
  name: string;
  category: string;
  flow_type: CashFlowType;
  cash_account: string;
  amount: string;
  due_date: string;
  start_date: string;
  cadence: CashFlowCadence;
  is_paid: boolean;
  notes: string;
};

export type DisplayCashFlowItem = CashFlowItem & {
  automatic?: boolean;
  recurring_id?: number;
};

export type ProjectedCashFlowItem = DisplayCashFlowItem & {
  selectedAccount: string;
  remainingAfter: number | null;
};

export type DeleteChoice = {
  item: DisplayCashFlowItem;
};

export const RECURRING_LOOKBACK_DAYS = 365;
export const RECURRING_HORIZON_DAYS = 730;
export const CASH_RESOURCE_COLLAPSE_KEY = 'liteTracker.cashFlow.collapsedCashAccounts';

export const expenseCategories = ['Credit Card', 'Mortgage', 'Utility Bill', 'Loan', 'Insurance', 'Subscription', 'Other'];
export const incomeCategories = ['Salary', 'Bonus', 'Dividend', 'Transfer', 'Other Income'];

export function createEmptyCashFlowForm(date = todayIso()): CashFlowFormState {
  return {
    is_auto: false,
    name: '',
    category: 'Credit Card',
    flow_type: 'expense',
    cash_account: '',
    amount: '',
    due_date: date,
    start_date: date,
    cadence: 'biweekly',
    is_paid: false,
    notes: ''
  };
}

export function buildProjectedItems(items: DisplayCashFlowItem[], startingBalances: Record<string, number>): ProjectedCashFlowItem[] {
  const running = { ...startingBalances };
  return [...items]
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name))
    .map(item => {
      const selectedAccount = item.cash_account || '';
      let remainingAfter: number | null = null;
      if (!item.is_paid && selectedAccount) {
        const delta = item.flow_type === 'income' ? item.amount : -item.amount;
        running[selectedAccount] = (running[selectedAccount] || 0) + delta;
        remainingAfter = running[selectedAccount];
      }
      return { ...item, selectedAccount, remainingAfter };
    });
}

export function cashFlowOccurrenceKey(item: Pick<CashFlowItem, 'due_date' | 'name' | 'category' | 'flow_type' | 'amount'>) {
  return [
    item.due_date,
    item.name,
    item.category,
    item.flow_type || 'expense',
    Math.round(item.amount * 1000)
  ].join('|');
}

export function buildRecurringItems(
  startDate: string,
  daysAhead: number,
  templates: RecurringCashFlow[],
  skips: RecurringCashFlowSkip[]
): DisplayCashFlowItem[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  const items: DisplayCashFlowItem[] = [];
  const skippedDates = new Set(skips.map(skip => `${skip.recurring_cash_flow_id}:${skip.due_date}`));
  let id = -1;

  templates.filter(template => template.is_active).forEach(template => {
    let cursor = new Date(`${template.start_date}T00:00:00`);
    while (cursor < start) {
      if (template.cadence === 'monthly-first') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else cursor.setDate(cursor.getDate() + 14);
    }
    while (cursor <= end) {
      const dueDate = toIsoDate(cursor);
      if (!skippedDates.has(`${template.id}:${dueDate}`)) {
        items.push({
          id: id--,
          name: template.name,
          category: template.category,
          flow_type: template.flow_type,
          amount: template.amount,
          cash_account: template.cash_account || '',
          due_date: dueDate,
          is_paid: false,
          notes: '',
          automatic: true,
          recurring_id: template.id
        });
      }
      if (template.cadence === 'monthly-first') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else cursor.setDate(cursor.getDate() + 14);
    }
  });

  return items;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatCashBalance(value: number) {
  return roundToCents(value).toFixed(2);
}

export function normalizeCashBalanceDraft(value: string) {
  const cleaned = value.replace(/[$,\s]/g, '').replace(/[^\d.]/g, '');
  const [whole, ...decimalParts] = cleaned.split('.');
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join('')}`;
}

export function parseCashBalanceDraft(value: string) {
  const parsed = Number(normalizeCashBalanceDraft(value));
  return Number.isFinite(parsed) ? roundToCents(parsed) : NaN;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return toIsoDate(parsed);
}

export function daysUntil(date: string) {
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today) / 86400000);
}

export function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateRange(items: DisplayCashFlowItem[]) {
  if (items.length === 0) return 'No scheduled cash flows';
  const dates = items.map(item => item.due_date).sort();
  return `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`;
}

export function readCollapsedCashAccounts(): string[] {
  try {
    const raw = localStorage.getItem(CASH_RESOURCE_COLLAPSE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCollapsedCashAccounts(accounts: string[]) {
  try {
    localStorage.setItem(CASH_RESOURCE_COLLAPSE_KEY, JSON.stringify(accounts));
  } catch {
    // Browser storage can be unavailable in privacy-restricted contexts.
  }
}

export function dueLabel(item: DisplayCashFlowItem) {
  if (item.is_paid) return 'settled';
  const days = daysUntil(item.due_date);
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days === 0) return 'today';
  return `${days}d`;
}
