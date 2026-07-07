import { useEffect, useRef } from 'react';
import { relativeTime, fullDate } from '../lib/time.js';

export default function StarredPanel({ open, onClose, starred, onToggleStar }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (!panelRef.current?.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />

      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-80 flex flex-col bg-surface-1 border-l border-white/[0.07] shadow-2xl shadow-black/60 transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-400/70">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
            </svg>
            <span className="text-sm font-semibold text-white/80">Bookmarks</span>
            {starred.length > 0 && (
              <span className="rounded-full bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/40 tabular-nums">{starred.length}</span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {starred.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 px-6 text-center">
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-white/15">
                  <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15a1.5 1.5 0 0 0 2.374 1.218l3.126-2.5 3.126 2.5A1.5 1.5 0 0 0 15 15V4.11a1.5 1.5 0 0 0-2.3-1.269l-3.126 2.5-3.274-2.5Z" />
                </svg>
              </div>
              <p className="text-sm text-white/30">No bookmarks yet</p>
              <p className="text-xs text-white/18 max-w-[200px]">Click the bookmark icon on any article to save it here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {starred.map((item) => {
                const rel = relativeTime(item.pubDate);
                const full = fullDate(item.pubDate);
                return (
                  <div key={`${item.feedId}-${item.id}`} className="group flex gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover opacity-80 mt-0.5"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-white/35 mb-1">{item.feedLabel}</p>
                      <a href={item.link} target="_blank" rel="noopener noreferrer"
                        className="block text-[13px] font-medium text-white/75 hover:text-white transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </a>
                      {rel && <p className="mt-1 text-[11px] text-white/22" title={full}>{rel}</p>}
                    </div>
                    <button
                      onClick={() => onToggleStar(item)}
                      className="shrink-0 rounded p-1 text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors mt-0.5"
                      title="Remove bookmark"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.75.75 0 0 1 3 14.25V2.75Z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
