import { useState, useRef } from 'react';
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, useReorderGroups } from '../../api/hooks.js';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Group } from '@flame-claude/shared';

export default function GroupsSettings() {
  const { data: groups = [] } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const reorderGroups = useReorderGroups();

  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await createGroup.mutateAsync({ name: newName.trim() });
    setNewName('');
  };

  const handleSave = async (id: number) => {
    if (!editName.trim()) return;
    await updateGroup.mutateAsync({ id, body: { name: editName.trim() } });
    setEditId(null);
  };

  const handleDragEnd = (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    const reordered = arrayMove(groups, oldIndex, newIndex);
    reorderGroups.mutate(reordered.map((g) => g.id));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">Groups</h2>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Groups organize bookmark categories. Assign categories to groups in the Bookmarks manager, then select which groups appear on each page.
      </p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                isEditing={editId === group.id}
                editName={editName}
                onEdit={() => { setEditId(group.id); setEditName(group.name); }}
                onEditName={setEditName}
                onSave={() => handleSave(group.id)}
                onCancel={() => setEditId(null)}
                onDelete={() => deleteGroup.mutate(group.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new */}
      <div className="flex items-center gap-2 pt-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="New group name…"
          className="inline-input text-sm flex-1"
        />
        <button onClick={handleAdd} disabled={!newName.trim()} className="flame-btn disabled:opacity-40">
          Add Group
        </button>
      </div>
    </div>
  );
}

function GroupRow({ group, isEditing, editName, onEdit, onEditName, onSave, onCancel, onDelete }: {
  group: Group;
  isEditing: boolean;
  editName: string;
  onEdit: () => void;
  onEditName: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 py-2 px-1 group ${isDragging ? 'opacity-50' : ''}`}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 text-lg select-none">⠿</span>
      {isEditing ? (
        <>
          <input
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            className="inline-input text-sm flex-1"
            autoFocus
          />
          <button onClick={onSave} className="text-xs text-[var(--color-accent)] hover:underline">Save</button>
          <button onClick={onCancel} className="text-xs text-[var(--color-text-secondary)] hover:underline">Cancel</button>
        </>
      ) : (
        <>
          <span className="text-sm text-[var(--color-text-primary)] flex-1">{group.name}</span>
          <button onClick={onEdit} className="text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-accent)]">Edit</button>
          <button onClick={onDelete} className="text-xs text-[var(--color-danger)] opacity-0 group-hover:opacity-100">Delete</button>
        </>
      )}
    </div>
  );
}
