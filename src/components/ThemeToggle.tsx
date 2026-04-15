import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <style>
        {`
          @keyframes slideToggle {
            from {
              transform: translateX(2px);
            }
            to {
              transform: translateX(20px);
            }
          }
          .theme-toggle-active .toggle-circle {
            animation: slideToggle 0.3s ease-in-out forwards;
          }
          .theme-toggle:hover {
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
          }
          .dark .theme-toggle:hover {
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
          }
        `}
      </style>
      <button
        onClick={toggleTheme}
        className={`theme-toggle ${theme === 'dark' ? 'theme-toggle-active' : ''} relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-300 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-purple-900 dark:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-900 ${className}`}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span className={`toggle-circle inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
        
        <span className="absolute left-2 text-sm opacity-60 dark:opacity-0 transition-opacity duration-300">☀️</span>
        <span className="absolute right-2 text-sm opacity-0 dark:opacity-60 transition-opacity duration-300">🌙</span>
      </button>
    </>
  );
};