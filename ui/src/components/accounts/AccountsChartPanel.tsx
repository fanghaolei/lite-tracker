import { AccountDoughnutChart } from '../charts/AccountCharts';

type AccountsChartPanelProps = {
  allocations: { account: string; value: number }[];
  privacyMode: boolean;
  themeSignal: string;
};

export function AccountsChartPanel({ allocations, privacyMode, themeSignal }: AccountsChartPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8 h-72 overflow-hidden">
      <div className="chart-container">
        <AccountDoughnutChart allocations={allocations} privacyMode={privacyMode} themeSignal={themeSignal} />
      </div>
    </div>
  );
}
