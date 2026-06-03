import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState
} from '@tanstack/react-table';
import { money } from '../../finance';
import { formatCashBalance, normalizeCashBalanceDraft, parseCashBalanceDraft } from '../../domain/cashFlow';
import type { Holding } from '../../types';
import { CheckIcon, ChevronIcon, EyeIcon } from '../Icons';

const bankIcon = String.fromCodePoint(0x1F3E6);
const cashIcon = String.fromCodePoint(0x1F4B5);
const cashResourceColumn = createColumnHelper<CashResourceRow>();

type CashResourceRow =
  | { kind: 'account'; id: string; account: Holding }
  | { kind: 'hidden'; id: string; count: number; total: number };

type CashResourcesTableProps = {
  cashAccounts: Holding[];
  visibleCashAccounts: Holding[];
  hiddenCashAccounts: Holding[];
  hiddenCashTotal: number;
  onSaveBalance: (account: Holding, value: string) => Promise<void> | void;
  onHideAccount: (account: string) => void;
  onShowHidden: () => void;
};

export const CashResourcesTable = memo(function CashResourcesTable({
  cashAccounts,
  visibleCashAccounts,
  hiddenCashAccounts,
  hiddenCashTotal,
  onSaveBalance,
  onHideAccount,
  onShowHidden
}: CashResourcesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const rows = useMemo<CashResourceRow[]>(() => [
    ...visibleCashAccounts.map(account => ({ kind: 'account' as const, id: String(account.id), account })),
    ...(hiddenCashAccounts.length > 0 ? [{ kind: 'hidden' as const, id: 'hidden', count: hiddenCashAccounts.length, total: hiddenCashTotal }] : [])
  ], [hiddenCashAccounts.length, hiddenCashTotal, visibleCashAccounts]);
  const columns = useMemo(
    () => buildCashResourceColumns(onSaveBalance, onHideAccount, onShowHidden),
    [onHideAccount, onSaveBalance, onShowHidden]
  );
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.id
  });

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4">{bankIcon} Cash Resources</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-gray-100 dark:border-gray-700">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className={cashResourceHeaderClass(header.column.id)}>
                    {header.isPlaceholder ? null : (
                      <SortableHeader column={header.column}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </SortableHeader>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody id="cash-resource-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
            {cashAccounts.length === 0 && <tr><td colSpan={columns.length} className="py-6 text-center text-gray-400 italic">No cash accounts found.</td></tr>}
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={cashResourceCellClass(cell.column.id, row.original)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});

function buildCashResourceColumns(
  onSaveBalance: (account: Holding, value: string) => Promise<void> | void,
  onHideAccount: (account: string) => void,
  onShowHidden: () => void
) {
  return [
    cashResourceColumn.accessor(row => row.kind === 'account' ? row.account.account : `${row.count} hidden`, {
      id: 'account',
      header: 'Account',
      cell: info => {
        const row = info.row.original;
        if (row.kind === 'hidden') {
          return (
            <div className="flex items-center gap-2">
              <ChevronIcon open={false} />
              <span>{row.count} hidden cash {row.count === 1 ? 'resource' : 'resources'}</span>
            </div>
          );
        }
        return <>{cashIcon} {row.account.account}</>;
      }
    }),
    cashResourceColumn.accessor(row => row.kind === 'account' ? row.account.shares : row.total, {
      id: 'balance',
      header: 'Balance',
      cell: info => {
        const row = info.row.original;
        if (row.kind === 'hidden') return money(row.total);
        return <CashBalanceEditor account={row.account} onSave={onSaveBalance} />;
      }
    }),
    cashResourceColumn.display({
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: info => {
        const row = info.row.original;
        if (row.kind === 'hidden') {
          return (
            <button type="button" onClick={onShowHidden} className="rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300">
              Show
            </button>
          );
        }
        return <IconButton label={`Hide ${row.account.account}`} tone="hide" onClick={() => onHideAccount(row.account.account)}>
          <EyeIcon hidden className="h-4 w-4" />
        </IconButton>;
      }
    })
  ];
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function CashBalanceEditor({ account, onSave }: { account: Holding; onSave: (account: Holding, value: string) => Promise<void> | void }) {
  const [draft, setDraft] = useState(() => formatCashBalance(account.shares));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(formatCashBalance(account.shares));
  }, [account.id, account.shares]);

  useEffect(() => () => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
  }, []);

  function showTemporaryStatus(status: SaveStatus) {
    setSaveStatus(status);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setSaveStatus('idle'), status === 'saved' ? 1400 : 1800);
  }

  async function save() {
    const nextBalance = parseCashBalanceDraft(draft);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      showTemporaryStatus('error');
      return;
    }

    setSaveStatus('saving');
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    try {
      await onSave(account, draft);
      setDraft(formatCashBalance(nextBalance));
      showTemporaryStatus('saved');
    } catch {
      showTemporaryStatus('error');
    }
  }

  const saveLabel = saveStatus === 'saving'
    ? `Saving ${account.account} balance`
    : saveStatus === 'saved'
      ? `Saved ${account.account} balance`
      : saveStatus === 'error'
        ? `Invalid ${account.account} balance`
        : `Save ${account.account} balance`;

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={event => setDraft(normalizeCashBalanceDraft(event.target.value))}
        onFocus={event => event.currentTarget.select()}
        onKeyDown={event => {
          if (event.key === 'Enter') save();
        }}
        disabled={saveStatus === 'saving'}
        aria-label={`${account.account} cash balance`}
        className="w-28 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-right text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <IconButton label={saveLabel} tone={saveStatus === 'error' ? 'error' : 'save'} status={saveStatus} onClick={save} disabled={saveStatus === 'saving'}>
        {saveStatus === 'saving' ? <SpinnerIcon /> : <CheckIcon className="h-4 w-4" />}
      </IconButton>
    </div>
  );
}

