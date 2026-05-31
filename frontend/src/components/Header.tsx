import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { fetchBrandingSettings, saveBrandingSettings } from '../api';
import type { Theme } from '../hooks';
import type { BrandingSettings } from '../types';
import { EditIcon, EyeIcon, MoonIcon, SunIcon } from './Icons';

type View = 'portfolio' | 'accounts' | 'cashflow' | 'mortgage';

type Props = {
  view: View;
  theme: Theme;
  privacyMode: boolean;
  onToggleTheme: () => void;
  onTogglePrivacy: () => void;
  controls?: ReactNode;
  stats: ReactNode;
};

const defaultBranding: BrandingSettings = {
  app_name: 'Lite Tracker',
  portfolio_subtitle: '\u{1F33F} Portfolio growth in motion \u{1FA99}',
  accounts_subtitle: '\u{1F9ED} Accounts in balance \u{1FA99}',
  cashflow_subtitle: '\u{1F4C6} Cash flow with confidence \u{1FA99}',
  mortgage_subtitle: '\u{1F3E0} Home equity in motion \u{1FA99}'
};

const navIcons = {
  portfolio: '\u{1F33F}',
  accounts: '\u{1F9ED}',
  cashflow: '\u{1F4C6}',
  mortgage: '\u{1F3E0}'
};

const viewLabels: Record<View, string> = {
  portfolio: 'Portfolio',
  accounts: 'Accounts',
  cashflow: 'Cash Flow',
  mortgage: 'Mortgage'
};

const subtitleKeys: Record<View, keyof BrandingSettings> = {
  portfolio: 'portfolio_subtitle',
  accounts: 'accounts_subtitle',
  cashflow: 'cashflow_subtitle',
  mortgage: 'mortgage_subtitle'
};

export function Header({ view, theme, privacyMode, onToggleTheme, onTogglePrivacy, controls, stats }: Props) {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [draftName, setDraftName] = useState(defaultBranding.app_name);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingError, setBrandingError] = useState('');
  const active = 'text-sm font-bold pb-1 border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-300';
  const inactive = 'text-sm font-bold pb-1 border-b-2 border-transparent text-gray-400 hover:text-gray-600';
  const subtitle = branding[subtitleKeys[view]];

  useEffect(() => {
    let mounted = true;
    fetchBrandingSettings()
      .then(data => {
        if (mounted) {
          const nextBranding = { ...defaultBranding, ...data };
          setBranding(nextBranding);
          setDraftName(nextBranding.app_name);
        }
      })
      .catch(() => {
        if (mounted) {
          setBranding(defaultBranding);
          setDraftName(defaultBranding.app_name);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.title = `${branding.app_name} | ${viewLabels[view]}`;
  }, [branding.app_name, view]);

  function startBrandingEdit() {
    setDraftName(branding.app_name);
    setBrandingError('');
    setIsEditingBranding(true);
  }

  function cancelBrandingEdit() {
    setDraftName(branding.app_name);
    setBrandingError('');
    setIsEditingBranding(false);
  }

  async function handleBrandingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const appName = draftName.trim();
    if (!appName) {
      setBrandingError('Name is required.');
      return;
    }

    setIsSavingBranding(true);
    setBrandingError('');
    try {
      const saved = await saveBrandingSettings({ app_name: appName });
      const nextBranding = { ...defaultBranding, ...saved };
      setBranding(nextBranding);
      setDraftName(nextBranding.app_name);
      setIsEditingBranding(false);
    } catch {
      setBrandingError('Could not save name.');
    } finally {
      setIsSavingBranding(false);
    }
  }

  return (
    <header className="flex justify-between items-start mb-10">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="brand-wordmark text-5xl font-black tracking-tight">
            {branding.app_name}
          </h1>
          <button
            type="button"
            aria-label="Edit app name"
            title="Edit app name"
            className="mt-2 rounded-full p-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            onClick={startBrandingEdit}
          >
            <EditIcon />
          </button>
        </div>
        {isEditingBranding && (
          <form onSubmit={handleBrandingSubmit} className="mt-3 flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">App Name</span>
              <input
                value={draftName}
                onChange={event => setDraftName(event.target.value)}
                className="h-9 w-52 rounded-lg border border-emerald-100 bg-white px-3 text-sm font-bold text-gray-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-emerald-900/50"
                autoFocus
              />
            </label>
            <button
              type="submit"
              disabled={isSavingBranding}
              className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSavingBranding ? 'Saving' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelBrandingEdit}
              className="h-9 rounded-lg px-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            {brandingError && <span className="text-xs font-bold text-red-500">{brandingError}</span>}
          </form>
        )}
        <p className="brand-subtitle text-xs font-bold uppercase">{subtitle}</p>
        <nav className="mt-4 flex gap-6">
          <a href="/" className={view === 'portfolio' ? active : inactive}>{navIcons.portfolio} Portfolio</a>
          <a href="/accounts" className={view === 'accounts' ? active : inactive}>{navIcons.accounts} Accounts</a>
          <a href="/cash-flow" className={view === 'cashflow' ? active : inactive}>{navIcons.cashflow} Cash Flow</a>
          <a href="/mortgage" className={view === 'mortgage' ? active : inactive}>{navIcons.mortgage} Mortgage</a>
        </nav>
      </div>
      <div className="text-right">
        <div className="flex items-center justify-end gap-3 mb-2">
          <button type="button" aria-label="Toggle dark mode" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={onToggleTheme}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button type="button" aria-label="Hide numeric values" title="Hide numeric values" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={onTogglePrivacy}>
            <EyeIcon hidden={privacyMode} />
          </button>
          {controls}
        </div>
        <div id="portfolio-stats" className="flex gap-4 text-sm">{stats}</div>
      </div>
    </header>
  );
}
