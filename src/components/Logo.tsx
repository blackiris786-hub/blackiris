import logoSvg from '../../public/logo.svg';

export function Logo({
  className,
  iconClassName,
  textClassName,
  variant = 'icon',
  animate = false,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  variant?: 'icon' | 'full';
  animate?: boolean;
}) {
  const wrapperClass = [
    'inline-flex items-center justify-center gap-2',
    animate ? 'animate-pulse' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sizeClass = iconClassName || (variant === 'full' ? 'w-12 h-12' : 'w-10 h-10');

  return (
    <div className={wrapperClass} role="img" aria-label="Blackiris logo">
      <img
        src={logoSvg}
        alt="Blackiris" 
        className={`${sizeClass} object-contain drop-shadow-lg`}
      />
      {variant === 'full' && (
        <span className={textClassName ?? 'text-2xl font-bold tracking-wide bg-gradient-to-r from-[#34D399] to-[#16A34A] bg-clip-text text-transparent ml-2'}>
          BLACKIRIS
        </span>
      )}
    </div>
  );
}

