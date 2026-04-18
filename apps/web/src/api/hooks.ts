import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client.js';

export const useSession = () =>
  useQuery({ queryKey: ['session'], queryFn: api.auth.session, retry: false });

export const useApps = () =>
  useQuery({ queryKey: ['apps'], queryFn: api.apps.list });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: api.categories.list });

export const useBookmarks = (categoryId?: number) =>
  useQuery({
    queryKey: ['bookmarks', categoryId],
    queryFn: () => api.bookmarks.list(categoryId),
  });

export const useThemes = () =>
  useQuery({ queryKey: ['themes'], queryFn: api.themes.list });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: api.settings.get });

export const useIntegrationStatus = () =>
  useQuery({ queryKey: ['integrations', 'status'], queryFn: api.integrations.status });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.apps.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

export function useUpdateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.apps.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.apps.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.categories.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bookmarks.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });
}

export function useUpdateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.bookmarks.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });
}

export function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bookmarks.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });
}

export function useReorderApps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.apps.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

export function useReorderCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.categories.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useReorderBookmarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, ids }: { categoryId: number; ids: number[] }) =>
      api.bookmarks.reorder(categoryId, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });
}

export function useCreateTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.themes.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['themes'] }),
  });
}

export function useDeleteTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.themes.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['themes'] }),
  });
}

export const useGroups = () =>
  useQuery({ queryKey: ['groups'], queryFn: api.groups.list });

export const usePages = () =>
  useQuery({ queryKey: ['pages'], queryFn: api.pages.list });

export const usePage = (slug: string) =>
  useQuery({ queryKey: ['pages', slug], queryFn: () => api.pages.bySlug(slug), enabled: !!slug });

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.groups.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.groups.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.groups.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useReorderGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.groups.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.pages.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useUpdatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.pages.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.pages.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useReorderPages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.pages.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pages'] }),
  });
}

export function useSyncDocker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.integrations.syncDocker,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['apps'] });
    },
  });
}

export function useSyncKubernetes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.integrations.syncKubernetes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['apps'] });
    },
  });
}
