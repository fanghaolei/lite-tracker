import { lazy, StrictMode, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';

const root = document.getElementById('root');

if (!root) {
  throw new Error('React root element was not found.');
}

const view = root.dataset.view || 'portfolio';
const PortfolioPage = lazy(() => import('./components/PortfolioPage').then(module => ({ default: module.PortfolioPage })));
const AccountsPage = lazy(() => import('./components/AccountsPage').then(module => ({ default: module.AccountsPage })));
const CashFlowPage = lazy(() => import('./components/CashFlowPage').then(module => ({ default: module.CashFlowPage })));
const MortgagePage = lazy(() => import('./components/MortgagePage').then(module => ({ default: module.MortgagePage })));
const pages = {
  portfolio: PortfolioPage,
  accounts: AccountsPage,
  cashflow: CashFlowPage,
  mortgage: MortgagePage
};
const Page = pages[view as keyof typeof pages] || PortfolioPage;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: false
    }
  }
});

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-stone-50 dark:bg-gray-950" />}>
          <Page />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
);
