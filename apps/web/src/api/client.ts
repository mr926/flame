import type { App, Category, Bookmark, Theme, Settings, SessionInfo, Group, Page } from '@flame-claude/shared';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...init?.headers },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json() as { data: T };
  return json.data;
}

export type BookmarkItem = { id: number; name: string; url: string; icon_type: string; icon_value: string | null; is_public: boolean; sort_order: number };
export type CategoryItem = { id: number; name: string; sort_order: number; is_public: boolean; bookmarks: BookmarkItem[] };
export type GroupItem = { id: number | null; name: string | null; categories: CategoryItem[] };
export type PageDetail = Page & { groups: GroupItem[]; apps: App[] };

// Auth
export const api = {
  auth: {
    session: () => request<SessionInfo>('/auth/session'),
    setup: (username: string, password: string) =>
      request<{ ok: boolean }>('/auth/setup', { method: 'POST', body: JSON.stringify({ username, password }) }),
    login: (username: string, password: string) =>
      request<{ ok: boolean }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  },

  apps: {
    list: () => request<App[]>('/apps'),
    create: (body: unknown) =>
      request<App>('/apps', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) =>
      request<App>(`/apps/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/apps/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) =>
      request<{ ok: boolean }>('/apps/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  categories: {
    list: () => request<Category[]>('/categories'),
    create: (body: unknown) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) =>
      request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) =>
      request<{ ok: boolean }>('/categories/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  bookmarks: {
    list: (categoryId?: number) =>
      request<Bookmark[]>(`/bookmarks${categoryId !== undefined ? `?category_id=${categoryId}` : ''}`),
    create: (body: unknown) =>
      request<Bookmark>('/bookmarks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) =>
      request<Bookmark>(`/bookmarks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/bookmarks/${id}`, { method: 'DELETE' }),
    reorder: (categoryId: number, ids: number[]) =>
      request<{ ok: boolean }>('/bookmarks/reorder', {
        method: 'POST',
        body: JSON.stringify({ category_id: categoryId, ids }),
      }),
  },

  themes: {
    list: () => request<Theme[]>('/themes'),
    create: (body: unknown) =>
      request<Theme>('/themes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) =>
      request<Theme>(`/themes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/themes/${id}`, { method: 'DELETE' }),
  },

  settings: {
    get: () => request<Settings>('/settings'),
    update: (body: Partial<Settings>) =>
      request<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  },

  integrations: {
    status: () =>
      request<{ docker: { enabled: boolean; lastRun: unknown }; kubernetes: { enabled: boolean; lastRun: unknown } }>(
        '/integrations/status',
      ),
    runs: () => request<unknown[]>('/integrations/runs'),
    syncDocker: () => request<{ ok: boolean }>('/integrations/docker/sync', { method: 'POST' }),
    syncKubernetes: () => request<{ ok: boolean }>('/integrations/kubernetes/sync', { method: 'POST' }),
  },

  upload: {
    icon: async (file: File): Promise<{ filename: string; url: string }> => {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/upload/icon', { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const json = await res.json() as { data: { filename: string; url: string } };
      return json.data;
    },
  },

  groups: {
    list: () => request<Group[]>('/groups'),
    create: (body: unknown) => request<Group>('/groups', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<Group>(`/groups/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/groups/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) => request<{ ok: boolean }>('/groups/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  pages: {
    list: () => request<Page[]>('/pages'),
    bySlug: (slug: string) => request<PageDetail>(`/pages/${slug}`),
    create: (body: unknown) => request<Page>('/pages', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: unknown) => request<Page>(`/pages/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: number) => request<void>(`/pages/${id}`, { method: 'DELETE' }),
    reorder: (ids: number[]) => request<{ ok: boolean }>('/pages/reorder', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  import: {
    flame: async (file: File, clearFirst = false): Promise<{ imported: Record<string, number>; errors: string[] }> => {
      const form = new FormData();
      form.append('file', file);
      const url = `/api/import/flame/upload${clearFirst ? '?clear=true' : ''}`;
      const res = await fetch(url, { method: 'POST', body: form, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error((err as { message?: string }).message ?? res.statusText);
      }
      const json = await res.json() as { data: { imported: Record<string, number>; errors: string[] } };
      return json.data;
    },
  },
};
