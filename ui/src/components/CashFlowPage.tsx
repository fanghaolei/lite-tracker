import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  deleteCashFlowItem,
  deleteRecurringCashFlow,
  fetchCashFlowItems,
  fetchHoldings,
  fetchRecurringCashFlowSkips,
  fetchRecurringCashFlows,
  saveCashFlowItem,
  saveRecurringCashFlow,
  skipRecurringCashFlowOccurrence,
  updateCashBalance,
  updateRecurringCashFlowAccount
} from '../api';
import {
  addDaysIso,
  buildProjectedItems,
  buildRecurringItems,
  cashFlowOccurrenceKey,
  createEmptyCashFlowForm,
  expenseCategories,
  formatDateRange,
  formatShortDate,
  incomeCategories,
  parseCashBalanceDraft,
  readCollapsedCashAccounts,
  RECURRING_HORIZON_DAYS,
  RECURRING_LOOKBACK_DAYS,
  saveCollapsedCashAccounts,
  todayIso,
  type CashFlowFormState,
  type DeleteChoice,
  type DisplayCashFlowItem
} from '../domain/cashFlow';
import { wholeMoney } from '../finance';
import { usePrivacyMode, useTheme } from '../hooks';
import type { CashFlowItem, CashFlowPayload, Holding, RecurringCashFlow, RecurringCashFlowPayload, RecurringCashFlowSkip } from '../types';
import { CashFlowEditor } from './cash-flow/CashFlowEditor';
import { CashFlowTable } from './cash-flow/CashFlowTable';
import { CashFlowTimelinePanel } from './cash-flow/CashFlowTimelinePanel';
import { CashResourcesTable } from './cash-flow/CashResourcesTable';
import { SummaryTile } from './cash-flow/CashFlowShared';
import { DeleteAutoFlowDialog } from './cash-flow/DeleteAutoFlowDialog';
import { Header } from './Header';

const CASH_FLOW_SUMMARY_WINDOW_DAYS = 30;

