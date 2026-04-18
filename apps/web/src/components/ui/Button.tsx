import { cn } from '../../lib/utils.js';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]': variant === 'primary',
          'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]':
            variant === 'secondary',
          'bg-[var(--color-danger)] text-white hover:opacity-90': variant === 'danger',
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]':
            variant === 'ghost',
          'px-2 py-1 text-xs rounded': size === 'sm',
          'px-4 py-2 text-sm rounded-[var(--radius-button)]': size === 'md',
          'px-6 py-3 text-base rounded-[var(--radius-button)]': size === 'lg',
        },
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
