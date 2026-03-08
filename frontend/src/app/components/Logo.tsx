interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 36, className = '' }: LogoMarkProps) {
  const width = Math.round(size * (100 / 115));
  return (
    <svg
      viewBox="0 0 100 115"
      width={width}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* Shield left face (lighter) */}
      <path d="M50 2 L10 30 L10 65 Q10 95 50 110 L50 2Z" fill="#52B788" />
      {/* Shield right face (darker) */}
      <path d="M50 2 L90 30 L90 65 Q90 95 50 110 L50 2Z" fill="#3A9168" />
      {/* Inner shield fill */}
      <path d="M50 16 L22 36 L22 60 Q22 82 50 98 Q78 82 78 60 L78 36Z" fill="#A8E2B2" />
      {/* Roof accent */}
      <path d="M50 2 L10 30 L22 36 L50 16 L78 36 L90 30Z" fill="#3A9168" opacity="0.3" />
      {/* Roof window */}
      <rect x="45" y="20" width="10" height="8" rx="1.5" fill="#1B4332" />
      {/* Barbell bar */}
      <rect x="27" y="50" width="46" height="3.5" rx="1.75" fill="#1B4332" />
      {/* Left outer plate */}
      <rect x="27" y="42" width="5.5" height="19" rx="1.5" fill="#1B4332" />
      {/* Left inner plate */}
      <rect x="34.5" y="44.5" width="4" height="14" rx="1" fill="#1B4332" />
      {/* Right outer plate */}
      <rect x="67.5" y="42" width="5.5" height="19" rx="1.5" fill="#1B4332" />
      {/* Right inner plate */}
      <rect x="61.5" y="44.5" width="4" height="14" rx="1" fill="#1B4332" />
      {/* Left end cap */}
      <rect x="24" y="49" width="3" height="5" rx="1" fill="#1B4332" />
      {/* Right end cap */}
      <rect x="73" y="49" width="3" height="5" rx="1" fill="#1B4332" />
      {/* Keyhole circle */}
      <circle cx="50" cy="76" r="5.5" fill="#1B4332" />
      {/* Keyhole slot */}
      <path d="M46.5 76 L50 91 L53.5 76Z" fill="#1B4332" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'dark' | 'light';
}

export function Logo({ size = 36, className = '', variant = 'dark' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <span className="font-display font-bold" style={{ fontSize: size * 0.7 }}>
        {variant === 'dark' ? (
          <>
            <span className="text-forest-900">Gym</span>
            <span className="text-sage-dark">Access</span>
          </>
        ) : (
          <>
            <span className="text-white">Gym</span>
            <span className="text-sage-light">Access</span>
          </>
        )}
      </span>
    </span>
  );
}
