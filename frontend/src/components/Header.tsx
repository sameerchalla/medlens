import { Activity, Wifi, WifiOff, Printer, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  apiStatus: 'loading' | 'connected' | 'disconnected';
}

export default function Header({ apiStatus }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm print:shadow-none">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 rounded-lg p-2">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">MedLens</h1>
            <p className="text-xs text-gray-500 dark:text-slate-300">Clinical Information Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handlePrint}
            className="print:hidden flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Print or Export Summary"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print / Export</span>
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            aria-pressed={theme === 'dark'}
            className="print:hidden flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {apiStatus === 'connected' ? (
            <span className="hidden print:flex items-center gap-2 text-sm text-green-600">
              <Wifi className="w-4 h-4" />
              API Connected
            </span>
          ) : apiStatus === 'disconnected' ? (
            <span className="hidden print:flex items-center gap-2 text-sm text-red-600">
              <WifiOff className="w-4 h-4" />
              API Disconnected
            </span>
          ) : (
            <span className="hidden print:flex text-sm text-gray-400">Checking API...</span>
          )}
        </div>
      </div>
    </header>
  );
}
