import { useState, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import type { App } from '@flame-claude/shared';
import { useApps, useCreateApp, useUpdateApp, useDeleteApp, useReorderApps } from '../api/hooks.js';
import { api } from '../api/client.js';
import { Spinner } from '../components/ui/Primitives.js';
import { AppIcon } from '../components/ui/AppIcon.js';

interface RowDraft {
  name: string;
  url: string;
  description: string;
  icon_type: 'iconify' | 'uploaded_file' | 'remote_url';
  icon_value: string;
  is_public: boolean;
}

const emptyDraft = (): RowDraft => ({
  name: '', url: '', description: '', icon_type: 'iconify', icon_value: '', is_public: true,
});

const draftFromApp = (app: App): RowDraft => ({
  name: app.name,
  url: app.url,
  description: app.description ?? '',
  icon_type: app.icon_type === 'mdi' ? 'iconify' : app.icon_type as RowDraft['icon_type'],
  icon_value: app.icon_value ?? '',
  is_public: app.is_public,
});

const draftToPayload = (d: RowDraft) => ({
  name: d.name,
  url: d.url,
  description: d.description || undefined,
  icon_type: d.icon_type === 'iconify' ? 'mdi' as const : d.icon_type,
  icon_value: d.icon_value || undefined,
  is_public: d.is_public,
  is_pinned: true,
});

export default function AppsPage() {
  const { data: serverApps = [], isLoading, error } = useApps();
  const [localApps, setLocalApps] = useState<App[] | null>(null);
  const apps = localApps ?? serverApps;

  const [editId, setEditId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<RowDraft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<RowDraft>(emptyDraft());
  const [rowErrors, setRowErrors] = useState<Record<string | number, string>>({});

  const createApp = useCreateApp();
  const updateApp = useUpdateApp();
  const deleteApp = useDeleteApp();
  const reorderApps = useReorderApps();
  const dragging = useRef(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    dragging.current = false;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const base = localApps ?? serverApps;
    const reordered = arrayMove(base, base.findIndex(a => a.id === active.id), base.findIndex(a => a.id === over.id));
    setLocalApps(reordered);
    reorderApps.mutate(reordered.map(a => a.id));
  }

  async function commitNew() {
    if (!newDraft.name.trim() || !newDraft.url.trim()) {
      setRowErrors(p => ({ ...p, new: 'Name and URL are required' })); return;
    }
    setRowErrors(p => ({ ...p, new: '' }));
    try {
      await createApp.mutateAsync(draftToPayload(newDraft));
      setAdding(false); setNewDraft(emptyDraft()); setLocalApps(null);
    } catch (e) { setRowErrors(p => ({ ...p, new: e instanceof Error ? e.message : 'Failed' })); }
  }

  async function commitEdit(app: App) {
    if (!editDraft.name.trim() || !editDraft.url.trim()) {
      setRowErrors(p => ({ ...p, [app.id]: 'Name and URL are required' })); return;
    }
    setRowErrors(p => ({ ...p, [app.id]: '' }));
    try {
      await updateApp.mutateAsync({ id: app.id, body: draftToPayload(editDraft) });
      setEditId(null); setLocalApps(null);
    } catch (e) { setRowErrors(p => ({ ...p, [app.id]: e instanceof Error ? e.message : 'Failed' })); }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <p className="text-[var(--color-danger)] text-sm">{error.message}</p>;

  // cols: drag | icon | name | url | desc | public | actions
  const colTemplate = '1.2rem 1.8rem 1.8fr 2fr 1.4fr 3.5rem 5rem';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">Applications</h1>
        {!adding && (
          <button onClick={() => { setAdding(true); setNewDraft(emptyDraft()); }} className="flame-btn">
            + Add App
          </button>
        )}
      </div>

      <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden">
        {/* Table header */}
        <div
          className="px-3 py-2 text-xs uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)] bg-[var(--color-surface)]"
          style={{ display: 'grid', gridTemplateColumns: colTemplate, gap: '0.5rem', alignItems: 'center' }}
        >
          <span />
          <span>Icon</span>
          <span>Name</span>
          <span>URL</span>
          <span>Description</span>
          <span className="text-center">Public</span>
          <span />
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={() => { dragging.current = true; }} onDragEnd={handleDragEnd}>
          <SortableContext items={apps.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {apps.map(app =>
              editId === app.id ? (
                <EditPanel
                  key={app.id}
                  draft={editDraft}
                  onChange={setEditDraft}
                  onSave={() => commitEdit(app)}
                  onCancel={() => { setEditId(null); setRowErrors(p => ({ ...p, [app.id]: '' })); }}
                  saving={updateApp.isPending}
                  error={rowErrors[app.id] ?? ''}
                />
              ) : (
                <AppRow
                  key={app.id}
                  app={app}
                  colTemplate={colTemplate}
                  onEdit={() => { setEditId(app.id); setEditDraft(draftFromApp(app)); }}
                  onDelete={async () => { await deleteApp.mutateAsync(app.id); setLocalApps(null); }}
                />
              )
            )}
          </SortableContext>
        </DndContext>

        {adding && (
          <EditPanel
            draft={newDraft}
            onChange={setNewDraft}
            onSave={commitNew}
            onCancel={() => { setAdding(false); setRowErrors(p => ({ ...p, new: '' })); }}
            saving={createApp.isPending}
            error={rowErrors['new'] ?? ''}
            isNew
          />
        )}

        {apps.length === 0 && !adding && (
          <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">
            No apps yet.
          </div>
        )}
      </div>
    </div>
  );
}

function AppRow({ app, colTemplate, onEdit, onDelete }: {
  app: App; colTemplate: string; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, display: 'grid', gridTemplateColumns: colTemplate, gap: '0.5rem', alignItems: 'center' }}
      className="px-3 py-2 border-b border-[var(--color-border)] last:border-b-0 hover:bg-black/10 group"
    >
      <span {...attributes} {...listeners}
        className="cursor-grab text-[var(--color-text-secondary)] select-none text-center text-xs opacity-30 group-hover:opacity-100">
        ⠿
      </span>
      <div className="flex items-center justify-center">
        <AppIcon iconType={app.icon_type} iconValue={app.icon_value} name={app.name} size={20} />
      </div>
      <span className="font-medium text-xs truncate text-[var(--color-text-primary)]">{app.name}</span>
      <span className="text-[var(--color-text-secondary)] text-xs truncate">{app.url}</span>
      <span className="text-[var(--color-text-secondary)] text-xs truncate">{app.description}</span>
      <span className="text-center text-xs text-[var(--color-text-secondary)]">{app.is_public ? '✓' : '—'}</span>
      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">Edit</button>
        <button onClick={onDelete} className="text-xs text-[var(--color-danger)] hover:opacity-70">Del</button>
      </div>
    </div>
  );
}

function EditPanel({ draft, onChange, onSave, onCancel, saving, error, isNew }: {
  draft: RowDraft; onChange: (d: RowDraft) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; error: string; isNew?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const res = await api.upload.icon(file);
      onChange({ ...draft, icon_type: 'uploaded_file', icon_value: res.url });
    } catch { /* ignore */ } finally { setUploading(false); }
  }

  const iconPreview = draft.icon_value ? (
    draft.icon_type === 'uploaded_file'
      ? <img src={draft.icon_value.startsWith('/') ? draft.icon_value : `/uploads/${draft.icon_value}`} className="w-5 h-5 object-contain shrink-0" alt="" />
      : draft.icon_type === 'remote_url'
      ? <img src={draft.icon_value} className="w-5 h-5 object-contain shrink-0" alt="" />
      : <Icon icon={draft.icon_value} width={20} height={20} color="var(--color-text-primary)" className="shrink-0" />
  ) : (
    <div className="w-5 h-5 shrink-0 rounded bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)] text-[10px] font-bold">
      {draft.name[0]?.toUpperCase() || '?'}
    </div>
  );

  return (
    <div className={`border-b border-[var(--color-border)] last:border-b-0 px-3 py-2 bg-[var(--color-surface)] ${isNew ? 'border-t-2 border-t-[var(--color-accent)]' : 'border-t border-t-[var(--color-accent)]/40'}`}>
      <div className="flex items-center gap-2 min-w-0">
        {/* Icon preview */}
        {iconPreview}

        {/* Icon type selector */}
        <select
          value={draft.icon_type}
          onChange={e => onChange({ ...draft, icon_type: e.target.value as RowDraft['icon_type'], icon_value: '' })}
          className="inline-input shrink-0" style={{ width: '7.5rem' }}
        >
          <option value="iconify">Iconify</option>
          <option value="uploaded_file">SVG upload</option>
          <option value="remote_url">Image URL</option>
        </select>

        {/* Icon value */}
        {draft.icon_type === 'uploaded_file' ? (
          <>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="shrink-0 text-xs text-[var(--color-accent)] border border-[var(--color-accent)]/40 px-2 py-0.5 rounded hover:bg-[var(--color-accent)]/10 whitespace-nowrap">
              {uploading ? 'Uploading…' : draft.icon_value ? 'Change' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml,image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }} />
          </>
        ) : (
          <input
            className="inline-input shrink-0" style={{ width: '9rem' }}
            placeholder={draft.icon_type === 'iconify' ? 'mdi:home' : 'https://…'}
            value={draft.icon_value}
            onChange={e => onChange({ ...draft, icon_value: e.target.value })}
          />
        )}

        {/* Name — short */}
        <input
          className="inline-input min-w-0" style={{ flex: '1.2' }}
          placeholder="Name *"
          value={draft.name}
          onChange={e => onChange({ ...draft, name: e.target.value })}
          autoFocus={isNew}
        />

        {/* URL — long */}
        <input
          className="inline-input min-w-0" style={{ flex: '2.5' }}
          placeholder="URL *"
          value={draft.url}
          onChange={e => onChange({ ...draft, url: e.target.value })}
        />

        {/* Description — long */}
        <input
          className="inline-input min-w-0" style={{ flex: '2' }}
          placeholder="Description"
          value={draft.description}
          onChange={e => onChange({ ...draft, description: e.target.value })}
        />

        {/* Public */}
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] shrink-0 whitespace-nowrap">
          <input type="checkbox" checked={draft.is_public} onChange={e => onChange({ ...draft, is_public: e.target.checked })} />
          Public
        </label>

        {/* Actions */}
        <button onClick={onSave} disabled={saving}
          className="shrink-0 text-xs px-3 py-1 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors disabled:opacity-50">
          {saving ? '…' : isNew ? 'Add' : 'Save'}
        </button>
        <button onClick={onCancel} className="shrink-0 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">✕</button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)] mt-1">{error}</p>}
    </div>
  );
}
