import { useEffect, useRef } from 'react';

/* ── small reusable radio-style option button ── */
function Option({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
        active
          ? 'bg-white/[0.12] text-white ring-1 ring-white/[0.12]'
          : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
      }`}
    >
      {children}
    </button>
  );
}

/* ── section wrapper ── */
function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{title}</p>
      {children}
    </div>
  );
}

/* ── divider ── */
function Divider() {
  return <div className="h-px bg-white/[0.06]" />;
}

/* ── density preview ── */
function DensityPreview({ type }) {
  const rows = { compact: 5, small: 4, detailed: 3 }[type];
  const h    = { compact: 2, small: 3, detailed: 4  }[type];
  return (
    <span className="flex flex-col gap-[3px] w-5 h-4 justify-center">
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="w-full rounded-[1px] bg-current" style={{ height: h }} />
      ))}
    </span>
  );
}

/* ── col preview ── */
function ColPreview({ n }) {
  return (
    <span className="flex items-end gap-px w-5 h-4 justify-center">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="flex-1 rounded-[1.5px] bg-current" style={{ height: `${55 + (i % 2) * 30}%` }} />
      ))}
    </span>
  );
}

export default function SettingsPanel({
  open, onClose,
  /* layout */
  desktopView, setDesktopView,
  cols, setCols,
  density, setDensity,
  /* refresh */
  autoRefresh, setAutoRefresh,
  /* reading */
  unreadOnly, setUnreadOnly,
  /* data */
  feeds, onDeleteAllFeeds,
  categories, onDeleteAllCategories,
}) {
  const panelRef = useRef(null);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (!panelRef.current?.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  /* close on Escape */
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-72 flex flex-col bg-surface-1 border-l border-white/[0.07] shadow-2xl shadow-black/60 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <span className="text-sm font-semibold text-white/80">Settings</span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 scrollbar-none">

          {/* ── View ── */}
          <Section title="View">
            <div className="flex gap-1.5">
              <Option active={desktopView === 'grid'}  onClick={() => setDesktopView('grid')}>
                <span className="flex flex-col items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" clipRule="evenodd" />
                  </svg>
                  Cards
                </span>
              </Option>
              <Option active={desktopView === 'table'} onClick={() => setDesktopView('table')}>
                <span className="flex flex-col items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.25 2.25 0 0 1 1 14.74l-.01-9.5Zm8.26 9.52v-.001l.007 1.48h5.987a.75.75 0 0 0 .75-.75l-.006-1.73H9.25Zm-1.5-2.82H2.275l.004 1.57a.75.75 0 0 0 .75.75H7.75l.006-2.32Zm0-1.5.006-2.32H2.258l.003 2.32H7.756Zm1.494 0h5.744l-.006-2.32H9.244l.006 2.32Zm.006-3.82-.006-1.73a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.74l.004 1.74H9.256Zm1.494 0h5.744a.75.75 0 0 0-.75-.75H13.25l-.006 1.73.006 1.73.006-1.71Z" clipRule="evenodd" />
                  </svg>
                  Timeline
                </span>
              </Option>
            </div>
          </Section>

          <Divider />

          {/* ── Columns ── */}
          <Section title="Columns">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <Option key={n} active={cols === n} onClick={() => setCols(n)}>
                  <span className="flex flex-col items-center gap-1.5">
                    <ColPreview n={n} />
                    {n}
                  </span>
                </Option>
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── Density ── */}
          <Section title="Article density">
            <div className="flex gap-1.5">
              {[
                { val: 'compact',  label: 'Compact'  },
                { val: 'small',    label: 'Default'  },
                { val: 'detailed', label: 'Detailed' },
              ].map(({ val, label }) => (
                <Option key={val} active={density === val} onClick={() => setDensity(val)}>
                  <span className="flex flex-col items-center gap-1.5">
                    <DensityPreview type={val} />
                    {label}
                  </span>
                </Option>
              ))}
            </div>
          </Section>

          <Divider />

          {/* ── Auto-refresh ── */}
          <Section title="Auto-refresh">
            <div className="flex gap-1.5 flex-wrap">
              {[
                { val: 0,          label: 'Off'  },
                { val: 5 * 60000,  label: '5m'   },
                { val: 15 * 60000, label: '15m'  },
                { val: 30 * 60000, label: '30m'  },
                { val: 60 * 60000, label: '1h'   },
              ].map(({ val, label }) => (
                <Option key={val} active={autoRefresh === val} onClick={() => setAutoRefresh(val)}>
                  {label}
                </Option>
              ))}
            </div>
            {autoRefresh > 0 && (
              <p className="text-[11px] text-white/25 mt-1">Cards refresh silently in the background</p>
            )}
          </Section>

          <Divider />

          {/* ── Reading ── */}
          <Section title="Reading">
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-3 transition-colors ${
                unreadOnly ? 'bg-accent/10 ring-1 ring-accent/20' : 'bg-white/[0.03] hover:bg-white/[0.05]'
              }`}
            >
              <div className="text-left">
                <p className={`text-xs font-medium ${unreadOnly ? 'text-accent/90' : 'text-white/60'}`}>Unread only</p>
                <p className="text-[11px] text-white/25">Hide articles you've already read</p>
              </div>
              {/* Toggle pill */}
              <div className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${unreadOnly ? 'bg-accent' : 'bg-white/[0.12]'}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${unreadOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          </Section>

          <Divider />

          {/* ── Data ── */}
          <Section title="Data">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-3">
                <div>
                  <p className="text-xs font-medium text-white/60">Sources</p>
                  <p className="text-[11px] text-white/25">{feeds.length} saved</p>
                </div>
                <button
                  onClick={() => { if (window.confirm(`Remove all ${feeds.length} source${feeds.length !== 1 ? 's' : ''}?`)) onDeleteAllFeeds(); }}
                  disabled={feeds.length === 0}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-3">
                <div>
                  <p className="text-xs font-medium text-white/60">Categories</p>
                  <p className="text-[11px] text-white/25">{categories.length} saved</p>
                </div>
                <button
                  onClick={() => { if (window.confirm(`Delete all ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}?`)) onDeleteAllCategories(); }}
                  disabled={categories.length === 0}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          </Section>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/15 text-center">Pulse · preferences saved locally</p>
        </div>
      </div>
    </>
  );
}
