import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { relativeTime, fullDate } from '../lib/time.js';

/* ── Loading skeleton ── */
function PreviewSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-5 rounded-full bg-white/[0.07] w-3/4" />
      <div className="h-3 rounded-full bg-white/[0.04] w-1/3" />
      <div className="space-y-2 mt-6">
        {[90, 80, 95, 70, 85, 60].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full bg-white/[0.04]" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/* ── Render extracted content elements ── */
function ContentBlock({ elements }) {
  return (
    <div className="space-y-3 text-[13.5px] leading-relaxed text-white/65">
      {elements.map((el, i) => {
        switch (el.tag) {
          case 'h1': return <h1 key={i} className="text-base font-bold text-white/90 mt-4">{el.text}</h1>;
          case 'h2': return <h2 key={i} className="text-[14px] font-semibold text-white/85 mt-3">{el.text}</h2>;
          case 'h3': return <h3 key={i} className="text-[13px] font-semibold text-white/80 mt-2">{el.text}</h3>;
          case 'h4': return <h4 key={i} className="text-[12px] font-semibold text-white/75 mt-2">{el.text}</h4>;
          case 'blockquote': return (
            <blockquote key={i} className="border-l-2 border-accent/40 pl-3 text-white/45 italic">{el.text}</blockquote>
          );
          case 'li': return (
            <li key={i} className="ml-4 list-disc text-white/60">{el.text}</li>
          );
          case 'pre':
          case 'code': return (
            <pre key={i} className="rounded-lg bg-white/[0.04] px-3 py-2 text-[11.5px] font-mono text-white/50 overflow-x-auto whitespace-pre-wrap">{el.text}</pre>
          );
          default: return <p key={i}>{el.text}</p>;
        }
      })}
    </div>
  );
}

export default function ArticlePreviewPanel({ article, feedLabel, onClose }) {
  const panelRef = useRef(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const open = !!article;

  // Fetch article content when article changes
  useEffect(() => {
    if (!article?.link) { setContent(null); return; }
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setContent(null);
    api.getArticleContent(article.link)
      .then((data) => { if (!cancelled) { setContent(data); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setFetchError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [article?.link]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (!panelRef.current?.contains(e.target)) onClose();
    }
    // Small delay so the click that opened it doesn't also close it
    const id = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(id); document.removeEventListener('mousedown', handler); };
  }, [open, onClose]);

  const rel  = article ? relativeTime(article.pubDate) : null;
  const full = article ? fullDate(article.pubDate)     : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-2xl flex flex-col bg-surface-1 border-l border-white/[0.07] shadow-2xl shadow-black/60 transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
          <div className="min-w-0 flex-1">
            {feedLabel && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-accent/60 mb-0.5">{feedLabel}</p>
            )}
            <p className="text-sm font-semibold text-white/85 leading-snug line-clamp-2">
              {article?.title ?? ''}
            </p>
            {rel && (
              <p className="text-[11px] text-white/25 mt-1" title={full}>{rel}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Open in browser */}
            {article?.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                title="Open in browser"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                </svg>
              </a>
            )}
            {/* Close */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="Close (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {loading && <PreviewSkeleton />}

          {fetchError && (
            <div className="m-5 rounded-xl bg-red-500/10 p-4">
              <p className="text-xs font-semibold text-red-400 mb-1">Couldn't load article</p>
              <p className="text-[11px] text-red-400/70">{fetchError}</p>
              {article?.link && (
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[11px] text-accent hover:text-accent/80 transition-colors"
                >
                  Open in browser instead ↗
                </a>
              )}
            </div>
          )}

          {!loading && !fetchError && content && (
            <div className="px-6 py-5">
              {/* Hero image */}
              {content.heroImage && (
                <img
                  src={content.heroImage}
                  alt=""
                  className="w-full rounded-xl object-cover mb-5 max-h-56 opacity-80"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}

              {/* Article title from content (if different / more complete) */}
              {content.title && content.title !== article?.title && (
                <h1 className="text-base font-bold text-white/90 mb-4 leading-snug">{content.title}</h1>
              )}

              {/* Body */}
              {content.elements?.length > 0
                ? <ContentBlock elements={content.elements} />
                : (
                  <div className="text-center py-10">
                    <p className="text-sm text-white/30 mb-3">No readable content found</p>
                    <a
                      href={article?.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:text-accent/80"
                    >
                      Open in browser ↗
                    </a>
                  </div>
                )
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
}
