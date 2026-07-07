export function relativeTime(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date)) return null;

  const diff = Date.now() - date.getTime();
  const abs = Math.abs(diff);

  if (abs < 60_000) return 'just now';
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return `${m}m ago`;
  }
  if (abs < 86_400_000) {
    const h = Math.round(abs / 3_600_000);
    return `${h}h ago`;
  }
  if (abs < 7 * 86_400_000) {
    const d = Math.round(abs / 86_400_000);
    return `${d}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fullDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleString(undefined, {
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
