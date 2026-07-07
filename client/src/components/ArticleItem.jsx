import { relativeTime, fullDate } from '../lib/time.js';

function StarBtn({ item, onToggle, isStarred }) {
  if (!onToggle) return null;
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(item); }}
      className={`shrink-0 rounded p-0.5 transition-colors ${isStarred ? 'text-amber-400' : 'text-white/0 group-hover:text-white/20 hover:!text-amber-400'}`}
      title={isStarred ? 'Remove bookmark' : 'Bookmark'}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.75.75 0 0 1 3 14.25V2.75Z" />
      </svg>
    </button>
  );
}

function UnreadBtn({ onMarkUnread }) {
  if (!onMarkUnread) return null;
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkUnread(); }}
      className="shrink-0 rounded p-0.5 text-white/0 group-hover:text-white/20 hover:!text-accent transition-colors"
      title="Mark as unread"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path d="M1 8.849c0 1 .738 1.851 1.734 1.947L3 10.82v1.43a.75.75 0 0 0 1.28.53l1.82-1.82H12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4.849Z" />
      </svg>
    </button>
  );
}

function PreviewBtn({ onPreview }) {
  if (!onPreview) return null;
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreview(); }}
      className="shrink-0 rounded p-0.5 text-white/0 group-hover:text-white/20 hover:!text-white/60 transition-colors"
      title="Quick view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path fillRule="evenodd" d="M1.38 8a6.585 6.585 0 0 1 13.24 0 6.585 6.585 0 0 1-13.24 0Zm12.055 0a5.085 5.085 0 1 0-10.87 0 5.085 5.085 0 0 0 10.87 0Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

/*
  density: 'compact' | 'small' | 'detailed'
  - compact  : title only, no image, single tight line
  - small    : title + time, small thumbnail (default)
  - detailed : large thumbnail, title + summary + time
*/
function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function ArticleItem({ item, density = 'small', onToggleStar, isStarred = false, isRead = false, isFocused = false, onRead, onMarkUnread, onPreview }) {
  const rel  = relativeTime(item.pubDate);
  const full = fullDate(item.pubDate);
  const fresh = isToday(item.pubDate);

  /* ── Compact ─────────────────────────────────────────────────────── */
  if (density === 'compact') {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onRead}
        className={`group flex items-center gap-2 rounded-lg mx-2 px-2 py-1.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all ${fresh ? 'border-l-2 border-indigo-500/40 pl-1.5' : ''} ${isRead ? 'opacity-40 hover:opacity-70' : ''} ${isFocused ? 'ring-1 ring-accent/40 bg-white/[0.05]' : ''}`}
      >
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/60 group-hover:text-white/85 transition-colors leading-none">
          {item.title}
        </span>
        {rel && (
          <span className="shrink-0 text-[10px] text-white/20 tabular-nums" title={full}>{rel}</span>
        )}
        <PreviewBtn onPreview={onPreview} />
        <UnreadBtn onMarkUnread={onMarkUnread} />
        <StarBtn item={item} onToggle={onToggleStar} isStarred={isStarred} />
      </a>
    );
  }

  /* ── Detailed ────────────────────────────────────────────────────── */
  if (density === 'detailed') {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onRead}
        className={`group flex gap-3 rounded-xl mx-2 px-2 py-3 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.04] last:border-0 ${fresh ? 'border-l-2 border-l-indigo-500/40 pl-1.5' : ''} ${isRead ? 'opacity-40 hover:opacity-70' : ''} ${isFocused ? 'ring-1 ring-accent/40 bg-white/[0.05]' : ''}`}
      >
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl object-cover opacity-80 group-hover:opacity-100 transition-opacity mt-0.5"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-white/80 group-hover:text-white transition-colors line-clamp-2">
            {item.title}
          </p>
          {item.summary && (
            <p className="mt-1 text-[11.5px] leading-relaxed text-white/35 line-clamp-2">
              {item.summary}
            </p>
          )}
          {rel && (
            <p className="mt-1.5 text-[11px] text-white/22" title={full}>{rel}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0 mt-0.5">
          <PreviewBtn onPreview={onPreview} />
          <UnreadBtn onMarkUnread={onMarkUnread} />
          <StarBtn item={item} onToggle={onToggleStar} isStarred={isStarred} />
        </div>
      </a>
    );
  }

  /* ── Small (default) ─────────────────────────────────────────────── */
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onRead}
      className={`group flex gap-3 rounded-xl mx-2 px-2 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all ${fresh ? 'border-l-2 border-indigo-500/40 pl-1.5' : ''} ${isRead ? 'opacity-40 hover:opacity-70' : ''} ${isFocused ? 'ring-1 ring-accent/40 bg-white/[0.05]' : ''}`}
    >
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover opacity-80 group-hover:opacity-100 transition-opacity mt-0.5"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12.5px] leading-[1.45] font-medium text-white/65 group-hover:text-white/90 transition-colors">
          {item.title}
        </p>
        {rel && (
          <p className="mt-1 text-[11px] text-white/22 group-hover:text-white/35 transition-colors" title={full}>
            {rel}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
        <PreviewBtn onPreview={onPreview} />
        <UnreadBtn onMarkUnread={onMarkUnread} />
        <StarBtn item={item} onToggle={onToggleStar} isStarred={isStarred} />
      </div>
    </a>
  );
}
