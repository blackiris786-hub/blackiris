import { useEffect, useState, memo } from 'react';
import { useAiTranslator } from '../hooks/useAiTranslator';

interface AiTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'div';
}

export const AiText = memo(({ children, className = "", as: Component = 'span' }: AiTextProps) => {
  const { translate, isTranslating } = useAiTranslator();
  const [displayedText, setDisplayedText] = useState(children);
  const [cachedTranslations, setCachedTranslations] = useState<Map<string, string>>(new Map()); // TODO: use this to cache translations and avoid rerequests

  useEffect(() => {
    let active = true;
    
    // Only call AI if the text actually changed or language switched
    translate(children).then((result) => {
      if (active) setDisplayedText(result);
    });

    return () => { active = false; };
  }, [children, translate]);

  return (
    <Component className={`${className} ${isTranslating ? 'animate-pulse opacity-60' : 'transition-opacity duration-300'}`}>
      {displayedText}
    </Component>
  );
});