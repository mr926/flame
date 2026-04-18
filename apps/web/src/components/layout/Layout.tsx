import { Link, useLocation, useNavigate } from 'react-router';
import { useSession, usePages } from '../../api/hooks.js';
import { api } from '../../api/client.js';
import { useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../../api/hooks.js';
import { cn } from '../../lib/utils.js';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}

function Navbar() {
  const { data: session } = useSession();
  const { data: settings } = useSettings();
  const { data: pages = [] } = usePages();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = async () => {
    await api.auth.logout();
    qc.setQueryData(['session'], { authenticated: false, setupRequired: false });
    navigate('/login');
  };

  const navLink = (to: string, label: string) => (
    <Link
      key={to}
      to={to}
      className={cn(
        'text-sm uppercase tracking-wide transition-colors',
        isActive(to)
          ? 'text-[var(--color-accent)]'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      )}
    >
      {label}
    </Link>
  );

  const visiblePages = session?.authenticated ? pages : pages.filter((p) => p.is_public);

  return (
    <header className="px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
      <div className="flex items-center gap-8">
        <Link to="/" className="font-bold text-[var(--color-accent)] text-lg tracking-wide">
          {settings?.site_title ?? 'Flame'}
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {/* Dynamic pages */}
          {visiblePages.map((p) => navLink(`/p/${p.slug}`, p.name))}
          {/* Admin-only management links */}
          {session?.authenticated && (
            <>
              <span className="text-[var(--color-border)] select-none">|</span>
              {navLink('/admin/apps', 'Apps')}
              {navLink('/admin/bookmarks', 'Bookmarks')}
              {navLink('/settings', 'Settings')}
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {session?.authenticated ? (
          <button
            onClick={handleLogout}
            className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="text-xs uppercase tracking-wide text-[var(--color-accent)] hover:opacity-80">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
