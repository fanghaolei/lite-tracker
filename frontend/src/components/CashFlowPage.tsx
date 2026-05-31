import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  deleteCashFlowItem,
  fetchCashFlowItems,
  fetchHoldings,
  fetchRecurringCashFlows,
  saveCashFlowItem,
  updateRecurringCashFlowAccount
} from '../api';
import { money, wholeMoney } from '../finance';
import { usePrivacyMode, useTheme } from '../hooks';
import type { CashFlowItem, CashFlowPayload, Holding, RecurringCashFlow } from '../types';
import { CashFlowTimelineChart } from './Charts';
import { EditIcon, TrashIcon } from './Icons';
import { Header } from './Header';

type FormState = {
  id?: number;
  name: string;
  category: string;
  flow_type: 'income' | 'expense';
  cash_account: string;
  amount: string;
  due_date: string;
  is_paid: boolean;
  notes: string;
};

type DisplayCashFlowItem = CashFlowItem & {
  automatic?: boolean;
  recurring_id?: number;
};

type ProjectedCashFlowItem = DisplayCashFlowItem & {
  selectedAccount: string;
  remainingAfter: number | null;
};

const PAGE_DAYS = 30;

const emptyForm: FormState = {
  name: '',
  category: 'Credit Card',
  flow_type: 'expense',
  cash_account: '',
  amount: '',
  due_date: todayIso(),
  is_paid: false,
  notes: ''
};

const expenseCategories = ['Credit Card', 'Mortgage', 'Utility Bill', 'Loan', 'Insurance', 'Subscription', 'Other'];
const incomeCategories = ['Salary', 'Bonus', 'Dividend', 'Transfer', 'Other Income'];

