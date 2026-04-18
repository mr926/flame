import { NavLink, Outlet } from 'react-router';
import { cn } from '../../lib/utils.js';

const tabs = [
  { to: '/settings/general', label: 'General' },
  { to: '/settings/pages', label: 'Pages' },
  { to: '/settings/appearance', label: 'Appearance' },
  { to: '/settings/integrations', label: 'Integrations' },
  { to: '/settings/about', label: 'About' },
];

export default function SettingsLayout() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">Settings</h1>
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-8">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
