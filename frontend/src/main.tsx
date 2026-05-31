import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortfolioPage } from './components/PortfolioPage';
import { AccountsPage } from './components/AccountsPage';
import { CashFlowPage } from './components/CashFlowPage';
import { MortgagePage } from './components/MortgagePage';
import { ErrorBoundary } from './components/ErrorBoundary';

const root = document.getElementById('root');

if (!root) {
  throw new Error('React root element was not found.');
}

const view = root.dataset.view || 'portfolio';

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      {view === 'accounts'
        ? <AccountsPage />
        : view === 'cashflow'
          ? <CashFlowPage />
          : view === 'mortgage'
            ? <MortgagePage />
            : <PortfolioPage />}
    </ErrorBoundary>
  </StrictMode>
);
