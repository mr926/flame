import { useState, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icon } from '@iconify/react';
import type { Category, Bookmark, Group } from '@flame-claude/shared';
import {
  useCategories, useBookmarks,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useCreateBookmark, useUpdateBookmark, useDeleteBookmark,
  useReorderCategories, useReorderBookmarks,
  useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useReorderGroups,
} from '../api/hooks.js';
import { api } from '../api/client.js';
import { Spinner } from '../components/ui/Primitives.js';

interface CatDraft { name: string; is_public: boolean; is_pinned: boolean; group_id: number | null }
interface BmDraft {
  name: string; url: string; is_public: boolean;
  icon_type: 'iconify' | 'uploaded_file' | 'remote_url'; icon_value: string;
}

const emptyCat = (): CatDraft => ({ name: '', is_public: true, is_pinned: true, group_id: null });
const emptyBm = (): BmDraft => ({ name: '', url: '', is_public: true, icon_type: 'iconify', icon_value: '' });

const bmDraftFromBookmark = (bm: Bookmark): BmDraft => ({
  name: bm.name, url: bm.url, is_public: bm.is_public,
  icon_type: bm.icon_type === 'mdi' ? 'iconify' : bm.icon_type as BmDraft['icon_type'],
  icon_value: bm.icon_value ?? '',
});

const bmDraftToPayload = (d: BmDraft, categoryId: number) => ({
  category_id: categoryId, name: d.name, url: d.url, is_public: d.is_public,
  icon_type: d.icon_type === 'iconify' ? 'mdi' as const : d.icon_type,
  icon_value: d.icon_value || undefined,
});

// Drag item IDs are prefixed to distinguish groups from categories
const groupDndId = (id: number) => `g:${id}`;
const catDndId = (id: number) => `c:${id}`;
const parseGroupId = (dndId: unknown): number | null => {
  if (typeof dndId !== 'string' || !dndId.startsWith('g:')) return null;
  return parseInt(dndId.slice(2));
};
const parseCatId = (dndId: unknown): number | null => {
  if (typeof dndId !== 'string' || !dndId.startsWith('c:')) return null;
  return parseInt(dndId.slice(2));
};

