import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '../../audio/audio';

type Variant = 'green' | 'orange' | 'purple' | 'cream' | 'red' | 'blue';

export function Button({
  variant = 'green',
  size = 'md',
  icon,
  children,
  className = '',
  onClick,
  silent,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; silent?: boolean }) {
  return (
    <button
      type="button"
      className={`ffn-btn ffn-btn-${variant} ffn-btn-${size} ${className}`}
      onClick={(e) => {
        if (!silent) audio.play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {icon && <span className="ffn-btn-icon">{icon}</span>}
      {children && <span className="ffn-btn-label">{children}</span>}
    </button>
  );
}

/** Round icon button (pause, settings, back...). `label` is required for screen readers. */
export function IconButton({
  label,
  children,
  className = '',
  badge,
  onClick,
  variant = 'blue',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; badge?: ReactNode; variant?: Variant }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`ffn-icon-btn ffn-btn-${variant} ${className}`}
      onClick={(e) => {
        audio.play('click');
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
      {badge !== undefined && badge !== null && badge !== false && <span className="ffn-badge">{badge}</span>}
    </button>
  );
}
