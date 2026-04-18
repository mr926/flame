import { useApps, useCategories, useBookmarks, useSettings, useSession } from '../api/hooks.js';
import { Icon } from '@iconify/react';
import { AppIcon } from '../components/ui/AppIcon.js';

export default function HomePage() {
  const { data: session } = useSession();
  const { data: settings } = useSettings();
  const { data: apps = [], isLoading: appsLoading } = useApps();
  const { data: categories = [] } = useCategories();
  const { data: bookmarks = [] } = useBookmarks();

  const visibleApps = session?.authenticated
    ? apps
    : apps.filter((a) => a.is_public);

  const visibleCats = session?.authenticated
    ? categories
    : categories.filter((c) => c.is_public);

  const target = settings?.apps_open_in_new_tab ? '_blank' : '_self';
  const bmTarget = settings?.bookmarks_open_in_new_tab ? '_blank' : '_self';

  return (
    <div className="space-y-12">
      {/* Apps */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)] mb-5">
          Applications
        </h2>
        {appsLoading ? null : visibleApps.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {session?.authenticated ? 'No apps yet — go to Apps to add some.' : 'No public apps.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-x-4 gap-y-1">
            {visibleApps.map((app) => (
              <a
                key={app.id}
                href={app.url}
                target={target}
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-1.5 rounded group hover:bg-black/20 px-1 transition-colors"
              >
                <AppIcon iconType={app.icon_type} iconValue={app.icon_value} name={app.name} />
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase truncate text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">
                    {app.name}
                  </div>
                  {app.description && (
                    <div className="text-[10px] text-[var(--color-text-secondary)] truncate">{app.description}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Bookmarks */}
      {visibleCats.length > 0 && (
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)] mb-5">
            Bookmarks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-6">
            {visibleCats.map((cat) => {
              const bms = bookmarks.filter((b) =>
                b.category_id === cat.id && (session?.authenticated || b.is_public)
              );
              return (
                <div key={cat.id}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-accent)] mb-2">
                    {cat.name}
                  </h3>
                  <ul>
                    {bms.map((bm) => (
                      <li key={bm.id}>
                        <a
                          href={bm.url}
                          target={bmTarget}
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)] leading-loose hover:pl-2 hover:text-[var(--color-accent)] hover:underline transition-all"
                        >
                          {bm.icon_value && (
                            bm.icon_type === 'uploaded_file' || bm.icon_type === 'remote_url'
                              ? <img src={bm.icon_value.startsWith('/') ? bm.icon_value : `/uploads/${bm.icon_value}`} className="w-4 h-4 object-contain shrink-0" alt="" />
                              : <Icon icon={bm.icon_value} width={14} height={14} color="var(--color-text-secondary)" className="shrink-0" />
                          )}
                          {bm.name}
                        </a>
                      </li>
                    ))}
                    {bms.length === 0 && (
                      <li className="text-xs text-[var(--color-text-secondary)]">Empty</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
