import { useState, useRef, useEffect } from 'react';

export default function AssignMenu({ categories, currentCategoryId, onAssign, onUnassign }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title="Move to category"
        className={`rounded-lg p-1.5 transition-colors ${open ? 'text-accent bg-accent-muted' : 'text-white/30 hover:text-white/70 hover:bg-white/5'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm0 3.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-surface-2 border border-white/[0.08] py-1.5 shadow-2xl shadow-black/50 animate-fadeIn">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-white/25">Move to</p>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={(e) => { e.stopPropagation(); onAssign(cat.id); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-white/5 ${
                currentCategoryId === cat.id ? 'text-accent font-semibold' : 'text-white/60'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${currentCategoryId === cat.id ? 'bg-accent' : 'bg-white/15'}`} />
              {cat.name}
            </button>
          ))}
          {currentCategoryId && (
            <>
              <div className="my-1 border-t border-white/[0.06]" />
              <button
                onClick={(e) => { e.stopPropagation(); onUnassign(); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/30 hover:text-white/50 hover:bg-white/5 transition-colors"
              >
                <span className="h-1.5 w-1.5 shrink-0" />
                Remove from category
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
