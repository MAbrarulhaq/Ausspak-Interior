import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../services/api';

/** Tiny data-loading hook: runs `fn` when `deps` change and exposes loading / error / reload. Ignores stale responses. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const run = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useCallback(fn, deps);

  useEffect(() => {
    const id = ++run.current;
    setLoading(true);
    stable().then(
      (d) => { if (id === run.current) { setData(d); setError(null); setLoading(false); } },
      (e) => { if (id === run.current) { setError(apiErrorMessage(e)); setLoading(false); } },
    );
  }, [stable, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}
