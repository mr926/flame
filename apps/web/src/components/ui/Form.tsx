import { cn } from '../../lib/utils.js';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'px-3 py-2 text-sm rounded-[var(--radius-button)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
          error && 'border-[var(--color-danger)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={4}
        className={cn(
          'px-3 py-2 text-sm rounded-[var(--radius-button)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-vertical',
          error && 'border-[var(--color-danger)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className, id, children, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'px-3 py-2 text-sm rounded-[var(--radius-button)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] text-[var(--color-text-primary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent',
          error && 'border-[var(--color-danger)]',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={cn(
            'w-10 h-6 rounded-full transition-colors',
            checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]',
          )}
        />
        <div
          className={cn(
            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>}
      </div>
    </label>
  );
}
