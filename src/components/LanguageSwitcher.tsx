import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Locale } from '../lib/translations';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
];

interface LanguageSwitcherProps {
  variant?: 'icon' | 'button';
  className?: string;
}

export function LanguageSwitcher({ variant = 'button', className = '' }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { language, setLanguage, t, isRtl } = useLanguage();

  const currentOption = OPTIONS.find((o) => o.value === language) ?? OPTIONS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: Locale) => {
    setLanguage(value);
    setIsOpen(false);
  };

  const baseClasses = 'relative flex items-center';
  const triggerClasses =
    variant === 'icon'
      ? 'p-2 rounded-lg text-gray-400 hover:text-greenyellow hover:bg-gray-800/50 transition-all duration-200'
      : 'px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-greenyellow hover:bg-gray-800/50 border border-gray-700/50 hover:border-greenyellow/30 transition-all duration-200 flex items-center gap-2';

  return (
    <div ref={menuRef} className={`${baseClasses} ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={triggerClasses}
        title={t('language')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('language')}
      >
        {variant === 'icon' ? (
          <Globe className="w-5 h-5" strokeWidth={1.5} />
        ) : (
          <>
            <Globe className="w-4 h-4 opacity-80" strokeWidth={1.5} />
            <span className="hidden sm:inline">{currentOption.label}</span>
            <ChevronDown
              className={`w-4 h-4 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute top-full mt-1.5 min-w-[160px] bg-gray-900 border border-gray-700/80 rounded-xl shadow-xl shadow-black/30 py-1 z-50 backdrop-blur-sm animate-dropdown ${
            isRtl ? 'left-0' : 'right-0'
          }`}
        >
          <div className="px-3 py-2 border-b border-gray-800/80">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              {t('language')}
            </span>
          </div>
          {OPTIONS.map((opt) => {
            const isSelected = language === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`w-full px-3 py-2.5 flex items-center justify-between gap-3 text-start text-sm transition-colors ${
                  isSelected
                    ? 'text-greenyellow bg-greenyellow/5'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-greenyellow" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