export default function BookmarksPage() {
  const { data: categories = [], isLoading } = useCategories();
  const { data: groups = [] } = useGroups();

  // Local ordering state
  const [localGroups, setLocalGroups] = useState<Group[] | null>(null);
  const [localCats, setLocalCats] = useState<Category[] | null>(null);
  const displayGroups = localGroups ?? groups;
  const displayCats = localCats ?? categories;

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overGroupId, setOverGroupId] = useState<number | null>(null);

  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatDraft, setEditCatDraft] = useState<CatDraft>(emptyCat());
  const [addingCatGroupId, setAddingCatGroupId] = useState<number | 'ungrouped' | null>(null);
  const [newCat, setNewCat] = useState<CatDraft>(emptyCat());
  const [catErrors, setCatErrors] = useState<Record<string | number, string>>({});

  // Group inline edit/create
  const [editGroupId, setEditGroupId] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const reorderCats = useReorderCategories();

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const reorderGroups = useReorderGroups();

  const { data: allBookmarks = [] } = useBookmarks();
  const [localBms, setLocalBms] = useState<Bookmark[] | null>(null);
  const serverBms = allBookmarks.filter(b => b.category_id === selectedCat);
  const bms = localBms ?? serverBms;

  const [editBmId, setEditBmId] = useState<number | null>(null);
  const [editBmDraft, setEditBmDraft] = useState<BmDraft>(emptyBm());
  const [addingBm, setAddingBm] = useState(false);
  const [newBm, setNewBm] = useState<BmDraft>(emptyBm());
  const [bmErrors, setBmErrors] = useState<Record<string | number, string>>({});

  const createBm = useCreateBookmark();
  const updateBm = useUpdateBookmark();
  const deleteBm = useDeleteBookmark();
  const reorderBms = useReorderBookmarks();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const bmSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Build sorted item list for DnD: interleaved group headers + categories
  // Each group header and each category gets a unique prefixed id
  const buildDndItems = () => {
    const items: string[] = [];
    // Ungrouped categories first
    displayCats.filter(c => !c.group_id).forEach(c => items.push(catDndId(c.id)));
    // Then each group header followed by its categories
    displayGroups.forEach(g => {
      items.push(groupDndId(g.id));
      displayCats.filter(c => c.group_id === g.id).forEach(c => items.push(catDndId(c.id)));
    });
    return items;
  };
  const dndItems = buildDndItems();

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragOver(e: DragOverEvent) {
    const { over } = e;
    if (!over) { setOverGroupId(null); return; }
    const overId = over.id as string;
    const gid = parseGroupId(overId);
    if (gid !== null) { setOverGroupId(gid); return; }
    // over a category — find which group it belongs to
    const cid = parseCatId(overId);
    if (cid !== null) {
      const cat = displayCats.find(c => c.id === cid);
      setOverGroupId(cat?.group_id ?? null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setOverGroupId(null);
    if (!over || active.id === over.id) return;

    const activeGid = parseGroupId(active.id);
    const activeCid = parseCatId(active.id);

    if (activeGid !== null) {
      // Reordering a group header
      const overGid = parseGroupId(over.id);
      if (overGid === null) return; // can only drop group on group
      const base = localGroups ?? groups;
      const reordered = arrayMove(base, base.findIndex(g => g.id === activeGid), base.findIndex(g => g.id === overGid));
      setLocalGroups(reordered);
      reorderGroups.mutate(reordered.map(g => g.id));
      return;
    }

    if (activeCid !== null) {
      const overGid = parseGroupId(over.id);
      const overCid = parseCatId(over.id);

      // Determine target group
      let targetGroupId: number | null = null;
      if (overGid !== null) {
        targetGroupId = overGid;
      } else if (overCid !== null) {
        const overCat = displayCats.find(c => c.id === overCid);
        targetGroupId = overCat?.group_id ?? null;
      }

      const activeCat = displayCats.find(c => c.id === activeCid);
      if (!activeCat) return;

      // If group changed, update category's group_id
      if (activeCat.group_id !== targetGroupId) {
        const updated = displayCats.map(c => c.id === activeCid ? { ...c, group_id: targetGroupId } : c);
        setLocalCats(updated);
        updateCat.mutate({ id: activeCid, body: { ...activeCat, group_id: targetGroupId } });
        return;
      }

      // Same group — reorder within group
      if (overCid !== null) {
        const base = localCats ?? categories;
        const reordered = arrayMove(base, base.findIndex(c => c.id === activeCid), base.findIndex(c => c.id === overCid));
        setLocalCats(reordered);
        reorderCats.mutate(reordered.map(c => c.id));
      }
    }
  }

  function handleBmDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !selectedCat) return;
    const base = localBms ?? serverBms;
    const reordered = arrayMove(base, base.findIndex(b => b.id === active.id), base.findIndex(b => b.id === over.id));
    setLocalBms(reordered);
    reorderBms.mutate({ categoryId: selectedCat, ids: reordered.map(b => b.id) });
  }

  async function commitNewCat() {
    if (!newCat.name.trim()) { setCatErrors(p => ({ ...p, new: 'Name required' })); return; }
    setCatErrors(p => ({ ...p, new: '' }));
    try {
      const c = await createCat.mutateAsync(newCat);
      setAddingCatGroupId(null); setNewCat(emptyCat()); setLocalCats(null); setSelectedCat(c.id);
    } catch (e) { setCatErrors(p => ({ ...p, new: e instanceof Error ? e.message : 'Failed' })); }
  }

  async function commitEditCat(cat: Category) {
    if (!editCatDraft.name.trim()) { setCatErrors(p => ({ ...p, [cat.id]: 'Name required' })); return; }
    setCatErrors(p => ({ ...p, [cat.id]: '' }));
    try {
      await updateCat.mutateAsync({ id: cat.id, body: editCatDraft });
      setEditCatId(null); setLocalCats(null);
    } catch (e) { setCatErrors(p => ({ ...p, [cat.id]: e instanceof Error ? e.message : 'Failed' })); }
  }

  async function commitNewGroup() {
    if (!newGroupName.trim()) return;
    await createGroup.mutateAsync({ name: newGroupName.trim() });
    setAddingGroup(false); setNewGroupName(''); setLocalGroups(null);
  }

  async function commitEditGroup(id: number) {
    if (!editGroupName.trim()) return;
    await updateGroup.mutateAsync({ id, body: { name: editGroupName.trim() } });
    setEditGroupId(null); setLocalGroups(null);
  }

  async function commitNewBm() {
    if (!newBm.name.trim() || !newBm.url.trim()) { setBmErrors(p => ({ ...p, new: 'Name and URL required' })); return; }
    setBmErrors(p => ({ ...p, new: '' }));
    try {
      await createBm.mutateAsync(bmDraftToPayload(newBm, selectedCat!));
      setAddingBm(false); setNewBm(emptyBm()); setLocalBms(null);
    } catch (e) { setBmErrors(p => ({ ...p, new: e instanceof Error ? e.message : 'Failed' })); }
  }

  async function commitEditBm(bm: Bookmark) {
    if (!editBmDraft.name.trim() || !editBmDraft.url.trim()) { setBmErrors(p => ({ ...p, [bm.id]: 'Name and URL required' })); return; }
    setBmErrors(p => ({ ...p, [bm.id]: '' }));
    try {
      await updateBm.mutateAsync({ id: bm.id, body: bmDraftToPayload(editBmDraft, bm.category_id) });
      setEditBmId(null); setLocalBms(null);
    } catch (e) { setBmErrors(p => ({ ...p, [bm.id]: e instanceof Error ? e.message : 'Failed' })); }
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const bmCols = '1.2rem 1.8rem 1.8fr 2fr 3.5rem 5rem';

  const ungroupedCats = displayCats.filter(c => !c.group_id);

  // Active drag item label for overlay
  const activeCatId = activeId ? parseCatId(activeId) : null;
  const activeGroupId = activeId ? parseGroupId(activeId) : null;
  const activeCat = activeCatId ? displayCats.find(c => c.id === activeCatId) : null;
  const activeGroup = activeGroupId ? displayGroups.find(g => g.id === activeGroupId) : null;

  return (
    <div className="flex gap-6">
      {/* Categories sidebar */}
      <div className="w-48 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">Categories</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setAddingGroup(true); setNewGroupName(''); }}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] leading-none"
              title="New group"
            >Group+</button>
            <button
              onClick={() => { setAddingCatGroupId('ungrouped'); setNewCat(emptyCat()); }}
              className="text-sm text-[var(--color-accent)] hover:opacity-70 leading-none"
              title="New category"
            >+</button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <SortableContext items={dndItems} strategy={verticalListSortingStrategy}>

            {/* Ungrouped categories */}
            {ungroupedCats.map(cat =>
              editCatId === cat.id ? (
                <CatEditRow key={cat.id} draft={editCatDraft} onChange={setEditCatDraft}
                  onSave={() => commitEditCat(cat)} onCancel={() => setEditCatId(null)}
                  saving={updateCat.isPending} error={catErrors[cat.id] ?? ''} />
              ) : (
                <CatRow key={cat.id} dndId={catDndId(cat.id)} cat={cat} selected={selectedCat === cat.id}
                  onSelect={() => { setSelectedCat(cat.id); setLocalBms(null); setEditBmId(null); setAddingBm(false); }}
                  onEdit={() => { setEditCatId(cat.id); setEditCatDraft({ name: cat.name, is_public: cat.is_public, is_pinned: cat.is_pinned, group_id: cat.group_id ?? null }); }}
                  onDelete={async () => { await deleteCat.mutateAsync(cat.id); if (selectedCat === cat.id) setSelectedCat(null); setLocalCats(null); }} />
              )
            )}

            {addingCatGroupId === 'ungrouped' && (
              <CatAddRow key="new-ungrouped" draft={newCat} onChange={setNewCat}
                onSave={commitNewCat} onCancel={() => setAddingCatGroupId(null)}
                saving={createCat.isPending} error={catErrors['new'] ?? ''} />
            )}

            {/* Groups with their categories */}
            {displayGroups.map(group => (
              <div key={group.id}>
                {/* Group header row */}
                {editGroupId === group.id ? (
                  <div className="flex items-center gap-1 py-1 mb-px">
                    <input
                      value={editGroupName}
                      onChange={e => setEditGroupName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitEditGroup(group.id); if (e.key === 'Escape') setEditGroupId(null); }}
                      className="inline-input text-xs flex-1"
                      autoFocus
                    />
                    <button onClick={() => commitEditGroup(group.id)} className="text-xs text-[var(--color-accent)]">✓</button>
                    <button onClick={() => setEditGroupId(null)} className="text-xs text-[var(--color-text-secondary)]">✕</button>
                  </div>
                ) : (
                  <GroupHeader
                    dndId={groupDndId(group.id)}
                    group={group}
                    isOver={overGroupId === group.id && activeId !== null && parseCatId(activeId ?? '') !== null}
                    onEdit={() => { setEditGroupId(group.id); setEditGroupName(group.name); }}
                    onDelete={async () => { await deleteGroup.mutateAsync(group.id); setLocalGroups(null); setLocalCats(null); }}
                    onAddCat={() => { setAddingCatGroupId(group.id); setNewCat({ ...emptyCat(), group_id: group.id }); }}
                  />
                )}

                {/* Categories in this group */}
                {displayCats.filter(c => c.group_id === group.id).map(cat =>
                  editCatId === cat.id ? (
                    <CatEditRow key={cat.id} draft={editCatDraft} onChange={setEditCatDraft}
                      onSave={() => commitEditCat(cat)} onCancel={() => setEditCatId(null)}
                      saving={updateCat.isPending} error={catErrors[cat.id] ?? ''} />
                  ) : (
                    <CatRow key={cat.id} dndId={catDndId(cat.id)} cat={cat} selected={selectedCat === cat.id} indent
                      onSelect={() => { setSelectedCat(cat.id); setLocalBms(null); setEditBmId(null); setAddingBm(false); }}
                      onEdit={() => { setEditCatId(cat.id); setEditCatDraft({ name: cat.name, is_public: cat.is_public, is_pinned: cat.is_pinned, group_id: cat.group_id ?? null }); }}
                      onDelete={async () => { await deleteCat.mutateAsync(cat.id); if (selectedCat === cat.id) setSelectedCat(null); setLocalCats(null); }} />
                  )
                )}

                {addingCatGroupId === group.id && (
                  <CatAddRow key={`new-${group.id}`} draft={newCat} onChange={setNewCat} indent
                    onSave={commitNewCat} onCancel={() => setAddingCatGroupId(null)}
                    saving={createCat.isPending} error={catErrors['new'] ?? ''} />
                )}
              </div>
            ))}
          </SortableContext>

          <DragOverlay>
            {activeCat && (
              <div className="text-xs px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-accent)]/50 text-[var(--color-text-primary)] shadow-lg">
                {activeCat.name}
              </div>
            )}
            {activeGroup && (
              <div className="text-xs font-bold px-2 py-1 rounded bg-[var(--color-surface)] border border-[var(--color-accent)]/50 text-[var(--color-accent)] shadow-lg uppercase tracking-wide">
                {activeGroup.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {addingGroup && (
          <div className="flex items-center gap-1 mt-2">
            <input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitNewGroup(); if (e.key === 'Escape') { setAddingGroup(false); } }}
              placeholder="Group name…"
              className="inline-input text-xs flex-1"
              autoFocus
            />
            <button onClick={commitNewGroup} disabled={!newGroupName.trim()} className="text-xs text-[var(--color-accent)] disabled:opacity-40">✓</button>
            <button onClick={() => setAddingGroup(false)} className="text-xs text-[var(--color-text-secondary)]">✕</button>
          </div>
        )}

        {displayCats.length === 0 && displayGroups.length === 0 && !addingGroup && (
          <p className="text-xs text-[var(--color-text-secondary)]">No categories</p>
        )}
      </div>

      {/* Bookmarks panel */}
      <div className="flex-1 min-w-0">
        {selectedCat ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">
                {displayCats.find(c => c.id === selectedCat)?.name}
              </h2>
              {!addingBm && (
                <button onClick={() => { setAddingBm(true); setNewBm(emptyBm()); }} className="flame-btn">+ Bookmark</button>
              )}
            </div>

            <div className="border border-[var(--color-border)] rounded-[var(--radius-card)] overflow-hidden">
              <div
                className="px-3 py-2 text-xs uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)] bg-[var(--color-surface)]"
                style={{ display: 'grid', gridTemplateColumns: bmCols, gap: '0.5rem', alignItems: 'center' }}
              >
                <span /><span>Icon</span><span>Name</span><span>URL</span>
                <span className="text-center">Public</span><span />
              </div>

              <DndContext sensors={bmSensors} collisionDetection={closestCenter} onDragEnd={handleBmDragEnd}>
                <SortableContext items={bms.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {bms.map(bm =>
                    editBmId === bm.id ? (
                      <BmEditPanel key={bm.id} draft={editBmDraft} onChange={setEditBmDraft}
                        onSave={() => commitEditBm(bm)} onCancel={() => setEditBmId(null)}
                        saving={updateBm.isPending} error={bmErrors[bm.id] ?? ''} />
                    ) : (
                      <BmRow key={bm.id} bm={bm} bmCols={bmCols}
                        onEdit={() => { setEditBmId(bm.id); setEditBmDraft(bmDraftFromBookmark(bm)); }}
                        onDelete={async () => { await deleteBm.mutateAsync(bm.id); setLocalBms(null); }} />
                    )
                  )}
                </SortableContext>
              </DndContext>

              {addingBm && (
                <BmEditPanel draft={newBm} onChange={setNewBm} onSave={commitNewBm}
                  onCancel={() => setAddingBm(false)} saving={createBm.isPending}
                  error={bmErrors['new'] ?? ''} isNew />
              )}

              {bms.length === 0 && !addingBm && (
                <p className="text-center text-sm text-[var(--color-text-secondary)] py-8">
                  No bookmarks. Click "+ Bookmark" to add one.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--color-text-secondary)]">
            Select a category
          </div>
        )}
      </div>
    </div>
  );
}

