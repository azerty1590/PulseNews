import { useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../lib/api.js';

// Polls /health every 30s. Returns { status: 'checking'|'online'|'offline'|'slow', ms }
export function useServerStatus() {
  const [status, setStatus] = useState('checking');
  const [ms, setMs]         = useState(null);

  const ping = useCallback(async () => {
    setStatus((s) => s === 'online' || s === 'slow' ? s : 'checking');
    const result = await checkHealth();
    setMs(result.ms);
    if (!result.ok) { setStatus('offline'); return; }
    setStatus(result.ms > 1500 ? 'slow' : 'online');
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, [ping]);

  return { status, ms };
}