export function CashFlowPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringCashFlow[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [lastUpdate, setLastUpdate] = useState('Initializing...');
  const [windowStart, setWindowStart] = useState(todayIso());

  const refresh = useCallback(async () => {
    try {
      const [nextItems, nextRecurringItems, nextHoldings] = await Promise.all([fetchCashFlowItems(), fetchRecurringCashFlows(), fetchHoldings()]);
      setItems(nextItems);
      setRecurringItems(nextRecurringItems);
      setHoldings(nextHoldings);
      setLastUpdate(`Synced: ${new Date().toLocaleTimeString()}`);
    } catch {
      setLastUpdate('Connection Error');
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 60000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const windowEnd = useMemo(() => addDaysIso(windowStart, PAGE_DAYS - 1), [windowStart]);
  const automaticItems = useMemo(() => buildRecurringItems(addDaysIso(todayIso(), -PAGE_DAYS), 365, recurringItems), [recurringItems]);
  const displayItems = useMemo<DisplayCashFlowItem[]>(() => [...items, ...automaticItems]
    .sort((a, b) => Number(a.is_paid) - Number(b.is_paid) || a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name)), [items, automaticItems]);
  const pageItems = useMemo(() => displayItems
    .filter(item => item.due_date >= windowStart && item.due_date <= windowEnd), [displayItems, windowEnd, windowStart]);

  const cashAccounts = useMemo(() => holdings
    .filter(holding => holding.ticker === 'CASH')
    .sort((a, b) => a.account.localeCompare(b.account)), [holdings]);

  const cashBalances = useMemo(() => Object.fromEntries(cashAccounts.map(account => [account.account, account.shares])), [cashAccounts]);
  const projectedItems = useMemo(() => buildProjectedItems(pageItems, cashBalances), [cashBalances, pageItems]);
  const totalCash = useMemo(() => cashAccounts.reduce((sum, item) => sum + item.shares, 0), [cashAccounts]);
  const openPageItems = useMemo(() => pageItems.filter(item => !item.is_paid), [pageItems]);
  const pageOutflow = useMemo(() => openPageItems
    .filter(item => item.flow_type !== 'income')
    .reduce((sum, item) => sum + item.amount, 0), [openPageItems]);
  const pageIncome = useMemo(() => openPageItems
    .filter(item => item.flow_type === 'income')
    .reduce((sum, item) => sum + item.amount, 0), [openPageItems]);
  const nextEvent = useMemo(() => openPageItems[0], [openPageItems]);
  const buffer = totalCash + pageIncome - pageOutflow;
  const categoryOptions = form.flow_type === 'income' ? incomeCategories : expenseCategories;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload: CashFlowPayload = {
      id: form.id,
      name: form.name,
      category: form.category,
      flow_type: form.flow_type,
      cash_account: form.flow_type === 'expense' ? form.cash_account : '',
      amount: Number(form.amount),
      due_date: form.due_date,
      is_paid: form.is_paid,
      notes: form.notes
    };
    if (!payload.name.trim() || !Number.isFinite(payload.amount) || payload.amount <= 0) return;
    await saveCashFlowItem(payload);
    setForm(emptyForm);
    await refresh();
  }

  async function handleTogglePaid(item: DisplayCashFlowItem) {
    if (item.automatic) return;
    await saveCashFlowItem({ ...item, is_paid: !item.is_paid });
    await refresh();
  }

  function handleEdit(item: DisplayCashFlowItem) {
    if (item.automatic) return;
    setForm({
      id: item.id,
      name: item.name,
      category: item.category,
      flow_type: item.flow_type || 'expense',
      cash_account: item.cash_account || '',
      amount: String(item.amount),
      due_date: item.due_date,
      is_paid: item.is_paid,
      notes: item.notes || ''
    });
    document.getElementById('cash-flow-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleDelete(item: DisplayCashFlowItem) {
    if (item.automatic) return;
    if (await deleteCashFlowItem(item.id, item.name)) await refresh();
  }

  async function handleAccountChange(item: DisplayCashFlowItem, account: string) {
    if (item.flow_type === 'income') return;
    if (item.automatic) {
      if (item.recurring_id) {
        await updateRecurringCashFlowAccount(item.recurring_id, account);
        await refresh();
      }
      return;
    }
    await saveCashFlowItem({ ...item, cash_account: account });
    await refresh();
  }

  const stats = (
    <>
      <div className="text-gray-500">Cash: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(totalCash)}</span></div>
      <div className="text-gray-500">Window In: <span className="font-bold text-green-600">{wholeMoney(pageIncome)}</span></div>
      <div className="text-gray-500">Window Out: <span className="font-bold text-amber-600">{wholeMoney(pageOutflow)}</span></div>
      <div className="text-gray-500">Buffer: <span className={`font-bold ${buffer >= 0 ? 'text-green-600' : 'text-red-600'}`}>{wholeMoney(buffer)}</span></div>
    </>
  );

  const controls = <div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{lastUpdate}</div>;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="cashflow" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-8" id="cashflow-stats">
        <SummaryTile label="Available Cash" value={wholeMoney(totalCash)} tone="emerald" />
        <SummaryTile label="Window Income" value={wholeMoney(pageIncome)} tone="green" />
        <SummaryTile label="Window Payments" value={wholeMoney(pageOutflow)} tone="amber" />
        <SummaryTile label="Next Event" value={nextEvent ? `${nextEvent.name} - ${formatShortDate(nextEvent.due_date)}` : 'None'} tone="gray" compact />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
        <section className="xl:col-span-2 bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6 h-[460px] overflow-hidden">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">📆 Cash Flow Timeline</h2>
              <div className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-300">{formatShortDate(windowStart)} - {formatShortDate(windowEnd)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWindowStart(addDaysIso(windowStart, -PAGE_DAYS))} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200">Prev 30</button>
              <button type="button" onClick={() => setWindowStart(todayIso())} className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100">Today</button>
              <button type="button" onClick={() => setWindowStart(addDaysIso(windowStart, PAGE_DAYS))} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-200">Next 30</button>
            </div>
          </div>
          <div className="chart-container">
            <CashFlowTimelineChart items={pageItems} privacyMode={privacyMode} themeSignal={theme} />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">🏦 Cash Resources</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Account</th>
                  <th className="py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                </tr>
              </thead>
              <tbody id="cash-resource-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
                {cashAccounts.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-gray-400 italic">No cash accounts found.</td></tr>}
                {cashAccounts.map(account => (
                  <tr key={account.id}>
                    <td className="py-3 font-semibold text-gray-700 dark:text-gray-200">🪙 {account.account}</td>
                    <td className="py-3 text-right font-bold text-gray-900 dark:text-white">{money(account.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{form.id ? '✏️ Edit Flow' : '➕ Add Flow'}</h2>
            {form.id && <button type="button" onClick={() => setForm(emptyForm)} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>}
          </div>
          <form id="cash-flow-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select value={form.flow_type} onChange={event => setForm({ ...form, flow_type: event.target.value as 'income' | 'expense', category: event.target.value === 'income' ? 'Salary' : 'Credit Card', cash_account: '' })} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
                  <option value="expense">Payment</option>
                  <option value="income">Income</option>
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
                  {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Name">
              <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required placeholder={form.flow_type === 'income' ? 'Bonus' : 'Card payment'} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <input type="number" step="any" min="0" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </Field>
              <Field label="Date">
                <input type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })} required className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
              </Field>
            </div>
            {form.flow_type === 'expense' && (
              <Field label="Pay From">
                <CashAccountSelect value={form.cash_account} accounts={cashAccounts} onChange={account => setForm({ ...form, cash_account: account })} />
              </Field>
            )}
            <Field label="Notes">
              <textarea value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} placeholder="Autopay, statement note, or cash prep detail" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
            </Field>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 rounded-xl px-4 py-3 font-bold cursor-pointer">
              <input type="checkbox" checked={form.is_paid} onChange={event => setForm({ ...form, is_paid: event.target.checked })} className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
              Already settled
            </label>
            <button type="submit" className="w-full cali-gradient text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all shadow-sm shadow-emerald-200">
              {form.id ? 'Save Flow' : 'Add Flow'}
            </button>
          </form>
        </section>

        <section className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Flow</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Pay From</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">After Payment</th>
                <th className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-5 py-2 text-right w-20"></th>
              </tr>
            </thead>
            <tbody id="cashflow-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
              {projectedItems.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-400">No scheduled cash flows in this 30-day window.</td></tr>}
              {projectedItems.map(item => {
                const days = daysUntil(item.due_date);
                const urgency = item.is_paid ? 'text-gray-400' : days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-500';
                const isIncome = item.flow_type === 'income';
                const isShort = item.remainingAfter !== null && item.remainingAfter < 0;
                return (
                  <tr key={`${item.automatic ? 'auto' : 'manual'}-${item.id}`} className={`${item.is_paid ? 'opacity-55' : ''} hover:bg-blue-50/20 dark:hover:bg-slate-800/60 row-transition`}>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="font-bold text-gray-900 dark:text-white">{isIncome ? '💵' : '💳'} {item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.automatic ? 'Automatic recurring item' : item.notes}</div>
                    </td>
                    <td className={`px-5 py-3 font-semibold whitespace-nowrap ${urgency}`}>{formatShortDate(item.due_date)} <span className="text-xs font-normal">({dueLabel(item)})</span></td>
                    <td className={`cashflow-amount px-5 py-3 font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>{isIncome ? '+' : '-'}{money(item.amount)}</td>
                    <td className="px-5 py-3 min-w-40">
                      {isIncome ? <span className="text-gray-400">-</span> : <CashAccountSelect value={item.selectedAccount} accounts={cashAccounts} compact onChange={account => handleAccountChange(item, account)} />}
                    </td>
                    <td className={`cashflow-amount px-5 py-3 font-bold whitespace-nowrap ${isShort ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`}>
                      {isIncome || item.remainingAfter === null ? '-' : money(item.remainingAfter)}
                    </td>
                    <td className="px-5 py-3">
                      <button type="button" disabled={item.automatic} onClick={() => handleTogglePaid(item)} className={`rounded-full px-3 py-1 text-xs font-bold ${item.automatic ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300' : item.is_paid ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'}`}>
                        {item.automatic ? 'Auto' : item.is_paid ? 'Settled' : 'Open'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!item.automatic && (
                        <div className="flex justify-end items-center gap-2">
                          <button type="button" onClick={() => handleEdit(item)} className="p-1 text-blue-400 hover:text-blue-600 transition-all" title="Edit"><EditIcon /></button>
                          <button type="button" onClick={() => handleDelete(item)} className="p-1 text-red-300 hover:text-red-500 transition-all" title="Delete"><TrashIcon /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><label className="text-[11px] font-bold text-gray-400 uppercase ml-0.5">{label}</label>{children}</div>;
}

function CashAccountSelect({ value, accounts, onChange, compact = false }: { value: string; accounts: Holding[]; onChange: (account: string) => void; compact?: boolean }) {
  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className={`${compact ? 'min-w-36 px-3 py-2 text-xs' : 'w-full px-4 py-3'} bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 transition-all`}
    >
      <option value="">Select account</option>
      {accounts.map(account => <option key={account.id} value={account.account}>{account.account} ({money(account.shares)})</option>)}
    </select>
  );
}

function SummaryTile({ label, value, tone, compact = false }: { label: string; value: string; tone: 'emerald' | 'green' | 'amber' | 'gray'; compact?: boolean }) {
  const toneClasses = {
    emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/30',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    gray: 'text-gray-600 bg-gray-50 dark:bg-gray-800'
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${toneClasses[tone]}`}>{label}</div>
      <div className={`${compact ? 'text-lg' : 'text-3xl'} mt-4 font-black text-gray-900 dark:text-white`}>{value}</div>
    </div>
  );
}

function buildProjectedItems(items: DisplayCashFlowItem[], startingBalances: Record<string, number>): ProjectedCashFlowItem[] {
  const running = { ...startingBalances };
  return [...items]
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name))
    .map(item => {
      const selectedAccount = item.flow_type === 'income' ? '' : item.cash_account || '';
      let remainingAfter: number | null = null;
      if (!item.is_paid && item.flow_type !== 'income' && selectedAccount) {
        running[selectedAccount] = (running[selectedAccount] || 0) - item.amount;
        remainingAfter = running[selectedAccount];
      }
      return { ...item, selectedAccount, remainingAfter };
    });
}

function buildRecurringItems(startDate: string, daysAhead: number, templates: RecurringCashFlow[]): DisplayCashFlowItem[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);
  const items: DisplayCashFlowItem[] = [];
  let id = -1;

  templates.filter(template => template.is_active).forEach(template => {
    let cursor = new Date(`${template.start_date}T00:00:00`);
    while (cursor < start) {
      if (template.cadence === 'monthly-first') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else cursor.setDate(cursor.getDate() + 14);
    }
    while (cursor <= end) {
      items.push({
        id: id--,
        name: template.name,
        category: template.category,
        flow_type: template.flow_type,
        amount: template.amount,
        cash_account: template.cash_account || '',
        due_date: toIsoDate(cursor),
        is_paid: false,
        notes: '',
        automatic: true,
        recurring_id: template.id
      });
      if (template.cadence === 'monthly-first') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else cursor.setDate(cursor.getDate() + 14);
    }
  });

  return items;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return toIsoDate(parsed);
}

function daysUntil(date: string) {
  const today = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.ceil((new Date(`${date}T00:00:00`).getTime() - today) / 86400000);
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueLabel(item: DisplayCashFlowItem) {
  if (item.is_paid) return 'settled';
  const days = daysUntil(item.due_date);
  if (days < 0) return `${Math.abs(days)}d late`;
  if (days === 0) return 'today';
  return `${days}d`;
}
