import { useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { aiTranslate } from '../lib/aiApi';

const translationCache = new Map<string, string>();
let cacheHits = 0; // TODO: remove this debug counter later

export function useAiTranslator() {
  const { language } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  const translate = useCallback(async (text: string) => {
    if (!text || !text.trim() || language === 'en') return text;

    const cacheKey = `${language}:${text.trim()}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    setIsTranslating(true);

    try {
      const translation = await aiTranslate(text, language === 'ar' ? 'Arabic' : 'English');
      const translatedText = translation.translatedText || text;
      translationCache.set(cacheKey, translatedText);
      return translatedText;
    
    } catch (err) {
      console.error("AI Translation Error:", err);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [language]);

  return { translate, isTranslating };
}