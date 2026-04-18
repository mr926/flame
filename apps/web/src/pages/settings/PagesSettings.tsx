import { useState } from 'react';
import { usePages, useGroups, useCreatePage, useUpdatePage, useDeletePage, useReorderPages } from '../../api/hooks.js';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Page, Group } from '@flame-claude/shared';

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

type PageDraft = { name: string; slug: string; is_public: boolean; show_apps: boolean; group_ids: number[] };

export default function PagesSettings() {
  const { data: pages = [] } = usePages();
  const { data: groups = [] } = useGroups();
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const reorderPages = useReorderPages();

  const [localPages, setLocalPages] = useState<Page[] | null>(null);
  const displayPages = localPages ?? pages;

  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PageDraft | null>(null);
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<PageDraft>({ name: '', slug: '', is_public: true, show_apps: true, group_ids: [] });
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const startEdit = (p: Page) => {
    setEditId(p.id);
    setDraft({ name: p.name, slug: p.slug, is_public: p.is_public, show_apps: p.show_apps, group_ids: p.group_ids });
    setError('');
  };

  const handleSave = async (id: number) => {
    if (!draft) return;
    setError('');
    try {
      await updatePage.mutateAsync({ id, body: draft });
      setEditId(null);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleAdd = async () => {
    setError('');
    if (!newDraft.name.trim()) return;
    try {
      await createPage.mutateAsync(newDraft);
      setAdding(false);
      setNewDraft({ name: '', slug: '', is_public: true, show_apps: true, group_ids: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const handleDragEnd = (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const base = localPages ?? pages;
    const oldIndex = base.findIndex((p) => p.id === active.id);
    const newIndex = base.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(base, oldIndex, newIndex);
    setLocalPages(reordered);
    reorderPages.mutate(reordered.map((p) => p.id));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">Pages</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Pages appear as links in the navigation bar. Each page shows selected groups of bookmarks and optionally the apps section.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayPages.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {displayPages.map((page) => (
              editId === page.id && draft ? (
                <PageEditForm
                  key={page.id}
                  draft={draft}
                  groups={groups}
                  onChange={setDraft}
                  onSave={() => handleSave(page.id)}
                  onCancel={() => { setEditId(null); setDraft(null); }}
                  error={error}
                />
              ) : (
                <PageRow
                  key={page.id}
                  page={page}
                  groups={groups}
                  onEdit={() => startEdit(page)}
                  onDelete={() => deletePage.mutate(page.id)}
                />
              )
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add form */}
      {adding ? (
        <PageEditForm
          draft={newDraft}
          groups={groups}
          onChange={setNewDraft}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setError(''); }}
          error={error}
          isNew
        />
      ) : (
        <button onClick={() => setAdding(true)} className="flame-btn mt-2">+ New Page</button>
      )}
    </div>
  );
}

function PageRow({ page, groups, onEdit, onDelete }: { page: Page; groups: Group[]; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
  const groupNames = page.group_ids.map((gid) => groups.find((g) => g.id === gid)?.name).filter(Boolean).join(', ');

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 py-2 px-1 group ${isDragging ? 'opacity-50' : ''}`}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 text-lg select-none">⠿</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[var(--color-text-primary)] font-medium">{page.name}</span>
        <span className="text-xs text-[var(--color-text-secondary)] ml-2">/{page.slug}</span>
        <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          {page.show_apps && <span className="mr-2">Apps</span>}
          {groupNames && <span>{groupNames}</span>}
          {!page.is_public && <span className="ml-2 text-[var(--color-danger)]">Private</span>}
        </div>
      </div>
      <button onClick={onEdit} className="text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-accent)]">Edit</button>
      <button onClick={onDelete} className="text-xs text-[var(--color-danger)] opacity-0 group-hover:opacity-100">Delete</button>
    </div>
  );
}

function PageEditForm({ draft, groups, onChange, onSave, onCancel, error, isNew = false }: {
  draft: PageDraft;
  groups: Group[];
  onChange: (d: PageDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  error?: string;
  isNew?: boolean;
}) {
  const toggleGroup = (gid: number) => {
    const ids = draft.group_ids.includes(gid)
      ? draft.group_ids.filter((id) => id !== gid)
      : [...draft.group_ids, gid];
    onChange({ ...draft, group_ids: ids });
  };

  return (
    <div className="border border-[var(--color-border)] rounded p-4 space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Name</label>
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value, slug: isNew ? slugify(e.target.value) : draft.slug })}
            className="inline-input text-sm w-full"
            placeholder="Page name"
            autoFocus
          />
        </div>
        <div className="flex-1 min-w-32">
          <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Slug (URL)</label>
          <input
            value={draft.slug}
            onChange={(e) => onChange({ ...draft, slug: slugify(e.target.value) })}
            className="inline-input text-sm w-full font-mono"
            placeholder="page-slug"
          />
        </div>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
          <input type="checkbox" checked={draft.is_public} onChange={(e) => onChange({ ...draft, is_public: e.target.checked })} className="accent-[var(--color-accent)]" />
          Public
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
          <input type="checkbox" checked={draft.show_apps} onChange={(e) => onChange({ ...draft, show_apps: e.target.checked })} className="accent-[var(--color-accent)]" />
          Show Apps
        </label>
      </div>

      {groups.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">Groups to show (empty = show ungrouped categories)</p>
          <div className="flex flex-wrap gap-3">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
                <input type="checkbox" checked={draft.group_ids.includes(g.id)} onChange={() => toggleGroup(g.id)} className="accent-[var(--color-accent)]" />
                {g.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

      <div className="flex gap-3">
        <button onClick={onSave} disabled={!draft.name.trim() || !draft.slug.trim()} className="flame-btn disabled:opacity-40">
          {isNew ? 'Create Page' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Cancel</button>
      </div>
    </div>
  );
}
