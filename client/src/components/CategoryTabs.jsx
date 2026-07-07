import { useState, useRef, useEffect } from 'react';

export default function CategoryTabs({ categories, activeId, onSelect, onAdd, onRename, onDelete }) {
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

  const tabs = [{ id: 'all', name: 'All' }, ...categories];

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        const isEditing = editingId === tab.id;

        return (
          <div key={tab.id} className="relative shrink-0">
            {isEditing ? (
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
            ) : (
              <button
                onClick={() => onSelect(tab.id)}
                onDoubleClick={(e) => tab.id !== 'all' && startEdit(tab, e)}
                className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-px bg-accent rounded-full" />
                )}
                {tab.name}
                {tab.id !== 'all' && (
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
            )}
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