function GroupHeader({ dndId, group, isOver, onEdit, onDelete, onAddCat }: {
  dndId: string; group: Group; isOver: boolean;
  onEdit: () => void; onDelete: () => void; onAddCat: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-1 mt-3 mb-0.5 px-1 group/gh rounded ${isOver ? 'bg-[var(--color-accent)]/10' : ''}`}
    >
      <span {...attributes} {...listeners}
        className="cursor-grab text-[10px] text-[var(--color-text-secondary)] opacity-0 group-hover/gh:opacity-60 select-none shrink-0">⠿</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] flex-1 truncate">
        {group.name}
      </span>
      <div className="flex gap-1 opacity-0 group-hover/gh:opacity-100 transition-opacity shrink-0">
        <button onClick={onAddCat} className="text-[10px] text-[var(--color-accent)] hover:opacity-70" title="Add category">+Cat</button>
        <button onClick={onEdit} className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">✎</button>
        <button onClick={onDelete} className="text-[10px] text-[var(--color-danger)] hover:opacity-70">×</button>
      </div>
    </div>
  );
}

function CatRow({ dndId, cat, selected, onSelect, onEdit, onDelete, indent }: {
  dndId: string; cat: Category; selected: boolean; indent?: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onClick={onSelect}
      className={`flex items-center gap-1 px-1.5 py-1.5 rounded cursor-pointer text-xs transition-colors mb-px group ${indent ? 'pl-4' : ''} ${
        selected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
      }`}
    >
      <span {...attributes} {...listeners} onClick={e => e.stopPropagation()}
        className="cursor-grab text-[10px] text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-60 select-none shrink-0">⠿</span>
      <span className="flex-1 truncate font-medium">{cat.name}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="hover:text-[var(--color-accent)]">✎</button>
        <button onClick={onDelete} className="text-[var(--color-danger)] hover:opacity-70">×</button>
      </div>
    </div>
  );
}

function CatEditRow({ draft, onChange, onSave, onCancel, saving, error, indent }: {
  draft: CatDraft; onChange: (d: CatDraft) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; error: string; indent?: boolean;
}) {
  return (
    <div className={`mb-1 space-y-1 ${indent ? 'pl-4' : ''}`}>
      <input className="inline-input w-full" placeholder="Name" value={draft.name}
        onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
      <div className="flex gap-1">
        <button onClick={onSave} disabled={saving}
          className="text-xs px-2 py-0.5 border border-[var(--color-accent)] text-[var(--color-accent)] rounded hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)]">
          {saving ? '…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-xs text-[var(--color-text-secondary)] px-1">✕</button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function CatAddRow({ draft, onChange, onSave, onCancel, saving, error, indent }: {
  draft: CatDraft; onChange: (d: CatDraft) => void;
  onSave: () => void; onCancel: () => void; saving: boolean; error: string; indent?: boolean;
}) {
  return (
    <div className={`mt-1 space-y-1 ${indent ? 'pl-4' : ''}`}>
      <input className="inline-input w-full" placeholder="Category name" value={draft.name}
        onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }} />
      <div className="flex gap-1">
        <button onClick={onSave} disabled={saving || !draft.name.trim()}
          className="text-xs px-2 py-0.5 border border-[var(--color-accent)] text-[var(--color-accent)] rounded hover:bg-[var(--color-accent)] hover:text-[var(--color-bg)] transition-colors disabled:opacity-40">
          {saving ? '…' : 'Add'}
        </button>
        <button onClick={onCancel} className="text-xs text-[var(--color-text-secondary)] px-1">✕</button>
      </div>
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  );
}

function BmRow({ bm, bmCols, onEdit, onDelete }: {
  bm: Bookmark; bmCols: string; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bm.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, display: 'grid', gridTemplateColumns: bmCols, gap: '0.5rem', alignItems: 'center' }}
      className="px-3 py-2 border-b border-[var(--color-border)] last:border-b-0 hover:bg-black/10 group"
    >
      <span {...attributes} {...listeners}
        className="cursor-grab text-[var(--color-text-secondary)] select-none text-xs opacity-0 group-hover:opacity-60">⠿</span>
      <div className="flex items-center justify-center">
        <BmIcon iconType={bm.icon_type} iconValue={bm.icon_value} name={bm.name} />
      </div>
      <span className="text-xs font-medium truncate text-[var(--color-text-primary)]">{bm.name}</span>
      <span className="text-xs truncate text-[var(--color-text-secondary)]">{bm.url}</span>
      <span className="text-center text-xs text-[var(--color-text-secondary)]">{bm.is_public ? '✓' : '—'}</span>
      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]">Edit</button>
        <button onClick={onDelete} className="text-xs text-[var(--color-danger)] hover:opacity-70">Del</button>
      </div>
    </div>
  );
}

function BmEditPanel({ draft, onChange, onSave, onCancel, saving, error, isNew }: {
  draft: BmDraft; onChange: (d: BmDraft) => void;
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
        {iconPreview}
        <select value={draft.icon_type}
          onChange={e => onChange({ ...draft, icon_type: e.target.value as BmDraft['icon_type'], icon_value: '' })}
          className="inline-input shrink-0" style={{ width: '7.5rem' }}>
          <option value="iconify">Iconify</option>
          <option value="uploaded_file">SVG upload</option>
          <option value="remote_url">Image URL</option>
        </select>
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
          <input className="inline-input shrink-0" style={{ width: '9rem' }}
            placeholder={draft.icon_type === 'iconify' ? 'mdi:bookmark' : 'https://…'}
            value={draft.icon_value} onChange={e => onChange({ ...draft, icon_value: e.target.value })} />
        )}
        <input className="inline-input min-w-0" style={{ flex: '1.2' }} placeholder="Name *"
          value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus={isNew} />
        <input className="inline-input min-w-0" style={{ flex: '2.5' }} placeholder="URL *"
          value={draft.url} onChange={e => onChange({ ...draft, url: e.target.value })} />
        <label className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] shrink-0 whitespace-nowrap">
          <input type="checkbox" checked={draft.is_public} onChange={e => onChange({ ...draft, is_public: e.target.checked })} />
          Public
        </label>
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

function BmIcon({ iconType, iconValue, name }: { iconType: string; iconValue: string | null; name: string }) {
  if (!iconValue) return null;
  if (iconType === 'uploaded_file')
    return <img src={iconValue.startsWith('/') ? iconValue : `/uploads/${iconValue}`} className="w-4 h-4 object-contain" alt="" />;
  if (iconType === 'remote_url')
    return <img src={iconValue} className="w-4 h-4 object-contain" alt="" />;
  return <Icon icon={iconValue} width={16} height={16} color="var(--color-text-secondary)" />;
}
