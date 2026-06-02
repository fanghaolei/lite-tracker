import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState
} from '@tanstack/react-table';
import { getYahooFinanceUrl, money, signedMoney, signedPct } from '../../finance';
import type { AccountGroup } from '../../types';
import { ChevronIcon } from '../Icons';

const accountIcon = String.fromCodePoint(0x1F9ED);
const lotIcon = String.fromCodePoint(0x1F33F);
const dailyIcon = String.fromCodePoint(0x1F331);
const worthIcon = String.fromCodePoint(0x1F4B5);
const totalIcon = String.fromCodePoint(0x1FA99);
const stockIcon = String.fromCodePoint(0x1F33F);
const diamondIcon = String.fromCodePoint(0x1F48E);
const cashIcon = String.fromCodePoint(0x1FA99);

const accountColumn = createColumnHelper<AccountGroup>();

type AccountsTableProps = {
  groups: AccountGroup[];
};

export function AccountsTable({ groups }: AccountsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'account', desc: false }]);
  const [expandedAccounts, setExpandedAccounts] = useState<string[]>([]);
  const columns = useMemo(() => buildAccountColumns(expandedAccounts), [expandedAccounts]);
  const table = useReactTable({
    data: groups,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.account
  });

  function toggleAccount(account: string) {
    setExpandedAccounts(current => current.includes(account)
      ? current.filter(item => item !== account)
      : [...current, account]);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-left" id="account-table">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-5 pr-8 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
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
        <tbody id="account-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
          {groups.length === 0 && <tr><td colSpan={columns.length} className="p-10 text-center text-gray-400">No data found.</td></tr>}
          {table.getRowModel().rows.map(row => {
            const group = row.original;
            const expanded = expandedAccounts.includes(group.account);
            return (
              <Fragment key={row.id}>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors" onClick={() => toggleAccount(group.account)}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={accountCellClass(cell.column.id, group)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expanded && group.lots.map(lot => <AccountLotRow key={lot.id} lot={lot} />)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildAccountColumns(expandedAccounts: string[]) {
  return [
    accountColumn.accessor('account', {
      id: 'account',
      header: `${accountIcon} Account`,
      cell: info => {
        const group = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <ChevronIcon open={expandedAccounts.includes(group.account)} />
            <span>{accountIcon} {group.account}</span>
          </div>
        );
      }
    }),
    accountColumn.accessor(row => row.lots.length, {
      id: 'lots',
      header: `${lotIcon} Lots`,
      cell: info => `${info.row.original.lots.length} lots`
    }),
    accountColumn.accessor('cost_basis', {
      id: 'cost_basis',
      header: 'Cost',
      cell: info => money(info.row.original.cost_basis)
    }),
    accountColumn.accessor('daily_pnl', {
      id: 'daily_pnl',
      header: `${dailyIcon} Daily`,
      cell: info => signedMoney(info.row.original.daily_pnl)
    }),
    accountColumn.accessor('market_value', {
      id: 'market_value',
      header: `${worthIcon} Worth`,
      cell: info => money(info.row.original.market_value)
    }),
    accountColumn.accessor('percent', {
      id: 'percent',
      header: '% Port',
      cell: info => `${info.row.original.percent.toFixed(1)}%`
    }),
    accountColumn.accessor('pnl', {
      id: 'pnl',
      header: `${totalIcon} Total`,
      cell: info => signedMoney(info.row.original.pnl)
    }),
    accountColumn.accessor('pnl_percent', {
      id: 'pnl_percent',
      header: 'Total %',
      cell: info => signedPct(info.row.original.pnl_percent)
    })
  ];
}

function AccountLotRow({ lot }: { lot: AccountGroup['lots'][number] }) {
  const costBasis = lot.ticker === 'CASH' ? lot.shares : lot.shares * lot.average_cost;
  const pnlPct = lot.ticker !== 'CASH' && lot.average_cost > 0 ? ((lot.live - lot.average_cost) / lot.average_cost) * 100 : 0;
  const sizeLabel = lot.ticker === 'CASH' ? 'Cash balance' : `${lot.shares.toLocaleString()} @ ${money(lot.average_cost)}`;
  const icon = lot.ticker === 'CASH' ? cashIcon : (lot.is_manual ? diamondIcon : stockIcon);
  const quoteUrl = getYahooFinanceUrl(lot.ticker, Boolean(lot.is_manual));

  return (
    <tr className="hover:bg-blue-50/20 dark:hover:bg-slate-800/60 text-sm text-gray-500 dark:text-gray-300 group row-transition">
      <td className="px-8 py-2 italic whitespace-nowrap">
        {icon}{' '}
        {quoteUrl
          ? <a href={quoteUrl} target="_blank" rel="noreferrer" className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline underline-offset-4">{lot.ticker}</a>
          : lot.ticker}
      </td>
      <td className="px-5 py-2 whitespace-nowrap">{sizeLabel}</td>
      <td className="px-5 py-2">{money(costBasis)}</td>
      <td className="px-5 py-2 whitespace-nowrap">{signedMoney(lot.daily_pnl)}</td>
      <td className="px-5 py-2 whitespace-nowrap">{money(lot.market_value)}</td>
      <td></td>
      <td className={`px-5 py-2 whitespace-nowrap ${lot.pnl >= 0 ? 'text-green-500' : 'text-red-400'}`}>{signedMoney(lot.pnl)}</td>
      <td className="px-5 py-2">{pnlPct.toFixed(2)}%</td>
    </tr>
  );
}

function SortableHeader({ column, children }: { column: Column<AccountGroup>; children: ReactNode }) {
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

function accountCellClass(columnId: string, group: AccountGroup) {
  if (columnId === 'account') return 'px-5 py-3 text-gray-900 dark:text-white whitespace-nowrap';
  if (columnId === 'lots') return 'px-5 py-3 text-gray-400 dark:text-gray-500 font-normal';
  if (columnId === 'cost_basis') return 'px-5 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap';
  if (columnId === 'market_value') return 'px-5 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap';
  if (columnId === 'percent') return 'px-5 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs whitespace-nowrap';
  if (columnId === 'daily_pnl') return `px-5 py-3 font-bold ${group.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'pnl') return `px-5 py-3 font-bold ${group.pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'pnl_percent') return `px-5 py-3 font-bold ${group.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  return 'px-5 py-3';
}
