import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState
} from '@tanstack/react-table';
import { daysUntil, dueLabel, formatShortDate, type DisplayCashFlowItem, type ProjectedCashFlowItem } from '../../domain/cashFlow';
import { money } from '../../finance';
import type { Holding } from '../../types';
import { EditIcon, TrashIcon } from '../Icons';
import { CashAccountSelect } from './CashFlowShared';

const incomeIcon = String.fromCodePoint(0x1F4B0);
const paymentIcon = String.fromCodePoint(0x1F4B8);
const columnHelper = createColumnHelper<ProjectedCashFlowItem>();

type CashFlowTableProps = {
  items: ProjectedCashFlowItem[];
  cashAccounts: Holding[];
  onAccountChange: (item: DisplayCashFlowItem, account: string) => void;
  onTogglePaid: (item: DisplayCashFlowItem) => void;
  onEdit: (item: DisplayCashFlowItem) => void;
  onDelete: (item: DisplayCashFlowItem) => void;
};

export const CashFlowTable = memo(function CashFlowTable({
  items,
  cashAccounts,
  onAccountChange,
  onTogglePaid,
  onEdit,
  onDelete
}: CashFlowTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = useMemo(
    () => buildColumns(cashAccounts, onAccountChange, onTogglePaid, onEdit, onDelete),
    [cashAccounts, onAccountChange, onDelete, onEdit, onTogglePaid]
  );
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => `${row.automatic ? 'auto' : 'manual'}-${row.id}`
  });

  return (
    <section className="xl:col-span-2 min-h-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="h-[720px] xl:h-full overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className={headerClassName(header.column.id)}>
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
          <tbody id="cashflow-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
            {items.length === 0 && <tr><td colSpan={columns.length} className="p-10 text-center text-gray-400">No scheduled cash flows yet.</td></tr>}
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={`${row.original.is_paid ? 'opacity-55' : ''} hover:bg-blue-50/20 dark:hover:bg-slate-800/60 row-transition`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={cellClassName(cell.column.id, row.original)}>
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

function buildColumns(
  cashAccounts: Holding[],
  onAccountChange: (item: DisplayCashFlowItem, account: string) => void,
  onTogglePaid: (item: DisplayCashFlowItem) => void,
  onEdit: (item: DisplayCashFlowItem) => void,
  onDelete: (item: DisplayCashFlowItem) => void
) {
  return [
    columnHelper.accessor('name', {
      id: 'flow',
      header: 'Flow',
      cell: info => {
        const item = info.row.original;
        const isIncome = item.flow_type === 'income';
        return (
          <>
            <div className="font-bold text-gray-900 dark:text-white">{isIncome ? incomeIcon : paymentIcon} {item.name}</div>
            <div className="text-xs text-gray-400 mt-1">{item.automatic ? 'Automatic recurring item' : item.notes}</div>
          </>
        );
      }
    }),
    columnHelper.accessor('due_date', {
      id: 'date',
      header: 'Date',
      cell: info => {
        const item = info.row.original;
        return <>{formatShortDate(item.due_date)} <span className="text-xs font-normal">({dueLabel(item)})</span></>;
      }
    }),
    columnHelper.accessor('amount', {
      id: 'amount',
      header: 'Amount',
      cell: info => {
        const item = info.row.original;
        const isIncome = item.flow_type === 'income';
        return <>{isIncome ? '+' : '-'}{money(item.amount)}</>;
      }
    }),
    columnHelper.accessor('selectedAccount', {
      id: 'account',
      header: 'Pay By / Deposit To',
      cell: info => {
        const item = info.row.original;
        return <CashAccountSelect value={item.selectedAccount} accounts={cashAccounts} compact onChange={account => onAccountChange(item, account)} />;
      }
    }),
    columnHelper.accessor(row => row.remainingAfter, {
      id: 'remainingAfter',
      header: 'After Flow',
      cell: info => {
        const value = info.row.original.remainingAfter;
        return <>{value === null ? '-' : money(value)}</>;
      },
      sortingFn: (rowA, rowB) => nullsLast(rowA.original.remainingAfter, rowB.original.remainingAfter)
    }),
    columnHelper.accessor(row => row.is_paid ? 1 : 0, {
      id: 'status',
      header: 'Status',
      cell: info => {
        const item = info.row.original;
        return (
          <button type="button" onClick={() => onTogglePaid(item)} className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_paid ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300' : item.automatic ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200'}`}>
            {item.is_paid ? 'Unsettle' : item.automatic ? 'Settle Auto' : 'Settle'}
          </button>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: info => {
        const item = info.row.original;
        return (
          <div className="flex justify-end items-center gap-2">
            <button type="button" onClick={() => onEdit(item)} className="p-1 text-blue-400 hover:text-blue-600 transition-all" title={item.automatic ? 'Edit recurring flow' : 'Edit'}><EditIcon /></button>
            <button type="button" onClick={() => onDelete(item)} className="p-1 text-red-300 hover:text-red-500 transition-all" title={item.automatic ? 'Delete recurring flow' : 'Delete'}><TrashIcon /></button>
          </div>
        );
      }
    })
  ];
}

function SortableHeader({ column, children }: { column: Column<ProjectedCashFlowItem>; children: ReactNode }) {
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

function headerClassName(columnId: string) {
  return `px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${columnId === 'actions' ? 'text-right w-20' : ''}`;
}

function cellClassName(columnId: string, item: ProjectedCashFlowItem) {
  if (columnId === 'flow') return 'px-5 py-3 whitespace-nowrap';
  if (columnId === 'date') {
    const days = daysUntil(item.due_date);
    const urgency = item.is_paid ? 'text-gray-400' : days < 0 ? 'text-red-600' : days <= 7 ? 'text-amber-600' : 'text-gray-500';
    return `px-5 py-3 font-semibold whitespace-nowrap ${urgency}`;
  }
  if (columnId === 'amount') {
    const isIncome = item.flow_type === 'income';
    return `cashflow-amount px-5 py-3 font-bold whitespace-nowrap ${isIncome ? 'text-green-600' : 'text-gray-900 dark:text-white'}`;
  }
  if (columnId === 'account') return 'px-5 py-3 min-w-40';
  if (columnId === 'remainingAfter') {
    const isShort = item.remainingAfter !== null && item.remainingAfter < 0;
    return `cashflow-amount px-5 py-3 font-bold whitespace-nowrap ${isShort ? 'text-red-600' : 'text-gray-700 dark:text-gray-200'}`;
  }
  if (columnId === 'actions') return 'px-5 py-3 text-right';
  return 'px-5 py-3';
}

function nullsLast(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}
