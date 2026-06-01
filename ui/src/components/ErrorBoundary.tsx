import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React render failed', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900 dark:bg-slate-950 dark:text-gray-100">
        <section className="mx-auto max-w-2xl rounded-lg border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/60 dark:bg-gray-900">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600 dark:text-red-400">
            App render error
          </p>
          <h1 className="mt-3 text-2xl font-bold">The page hit a frontend error.</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Refreshing should pull the newest bundle. If this message stays visible, the browser console will include the exact component stack.
          </p>
          <pre className="mt-5 max-h-56 overflow-auto rounded-md bg-gray-100 p-4 text-xs text-red-700 dark:bg-slate-900 dark:text-red-300">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Refresh
          </button>
        </section>
      </main>
    );
  }
}
