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
import { ASSET_TYPES, formatAssetType, getAssetTypeIcon, getYahooFinanceUrl, money, signedMoney, signedPct } from '../../finance';
import { portfolioIcons } from '../../domain/portfolio';
import type { AssetGroup, AssetType, Holding } from '../../types';
import { ChevronIcon, EditIcon, PlusIcon, TrashIcon } from '../Icons';

const portfolioColumn = createColumnHelper<AssetGroup>();
const cashColumn = createColumnHelper<Holding>();

export function CashTable(props: {
  cashHoldings: Holding[];
  totalValue: number;
  editingId: number | null;
  onEdit: (id: number) => void;
  onSave: (lot: Holding) => void;
  onCancel: () => void;
  onDelete: (ticker: string, account: string) => void;
  onAddCash: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'account', desc: false }]);
  const columns = useMemo(() => buildCashColumns(props.totalValue, props.onAddCash, props.onEdit, props.onDelete), [props.onAddCash, props.onDelete, props.onEdit, props.totalValue]);
  const table = useReactTable({
    data: props.cashHoldings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => String(row.id)
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto h-full flex flex-col justify-center">
      <table className="w-full text-left">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
              {headerGroup.headers.map(header => (
                <th key={header.id} className={cashHeaderClass(header.column.id)}>
                  {header.isPlaceholder ? null : <HeaderButton column={header.column}>{flexRender(header.column.columnDef.header, header.getContext())}</HeaderButton>}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody id="cash-list" className="divide-y divide-gray-50 text-sm">
          {props.cashHoldings.length === 0 && <tr><td colSpan={columns.length} className="px-5 py-4 text-center text-gray-400 italic">No cash lots found.</td></tr>}
          {table.getRowModel().rows.map(row => props.editingId === row.original.id
            ? <EditRow key={row.id} lot={row.original} colSpan={1} isCashTable showCost={false} onSave={props.onSave} onCancel={props.onCancel} />
            : (
              <tr key={row.id} className="bg-gray-50/30 dark:bg-gray-800/30 text-sm text-gray-600 dark:text-gray-300 group row-transition">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className={cashCellClass(cell.column.id)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function PortfolioTable(props: {
  groups: AssetGroup[];
  expandedTickers: string[];
  editingId: number | null;
  onToggle: (ticker: string) => void;
  onAddLot: (ticker: string) => void;
  onTypeChange: (ticker: string, assetType: AssetType) => void;
  onEdit: (id: number) => void;
  onSave: (lot: Holding) => void;
  onCancel: () => void;
  onDelete: (ticker: string, account: string) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'ticker', desc: false }]);
  const columns = useMemo(() => buildPortfolioColumns(props.expandedTickers, props.onAddLot, props.onTypeChange), [props.expandedTickers, props.onAddLot, props.onTypeChange]);
  const table = useReactTable({
    data: props.groups,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.ticker
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
      <table className="w-full text-left" id="holdings-table">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 whitespace-nowrap">
              {headerGroup.headers.map(header => (
                <th key={header.id} className={portfolioHeaderClass(header.column.id)}>
                  {header.isPlaceholder ? null : <HeaderButton column={header.column}>{flexRender(header.column.columnDef.header, header.getContext())}</HeaderButton>}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody id="holdings-list" className="divide-y divide-gray-50 dark:divide-gray-700 text-sm">
          {props.groups.length === 0 && <tr><td colSpan={columns.length} className="p-10 text-center text-gray-400">No positions found. Add one above.</td></tr>}
          {table.getRowModel().rows.map(row => {
            const group = row.original;
            const expanded = props.expandedTickers.includes(group.ticker);
            return (
              <Fragment key={group.ticker}>
                <tr className="bg-gray-50/50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-colors" onClick={() => props.onToggle(group.ticker)}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={portfolioCellClass(cell.column.id, group)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expanded && group.lots.map(lot => props.editingId === lot.id
                  ? <EditRow key={lot.id} lot={lot} colSpan={7} onSave={props.onSave} onCancel={props.onCancel} />
                  : <PortfolioLotRow key={lot.id} lot={lot} onEdit={props.onEdit} onDelete={props.onDelete} />)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildCashColumns(totalValue: number, onAddCash: () => void, onEdit: (id: number) => void, onDelete: (ticker: string, account: string) => void) {
  return [
    cashColumn.accessor('account', {
      id: 'account',
      header: `${portfolioIcons.cash} Cash Account`,
      cell: info => <>{portfolioIcons.cash} {info.row.original.account}</>
    }),
    cashColumn.accessor('shares', {
      id: 'shares',
      header: `${portfolioIcons.bank} Balance`,
      cell: info => info.row.original.shares.toLocaleString()
    }),
    cashColumn.accessor(row => totalValue > 0 ? row.shares / totalValue : 0, {
      id: 'percent',
      header: '% Port',
      cell: info => `${(Number(info.getValue()) * 100).toFixed(1)}%`
    }),
    cashColumn.display({
      id: 'actions',
      header: () => <button onClick={onAddCash} className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded transition-all" title="Add Cash"><PlusIcon /></button>,
      enableSorting: false,
      cell: info => <RowActions onEdit={() => onEdit(info.row.original.id)} onDelete={() => onDelete('CASH', info.row.original.account)} />
    })
  ];
}

function buildPortfolioColumns(expandedTickers: string[], onAddLot: (ticker: string) => void, onTypeChange: (ticker: string, assetType: AssetType) => void) {
  return [
    portfolioColumn.accessor('ticker', {
      id: 'ticker',
      header: `${portfolioIcons.asset} Asset`,
      cell: info => {
        const group = info.row.original;
        const icon = getAssetTypeIcon(group.asset_type);
        const quoteUrl = getYahooFinanceUrl(group.ticker, group.lots.every(lot => Boolean(lot.is_manual)));
        return (
          <div className="flex items-center gap-2">
            <ChevronIcon open={expandedTickers.includes(group.ticker)} />
            <span className="text-base leading-none" title={formatAssetType(group.asset_type)}>{icon}</span>
            {quoteUrl
              ? <a href={quoteUrl} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="hover:text-emerald-600 dark:hover:text-emerald-300 hover:underline underline-offset-4">{group.ticker}</a>
              : <span>{group.ticker}</span>}
          </div>
        );
      }
    }),
    portfolioColumn.accessor('asset_type', {
      id: 'asset_type',
      header: 'Type',
      cell: info => {
        const group = info.row.original;
        return (
          <select value={group.asset_type} onClick={event => event.stopPropagation()} onChange={event => onTypeChange(group.ticker, event.target.value as AssetType)} className="min-w-[8rem] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-100 rounded-lg px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-emerald-500">
            {ASSET_TYPES.map(type => <option key={type} value={type}>{formatAssetType(type)}</option>)}
          </select>
        );
      }
    }),
    portfolioColumn.accessor('shares', { id: 'shares', header: `${portfolioIcons.size} Size`, cell: info => info.row.original.shares.toLocaleString() }),
    portfolioColumn.accessor('average_cost', { id: 'average_cost', header: 'Cost', cell: info => money(info.row.original.average_cost) }),
    portfolioColumn.accessor('live', { id: 'live', header: 'Live Price', cell: info => <PriceBadge live={info.row.original.live} prev={info.row.original.prev_close} /> }),
    portfolioColumn.accessor('daily_percent', { id: 'daily_percent', header: `${portfolioIcons.today} Today`, cell: info => signedPct(info.row.original.daily_percent) }),
    portfolioColumn.accessor('daily_pnl', { id: 'daily_pnl', header: `${portfolioIcons.daily} Daily`, cell: info => signedMoney(info.row.original.daily_pnl) }),
    portfolioColumn.accessor('market_value', { id: 'market_value', header: `${portfolioIcons.worth} Worth`, cell: info => money(info.row.original.market_value) }),
    portfolioColumn.accessor('percent', { id: 'percent', header: '% Port', cell: info => `${info.row.original.percent.toFixed(1)}%` }),
    portfolioColumn.accessor('pnl', { id: 'pnl', header: `${portfolioIcons.total} Total`, cell: info => signedMoney(info.row.original.pnl) }),
    portfolioColumn.accessor('pnl_percent', { id: 'pnl_percent', header: 'Total %', cell: info => signedPct(info.row.original.pnl_percent) }),
    portfolioColumn.display({
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: info => {
        const group = info.row.original;
        return <button onClick={event => { event.stopPropagation(); onAddLot(group.ticker); }} className="p-1.5 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all" title="Add Account Lot"><PlusIcon /></button>;
      }
    })
  ];
}

function PortfolioLotRow({ lot, onEdit, onDelete }: { lot: AssetGroup['lots'][number]; onEdit: (id: number) => void; onDelete: (ticker: string, account: string) => void }) {
  return (
    <tr className="hover:bg-blue-50/20 dark:hover:bg-slate-800/60 text-sm text-gray-500 dark:text-gray-300 group row-transition">
      <td className="px-8 py-2 italic text-gray-600 dark:text-gray-300 whitespace-nowrap">{lot.is_manual ? portfolioIcons.diamond : portfolioIcons.account} {lot.account}</td>
      <td className="px-5 py-2"></td>
      <td className="px-5 py-2 whitespace-nowrap">{lot.shares.toLocaleString()}</td>
      <td className="px-5 py-2 whitespace-nowrap">{money(lot.average_cost)}</td>
      <td className="px-5 py-2" colSpan={2}></td>
      <td className="px-5 py-2 whitespace-nowrap">{signedMoney(lot.daily_pnl)}</td>
      <td className="px-5 py-2 text-gray-700 dark:text-gray-100 whitespace-nowrap">{money(lot.market_value)}</td>
      <td className="px-5 py-2"></td>
      <td className={`px-5 py-2 whitespace-nowrap ${lot.pnl >= 0 ? 'text-green-500' : 'text-red-400'}`}>{signedMoney(lot.pnl)}</td>
      <td className="px-5 py-2"></td>
      <td className="px-5 py-2 text-right whitespace-nowrap"><RowActions onEdit={() => onEdit(lot.id)} onDelete={() => onDelete(lot.ticker, lot.account)} /></td>
    </tr>
  );
}

function HeaderButton<T>({ column, children }: { column: Column<T, unknown>; children: ReactNode }) {
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

function cashHeaderClass(columnId: string) {
  return `px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${columnId === 'actions' ? 'text-right w-16' : 'pr-8'}`;
}

function cashCellClass(columnId: string) {
  if (columnId === 'account') return 'px-5 py-2 font-bold text-amber-700 dark:text-amber-300 whitespace-nowrap';
  if (columnId === 'percent') return 'px-5 py-2 font-mono text-gray-500 dark:text-gray-300 whitespace-nowrap';
  if (columnId === 'actions') return 'px-5 py-2 text-right whitespace-nowrap';
  return 'px-5 py-2 whitespace-nowrap';
}

function portfolioHeaderClass(columnId: string) {
  return `px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest ${columnId === 'actions' ? 'text-right w-16' : 'pr-8'}`;
}

function portfolioCellClass(columnId: string, group: AssetGroup) {
  if (columnId === 'ticker') return 'px-5 py-3 text-gray-900 dark:text-white whitespace-nowrap';
  if (columnId === 'asset_type') return 'px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap';
  if (columnId === 'shares') return 'px-5 py-3 text-gray-700 dark:text-gray-200 whitespace-nowrap';
  if (columnId === 'average_cost') return 'px-5 py-3 text-gray-500 dark:text-gray-300 whitespace-nowrap';
  if (columnId === 'live') return 'px-5 py-3 whitespace-nowrap';
  if (columnId === 'daily_percent') return `px-5 py-3 font-bold ${group.daily_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'daily_pnl') return `px-5 py-3 font-bold ${group.daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'market_value') return 'px-5 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap';
  if (columnId === 'percent') return 'px-5 py-3 text-gray-500 dark:text-gray-300 font-mono text-xs whitespace-nowrap';
  if (columnId === 'pnl') return `px-5 py-3 font-bold ${group.pnl >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'pnl_percent') return `px-5 py-3 font-bold ${group.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'} whitespace-nowrap`;
  if (columnId === 'actions') return 'px-5 py-3 text-right';
  return 'px-5 py-3';
}

function PriceBadge({ live, prev }: { live: number; prev: number }) {
  return <span className={`px-2 py-1 rounded-md font-bold ${live >= prev ? 'text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30' : 'text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30'}`}>{live ? money(live) : '...'}</span>;
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="flex justify-end items-center space-x-1"><button onClick={onEdit} className="opacity-0 group-hover:opacity-100 p-1 text-blue-400 hover:text-blue-600 transition-all" title="Edit"><EditIcon /></button><button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-all" title="Delete"><TrashIcon /></button></div>;
}

function EditRow({ lot, colSpan, isCashTable = false, showCost = true, onSave, onCancel }: { lot: Holding; colSpan: number; isCashTable?: boolean; showCost?: boolean; onSave: (lot: Holding) => void; onCancel: () => void }) {
  const [account, setAccount] = useState(lot.account);
  const [shares, setShares] = useState(String(lot.shares));
  const [averageCost, setAverageCost] = useState(String(lot.average_cost));

  function saveEdit() {
    onSave({
      ...lot,
      account,
      shares: Number(shares),
      average_cost: showCost ? Number(averageCost) : lot.average_cost
    });
  }

  return (
    <tr className="bg-blue-50/50 dark:bg-blue-950/30 text-sm">
      <td className="px-8 py-2 italic"><input type="text" value={account} onChange={event => setAccount(event.target.value)} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>
      {!isCashTable && <td className="px-5 py-2"></td>}
      <td className="px-5 py-2"><input type="number" step="any" value={shares} onChange={event => setShares(event.target.value)} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>
      {showCost && <td className="px-5 py-2"><input type="number" step="any" value={averageCost} onChange={event => setAverageCost(event.target.value)} disabled={lot.ticker === 'CASH'} className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs" /></td>}
      <td className="px-5 py-2" colSpan={colSpan}></td>
      <td className="px-5 py-2 text-right whitespace-nowrap"><div className="flex justify-end items-center space-x-3"><button type="button" onClick={saveEdit} className="text-[10px] font-bold text-green-600 hover:underline">SAVE</button><button type="button" onClick={onCancel} className="text-xs font-bold text-gray-400 hover:text-gray-600">x</button></div></td>
    </tr>
  );
}
