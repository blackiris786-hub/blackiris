import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { translations, type Locale } from '../lib/translations';

const STORAGE_KEY = 'blackiris_language';

interface LanguageContextType {
  language: Locale;
  setLanguage: (lang: Locale) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Get language from localStorage
function getStoredLanguage(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') return saved;
  } catch {
    // Ignore errors
  }
  return 'en';
}

// Apply language to document
function applyLanguage(lang: Locale) {
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Locale>(getStoredLanguage());

  useEffect(() => {
    applyLanguage(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage errors
    }
  }, [language]);

  const setLanguage = (lang: Locale) => {
    setLanguageState(lang);
  };

  // Get translated text
  const t = (key: string): string => {
    const dict = translations[language];
    return dict[key] ?? translations.en[key] ?? key;
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isRtl: language === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext) as LanguageContextType | null;
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
