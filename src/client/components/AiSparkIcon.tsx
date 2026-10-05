import React from 'react';
import { cn } from '@/lib/utils';

export interface AiSparkIconProps {
  size?: number | string;
  className?: string;
  variant?: 'thinking' | 'pulse' | 'twinkle' | 'orbit' | 'idle';
  style?: React.CSSProperties;
}

/**
 * Modern, symmetrical AI Sparkle / Starburst icon with refined micro-animations.
 * Replaces asymmetric, off-center spinning stars with elegant harmonic breathing,
 * radial beacon pulses, and crisp vector geometry.
 */
export const AiSparkIcon: React.FC<AiSparkIconProps> = ({
  size = 14,
  className,
  variant = 'idle',
  style
}) => {
  const sizePx = typeof size === 'number' ? `${size}px` : size;

  // Determine animation classes based on variant
  const getAnimationClass = () => {
    switch (variant) {
      case 'thinking':
        return 'animate-ai-breathe origin-center';
      case 'pulse':
        return 'animate-ai-pulse origin-center';
      case 'twinkle':
        return 'animate-ai-twinkle origin-center';
      case 'orbit':
        return 'origin-center';
      case 'idle':
      default:
        return '';
    }
  };

  return (
    <span
      className={cn('inline-flex items-center justify-center relative shrink-0', className)}
      style={{ width: sizePx, height: sizePx, ...style }}
      aria-hidden="true"
    >
      {/* Optional ambient beacon pulse for 'orbit' mode */}
      {variant === 'orbit' && (
        <span
          className="absolute inset-0 rounded-full border border-current opacity-40 animate-ai-orbit pointer-events-none"
        />
      )}

      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn('w-full h-full transition-transform', getAnimationClass())}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Perfectly centered 4-point curved celestial starburst */}
        <path
          d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        />
        {/* Subtle luminous core accent */}
        <circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,0.7)" />
      </svg>
    </span>
  );
};

export default AiSparkIcon;