function SpinnerIcon() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

function IconButton({
  label,
  tone,
  status = 'idle',
  disabled = false,
  onClick,
  children
}: {
  label: string;
  tone: 'save' | 'hide' | 'error';
  status?: SaveStatus;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const toneClass = tone === 'save'
    ? status === 'saved'
      ? 'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm shadow-emerald-200/70 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200 dark:shadow-none'
      : 'text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
    : tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'
      : 'text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-900';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition disabled:cursor-wait ${toneClass}`}
    >
      {children}
    </button>
  );
}

function SortableHeader({ column, children }: { column: Column<CashResourceRow>; children: ReactNode }) {
  if (!column.getCanSort()) return <>{children}</>;
  return (
    <button type="button" onClick={column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-200">
      <span>{children}</span>
      <span className="text-[10px]">{sortMark(column.getIsSorted())}</span>
    </button>
  );
}

function sortMark(direction: false | 'asc' | 'desc') {
  if (direction === 'asc') return String.fromCharCode(9650);
  if (direction === 'desc') return String.fromCharCode(9660);
  return String.fromCharCode(8597);
}

function cashResourceHeaderClass(columnId: string) {
  if (columnId === 'balance') return 'py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-widest';
  if (columnId === 'actions') return 'py-2 text-right w-28';
  return 'py-2 text-xs font-bold text-gray-400 uppercase tracking-widest';
}

function cashResourceCellClass(columnId: string, row: CashResourceRow) {
  if (columnId === 'balance') return `py-3 text-right ${row.kind === 'hidden' ? 'font-bold text-gray-500 dark:text-gray-300' : ''}`;
  if (columnId === 'actions') return 'py-3 text-right';
  return `py-3 font-semibold ${row.kind === 'hidden' ? 'text-gray-500 dark:text-gray-300' : 'text-gray-700 dark:text-gray-200'}`;
}
