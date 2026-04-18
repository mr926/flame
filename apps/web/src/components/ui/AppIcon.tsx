import { Icon } from '@iconify/react';

export function AppIcon({
  iconType,
  iconValue,
  name,
  size = 28,
}: {
  iconType: string;
  iconValue: string | null;
  name: string;
  size?: number;
}) {
  const sz = `${size}px`;

  if (iconType === 'uploaded_file' && iconValue) {
    return (
      <img
        src={iconValue.startsWith('/') ? iconValue : `/uploads/${iconValue}`}
        alt={name}
        style={{ width: sz, height: sz }}
        className="object-contain shrink-0"
      />
    );
  }

  if (iconType === 'remote_url' && iconValue) {
    return (
      <img
        src={iconValue}
        alt={name}
        style={{ width: sz, height: sz }}
        className="object-contain shrink-0"
      />
    );
  }

  if (iconValue) {
    return (
      <Icon
        icon={iconValue}
        style={{ width: sz, height: sz, color: 'var(--color-text-primary)', flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      style={{ width: sz, height: sz }}
      className="shrink-0 flex items-center justify-center rounded font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 text-sm"
    >
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  );
}
