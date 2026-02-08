import { useState, useEffect } from 'react';
import { SunIcon, MoonIcon } from './Icons';

export default function Header() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('lorcana_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('lorcana_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-800 dark:to-primary-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">🎴</span>
              Lorcana Deck Analyzer
            </h1>
            <p className="text-primary-100 text-sm mt-1 hidden sm:block">
              Professional deck analysis and AI-powered coaching
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <SunIcon className="w-6 h-6 text-yellow-300" />
            ) : (
              <MoonIcon className="w-6 h-6 text-white" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
