import { useState, useRef, useEffect } from 'react';

export default function CategoryTabs({ categories, activeId, onSelect, onAdd, onRename, onDelete, catDropId, setCatDropId, isDragging, onAssignFeed }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const addInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => { if (adding) addInputRef.current?.focus(); }, [adding]);
  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);

  function submitAdd(e) {
    e?.preventDefault();
    if (newName.trim()) {
      const cat = onAdd(newName.trim());
      onSelect(cat.id);
    }
    setAdding(false);
    setNewName('');
  }

  function submitRename(e) {
    e?.preventDefault();
    if (editName.trim()) onRename(editingId, editName.trim());
    setEditingId(null);
  }

  function startEdit(cat, e) {
    e.stopPropagation();
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  // "All" tab + user categories + Discover
  const tabs = [
    { id: 'all', name: 'All', droppable: true },
    ...categories.map((c) => ({ ...c, droppable: true })),
    { id: 'discover', name: 'Discover', special: true, droppable: false },
  ];

  const anyDragging = isDragging;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const isEditing = editingId === tab.id;

        if (isEditing) {
          return (
            <div key={tab.id} className="relative shrink-0">
              <form onSubmit={submitRename}>
                <input
                  ref={editInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                  className="rounded-lg border border-accent bg-surface-2 px-3 py-1.5 text-xs font-medium text-white outline-none w-28"
                />
              </form>
            </div>
          );
        }

        if (!tab.droppable) {
          // Discover tab — no drop zone
          return (
            <div key={tab.id} className="relative shrink-0">
              <button
                onClick={() => onSelect(tab.id)}
                className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'text-indigo-400/60 hover:text-indigo-300 hover:bg-indigo-500/10'
                }`}
              >
                {isActive && <span className="absolute bottom-0 left-3 right-3 h-px rounded-full bg-indigo-400" />}
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0">
                  <path d="M7.657 1.05a.4.4 0 0 1 .686 0l1.263 2.19 2.19 1.263a.4.4 0 0 1 0 .686l-2.19 1.263-1.263 2.19a.4.4 0 0 1-.686 0L6.394 6.452 4.204 5.189a.4.4 0 0 1 0-.686l2.19-1.263L7.657 1.05ZM2.5 9.5a.3.3 0 0 1 .514 0l.786 1.36 1.36.787a.3.3 0 0 1 0 .514l-1.36.786L3.014 14.3a.3.3 0 0 1-.514 0l-.786-1.353L.354 12.16a.3.3 0 0 1 0-.514l1.36-.787L2.5 9.5Z" />
                </svg>
                {tab.name}
              </button>
            </div>
          );
        }

        const isDragTarget = catDropId === tab.id;
        return (
          <div key={tab.id} className="relative shrink-0">
            <button
              onClick={() => onSelect(tab.id)}
              onDoubleClick={(e) => tab.id !== 'all' && startEdit(tab, e)}
              onDragOver={(e) => { e.preventDefault(); setCatDropId?.(tab.id); }}
              onDragLeave={() => setCatDropId?.(null)}
              onDrop={(e) => {
                e.preventDefault();
                const feedId = e.dataTransfer.getData('feedId');
                if (feedId) onAssignFeed?.(feedId, tab.id);
                setCatDropId?.(null);
              }}
              className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isDragTarget
                  ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/50'
                  : isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}
            >
              {isActive && !isDragTarget && (
                <span className="absolute bottom-0 left-3 right-3 h-px rounded-full bg-accent" />
              )}
              {tab.name}
              {tab.id !== 'all' && !anyDragging && (
                <span
                  onClick={(e) => { e.stopPropagation(); if (activeId === tab.id) onSelect('all'); onDelete(tab.id); }}
                  className="hidden group-hover:flex items-center justify-center rounded-full w-3.5 h-3.5 text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
                    <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L6 4.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L7.06 6l1.72 1.72a.75.75 0 1 1-1.06 1.06L6 7.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L4.94 6 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        );
      })}

      {adding ? (
        <form onSubmit={submitAdd} className="shrink-0">
          <input
            ref={addInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitAdd}
            onKeyDown={(e) => e.key === 'Escape' && (setAdding(false), setNewName(''))}
            placeholder="Name…"
            className="rounded-lg border border-accent bg-surface-2 px-3 py-1.5 text-xs text-white outline-none w-28 placeholder-white/25"
          />
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
            <path d="M6.75 2.75a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" />
          </svg>
          New
        </button>
      )}
    </div>
  );
}
