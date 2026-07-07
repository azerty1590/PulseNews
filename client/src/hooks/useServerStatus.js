import { useState, useEffect, useRef, useCallback } from 'react';
import { checkHealth } from '../lib/api.js';

// Polls /health every 30s. Returns { status: 'checking'|'online'|'offline'|'slow', ms }
export function useServerStatus() {
  const [status, setStatus] = useState('checking');
  const [ms, setMs]         = useState(null);

  const statusRef = useRef('checking');
  const ping = useCallback(async () => {
    const result = await checkHealth();
    const next = !result.ok ? 'offline' : result.ms > 1500 ? 'slow' : 'online';
    if (next !== statusRef.current) {
      statusRef.current = next;
      setStatus(next);
    }
    setMs((prev) => prev === result.ms ? prev : result.ms);
  }, []);

  useEffect(() => {
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, [ping]);

  return { status, ms };
}