export function CashFlowPage() {
  const [theme, toggleTheme] = useTheme();
  const [privacyMode, togglePrivacy] = usePrivacyMode();
  const [items, setItems] = useState<CashFlowItem[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringCashFlow[]>([]);
  const [recurringSkips, setRecurringSkips] = useState<RecurringCashFlowSkip[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [form, setForm] = useState<CashFlowFormState>(() => createEmptyCashFlowForm());
  const [collapsedCashAccounts, setCollapsedCashAccounts] = useState<string[]>(() => readCollapsedCashAccounts());
  const [deleteChoice, setDeleteChoice] = useState<DeleteChoice | null>(null);
  const [lastUpdate, setLastUpdate] = useState('Initializing...');

  const refresh = useCallback(async () => {
    try {
      const [nextItems, nextRecurringItems, nextRecurringSkips, nextHoldings] = await Promise.all([
        fetchCashFlowItems(),
        fetchRecurringCashFlows(),
        fetchRecurringCashFlowSkips(),
        fetchHoldings()
      ]);
      setItems(nextItems);
      setRecurringItems(nextRecurringItems);
      setRecurringSkips(nextRecurringSkips);
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

  const automaticItems = useMemo(
    () => buildRecurringItems(addDaysIso(todayIso(), -RECURRING_LOOKBACK_DAYS), RECURRING_HORIZON_DAYS, recurringItems, recurringSkips),
    [recurringItems, recurringSkips]
  );

  const displayItems = useMemo<DisplayCashFlowItem[]>(() => {
    const savedOccurrenceKeys = new Set(items.map(cashFlowOccurrenceKey));
    return [
      ...items,
      ...automaticItems.filter(autoItem => !savedOccurrenceKeys.has(cashFlowOccurrenceKey(autoItem)))
    ].sort((a, b) => Number(a.is_paid) - Number(b.is_paid) || a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));
  }, [items, automaticItems]);

  const cashAccounts = useMemo(() => holdings
    .filter(holding => holding.ticker === 'CASH')
    .sort((a, b) => a.account.localeCompare(b.account)), [holdings]);

  const cashBalances = useMemo(() => Object.fromEntries(cashAccounts.map(account => [account.account, account.shares])), [cashAccounts]);
  const tableItems = useMemo(() => buildProjectedItems(displayItems, cashBalances), [cashBalances, displayItems]);
  const visibleCashAccounts = useMemo(() => cashAccounts.filter(account => !collapsedCashAccounts.includes(account.account)), [cashAccounts, collapsedCashAccounts]);
  const hiddenCashAccounts = useMemo(() => cashAccounts.filter(account => collapsedCashAccounts.includes(account.account)), [cashAccounts, collapsedCashAccounts]);
  const hiddenCashTotal = useMemo(() => hiddenCashAccounts.reduce((sum, item) => sum + item.shares, 0), [hiddenCashAccounts]);
  const timelineDateCount = useMemo(() => new Set(displayItems.filter(item => !item.is_paid).map(item => item.due_date)).size, [displayItems]);
  const timelineWidth = `${Math.max(1120, Math.max(1, timelineDateCount) * 120)}px`;
  const totalCash = useMemo(() => cashAccounts.reduce((sum, item) => sum + item.shares, 0), [cashAccounts]);
  const openItems = useMemo(() => displayItems.filter(item => !item.is_paid), [displayItems]);
  const summaryWindowStart = todayIso();
  const summaryWindowEnd = addDaysIso(summaryWindowStart, CASH_FLOW_SUMMARY_WINDOW_DAYS);
  const summaryWindowItems = useMemo(() => openItems.filter(item => (
    item.due_date >= summaryWindowStart && item.due_date < summaryWindowEnd
  )), [openItems, summaryWindowEnd, summaryWindowStart]);
  const projectedOutflow = useMemo(() => summaryWindowItems
    .filter(item => item.flow_type !== 'income')
    .reduce((sum, item) => sum + item.amount, 0), [summaryWindowItems]);
  const projectedIncome = useMemo(() => summaryWindowItems
    .filter(item => item.flow_type === 'income')
    .reduce((sum, item) => sum + item.amount, 0), [summaryWindowItems]);
  const nextEvent = useMemo(() => openItems[0], [openItems]);
  const timelineRange = useMemo(() => formatDateRange(displayItems), [displayItems]);
  const buffer = totalCash + projectedIncome - projectedOutflow;
  const categoryOptions = form.flow_type === 'income' ? incomeCategories : expenseCategories;

  useEffect(() => {
    saveCollapsedCashAccounts(collapsedCashAccounts);
  }, [collapsedCashAccounts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) return;

    if (form.is_auto) {
      const payload: RecurringCashFlowPayload = {
        id: form.auto_id,
        name: form.name,
        category: form.category,
        flow_type: form.flow_type,
        cash_account: form.cash_account,
        amount,
        start_date: form.start_date,
        cadence: form.cadence,
        is_active: true,
        notes: form.notes
      };
      await saveRecurringCashFlow(payload);
      setForm(createEmptyCashFlowForm());
      await refresh();
      return;
    }

    const payload: CashFlowPayload = {
      id: form.id,
      name: form.name,
      category: form.category,
      flow_type: form.flow_type,
      cash_account: form.cash_account,
      amount,
      due_date: form.due_date,
      is_paid: form.is_paid,
      notes: form.notes
    };
    await saveCashFlowItem(payload);
    setForm(createEmptyCashFlowForm());
    await refresh();
  }

  const handleTogglePaid = useCallback(async (item: DisplayCashFlowItem) => {
    if (item.automatic) {
      await saveCashFlowItem({
        name: item.name,
        category: item.category,
        flow_type: item.flow_type || 'expense',
        cash_account: item.cash_account || '',
        amount: item.amount,
        due_date: item.due_date,
        is_paid: true,
        notes: `Settled from recurring schedule${item.recurring_id ? ` #${item.recurring_id}` : ''}`
      });
      await refresh();
      return;
    }
    await saveCashFlowItem({ ...item, is_paid: !item.is_paid });
    await refresh();
  }, [refresh]);

  const handleEdit = useCallback((item: DisplayCashFlowItem) => {
    if (item.automatic) {
      const template = recurringItems.find(recurring => recurring.id === item.recurring_id);
      if (template) {
        setForm({
          auto_id: template.id,
          is_auto: true,
          name: template.name,
          category: template.category,
          flow_type: template.flow_type || 'expense',
          cash_account: template.cash_account || '',
          amount: String(template.amount),
          due_date: todayIso(),
          start_date: template.start_date,
          cadence: template.cadence === 'monthly-first' ? 'monthly-first' : 'biweekly',
          is_paid: false,
          notes: template.notes || ''
        });
        document.getElementById('cash-flow-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setForm({
      id: item.id,
      is_auto: false,
      name: item.name,
      category: item.category,
      flow_type: item.flow_type || 'expense',
      cash_account: item.cash_account || '',
      amount: String(item.amount),
      due_date: item.due_date,
      start_date: item.due_date,
      cadence: 'biweekly',
      is_paid: item.is_paid,
      notes: item.notes || ''
    });
    document.getElementById('cash-flow-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [recurringItems]);

  const handleDelete = useCallback(async (item: DisplayCashFlowItem) => {
    if (item.automatic) {
      setDeleteChoice({ item });
      return;
    }
    if (await deleteCashFlowItem(item.id, item.name)) await refresh();
  }, [refresh]);

  const handleDeleteSingleAutoOccurrence = useCallback(async () => {
    const item = deleteChoice?.item;
    if (!item?.recurring_id) return;
    await skipRecurringCashFlowOccurrence({
      recurring_cash_flow_id: item.recurring_id,
      due_date: item.due_date
    });
    setDeleteChoice(null);
    await refresh();
  }, [deleteChoice, refresh]);

  const handleDeleteEntireAutoFlow = useCallback(async () => {
    const item = deleteChoice?.item;
    if (!item?.recurring_id) return;
    if (await deleteRecurringCashFlow(item.recurring_id)) {
      setDeleteChoice(null);
      await refresh();
    }
  }, [deleteChoice, refresh]);

  const handleAccountChange = useCallback(async (item: DisplayCashFlowItem, account: string) => {
    if (item.automatic) {
      if (item.recurring_id) {
        await updateRecurringCashFlowAccount(item.recurring_id, account);
        await refresh();
      }
      return;
    }
    await saveCashFlowItem({ ...item, cash_account: account });
    await refresh();
  }, [refresh]);

  const handleCashBalanceSave = useCallback(async (account: Holding, value: string) => {
    const nextBalance = parseCashBalanceDraft(value);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) return;
    await updateCashBalance(account.id, nextBalance);
    await refresh();
  }, [refresh]);

  const toggleCashAccountCollapsed = useCallback((account: string) => {
    setCollapsedCashAccounts(current => current.includes(account)
      ? current.filter(item => item !== account)
      : [...current, account]);
  }, []);

  const showHiddenCashAccounts = useCallback(() => {
    setCollapsedCashAccounts([]);
  }, []);

  const stats = (
    <>
      <div className="text-gray-500">Cash: <span className="font-bold text-gray-900 dark:text-white">{wholeMoney(totalCash)}</span></div>
      <div className="text-gray-500">30d In: <span className="font-bold text-green-600">{wholeMoney(projectedIncome)}</span></div>
      <div className="text-gray-500">30d Out: <span className="font-bold text-amber-600">{wholeMoney(projectedOutflow)}</span></div>
      <div className="text-gray-500">30d Buffer: <span className={`font-bold ${buffer >= 0 ? 'text-green-600' : 'text-red-600'}`}>{wholeMoney(buffer)}</span></div>
    </>
  );

  const controls = <div id="last-update" className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{lastUpdate}</div>;

  return (
    <div className="max-w-screen-2xl mx-auto px-4 py-12">
      <Header view="cashflow" theme={theme} privacyMode={privacyMode} onToggleTheme={toggleTheme} onTogglePrivacy={togglePrivacy} controls={controls} stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-8" id="cashflow-stats">
        <SummaryTile label="Available Cash" value={wholeMoney(totalCash)} tone="emerald" />
        <SummaryTile label="30-Day Income" value={wholeMoney(projectedIncome)} tone="green" />
        <SummaryTile label="30-Day Payments" value={wholeMoney(projectedOutflow)} tone="amber" />
        <SummaryTile label="Next Event" value={nextEvent ? `${nextEvent.name} - ${formatShortDate(nextEvent.due_date)}` : 'None'} tone="gray" compact />
      </div>

      <CashFlowTimelinePanel
        items={displayItems}
        privacyMode={privacyMode}
        themeSignal={theme}
        timelineRange={timelineRange}
        timelineWidth={timelineWidth}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:h-[920px] xl:items-stretch">
        <div className="space-y-4 xl:min-h-0">
          <CashResourcesTable
            cashAccounts={cashAccounts}
            visibleCashAccounts={visibleCashAccounts}
            hiddenCashAccounts={hiddenCashAccounts}
            hiddenCashTotal={hiddenCashTotal}
            onSaveBalance={handleCashBalanceSave}
            onHideAccount={toggleCashAccountCollapsed}
            onShowHidden={showHiddenCashAccounts}
          />

          <CashFlowEditor
            form={form}
            categoryOptions={categoryOptions}
            cashAccounts={cashAccounts}
            onChange={setForm}
            onCancel={() => setForm(createEmptyCashFlowForm())}
            onSubmit={handleSubmit}
          />
        </div>

        <CashFlowTable
          items={tableItems}
          cashAccounts={cashAccounts}
          onAccountChange={handleAccountChange}
          onTogglePaid={handleTogglePaid}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <DeleteAutoFlowDialog
        choice={deleteChoice}
        onDeleteSingle={handleDeleteSingleAutoOccurrence}
        onDeleteEntire={handleDeleteEntireAutoFlow}
        onCancel={() => setDeleteChoice(null)}
      />
    </div>
  );
}
