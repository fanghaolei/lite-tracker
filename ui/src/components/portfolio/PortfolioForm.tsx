import type { FormEvent, ReactNode } from 'react';
import { ASSET_TYPES, formatAssetType } from '../../finance';
import { portfolioIcons, type PortfolioFormState } from '../../domain/portfolio';
import type { AssetType } from '../../types';

type PortfolioFormProps = {
  form: PortfolioFormState;
  onChange: (form: PortfolioFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function PortfolioForm({ form, onChange, onSubmit, onClear }: PortfolioFormProps) {
  const update = (patch: Partial<PortfolioFormState>) => onChange({ ...form, ...patch });

  return (
    <section className="bg-white dark:bg-indigo-950/50 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 p-4">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-3">{portfolioIcons.daily} Plant Capital</h2>
      <form id="position-form" onSubmit={onSubmit} className="grid grid-cols-2 gap-3 items-end">
        <Field label="Symbol">
          <input value={form.ticker} onChange={event => update({ ticker: event.target.value })} required placeholder="AAPL" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all uppercase" />
        </Field>
        <Field label="Type">
          <select value={form.ticker.toUpperCase() === 'CASH' ? 'cash equivalents' : form.asset_type} onChange={event => update({ asset_type: event.target.value as AssetType })} disabled={form.ticker.toUpperCase() === 'CASH'} className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all">
            {ASSET_TYPES.map(type => <option key={type} value={type}>{formatAssetType(type)}</option>)}
          </select>
        </Field>
        <Field label="Account">
          <input value={form.account} onChange={event => update({ account: event.target.value })} required placeholder="E-Trade" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" />
        </Field>
        <Field label="Quantity">
          <input type="number" step="any" value={form.shares} onChange={event => update({ shares: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" />
        </Field>
        <Field label="Avg Price">
          <input type="number" step="any" value={form.average_cost} onChange={event => update({ average_cost: event.target.value })} required placeholder="0.00" className="w-full bg-gray-50 dark:bg-gray-900 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 transition-all" />
        </Field>
        <Field label="Pricing">
          <label className="flex items-center gap-2 h-[42px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 rounded-lg px-3 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={form.is_manual} onChange={event => update({ is_manual: event.target.checked, asset_type: event.target.checked && form.asset_type === 'stock' ? 'other' : form.asset_type, manual_price: event.target.checked ? form.manual_price : '' })} className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500" />
            Manual
          </label>
        </Field>
        {form.is_manual && (
          <Field label="Live Price">
            <input type="number" step="any" value={form.manual_price} onChange={event => update({ manual_price: event.target.value })} required placeholder="0.00" className="w-full bg-amber-50 dark:bg-amber-900/20 border-none dark:text-white rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-amber-500 transition-all" />
          </Field>
        )}
        <div className="flex gap-2 col-span-2">
          <button type="submit" className="flex-1 cali-gradient text-white font-bold py-2.5 px-4 rounded-lg hover:opacity-90 transition-all shadow-sm shadow-emerald-200">Save</button>
          <button type="button" onClick={onClear} className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 font-bold py-2.5 px-4 rounded-lg hover:bg-amber-100 transition-all">Clear</button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-gray-400 uppercase ml-0.5">{label}</label>
      {children}
    </div>
  );
}
