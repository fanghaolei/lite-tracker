import type { FormEvent } from 'react';
import type { CashFlowCadence, CashFlowFormState, CashFlowType } from '../../domain/cashFlow';
import type { Holding } from '../../types';
import { CashAccountSelect, Field } from './CashFlowShared';

type CashFlowEditorProps = {
  form: CashFlowFormState;
  categoryOptions: string[];
  cashAccounts: Holding[];
  onChange: (form: CashFlowFormState) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CashFlowEditor({
  form,
  categoryOptions,
  cashAccounts,
  onChange,
  onCancel,
  onSubmit
}: CashFlowEditorProps) {
  const isEditing = Boolean(form.id || form.auto_id);
  const update = (patch: Partial<CashFlowFormState>) => onChange({ ...form, ...patch });

  return (
    <section className="bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600">{isEditing ? 'Edit Flow' : 'Add Flow'}</h2>
        {isEditing && <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>}
      </div>
      <form id="cash-flow-form" onSubmit={onSubmit} className="space-y-4">
        <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 rounded-xl px-4 py-3 font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_auto}
            onChange={event => update({
              is_auto: event.target.checked,
              id: event.target.checked ? undefined : form.id,
              auto_id: event.target.checked ? form.auto_id : undefined,
              start_date: event.target.checked ? form.due_date : form.start_date,
              is_paid: event.target.checked ? false : form.is_paid
            })}
            className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
          />
          Auto recurring flow
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={form.flow_type}
              onChange={event => update({
                flow_type: event.target.value as CashFlowType,
                category: event.target.value === 'income' ? 'Salary' : 'Credit Card',
                cash_account: ''
              })}
              className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="expense">Payment</option>
              <option value="income">Income</option>
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={event => update({ category: event.target.value })} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
              {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Name">
          <input value={form.name} onChange={event => update({ name: event.target.value })} required placeholder={form.flow_type === 'income' ? 'Bonus' : 'Card payment'} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount">
            <input type="number" step="any" min="0" value={form.amount} onChange={event => update({ amount: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
          </Field>
          {form.is_auto ? (
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={event => update({ start_date: event.target.value })} required className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </Field>
          ) : (
            <Field label="Date">
              <input type="date" value={form.due_date} onChange={event => update({ due_date: event.target.value })} required className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all" />
            </Field>
          )}
        </div>
        {form.is_auto && (
          <Field label="Cadence">
            <select value={form.cadence} onChange={event => update({ cadence: event.target.value as CashFlowCadence })} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly-first">Monthly on the 1st</option>
            </select>
          </Field>
        )}
        <Field label="Pay By / Deposit To">
          <CashAccountSelect value={form.cash_account} accounts={cashAccounts} onChange={account => update({ cash_account: account })} />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={event => update({ notes: event.target.value })} placeholder="Autopay, statement note, or cash prep detail" rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition-all resize-none" />
        </Field>
        {!form.is_auto && (
          <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 rounded-xl px-4 py-3 font-bold cursor-pointer">
            <input type="checkbox" checked={form.is_paid} onChange={event => update({ is_paid: event.target.checked })} className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
            Already settled
          </label>
        )}
        <button type="submit" className="w-full cali-gradient text-white font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all shadow-sm shadow-emerald-200">
          {isEditing ? 'Save Flow' : 'Add Flow'}
        </button>
      </form>
    </section>
  );
}
