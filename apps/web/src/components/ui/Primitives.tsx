import { cn } from '../../lib/utils.js';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-4',
        onClick && 'cursor-pointer hover:border-[var(--color-accent)] transition-colors',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-[var(--radius-card)] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-[var(--color-text-secondary)] text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="px-4 py-2 text-sm bg-[var(--color-danger)] text-white rounded-[var(--radius-button)] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </Dialog>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin h-5 w-5', className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-3 text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 rounded-[var(--radius-button)] border border-[var(--color-danger)]/20">
      {message}
    </div>
  );
}

export function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'error' }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', {
      'bg-[var(--color-border)] text-[var(--color-text-secondary)]': variant === 'default',
      'bg-green-100 text-green-800': variant === 'success',
      'bg-red-100 text-red-800': variant === 'error',
    })}>
      {children}
    </span>
  );
}
