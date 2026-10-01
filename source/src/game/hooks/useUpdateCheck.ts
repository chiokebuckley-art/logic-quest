import { useCallback, useEffect, useState } from 'react';

export interface BuildInfo {
  version: string;
  builtAt: string;
}

export const CURRENT_BUILD: BuildInfo = typeof __LQ_BUILD__ !== 'undefined' ? __LQ_BUILD__ : { version: 'dev', builtAt: '' };

const CHECK_MS = 5 * 60_000;

/**
 * Looks for a newer deployed build by fetching version.json (never cached) on load, when the page
 * comes back into view, and every five minutes. `available` is true when the deployed build differs.
 */
export function useUpdateCheck() {
  const [remote, setRemote] = useState<BuildInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [failed, setFailed] = useState(false);

  const check = useCallback(async (): Promise<BuildInfo | null> => {
    setChecking(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const info = (await res.json()) as Partial<BuildInfo>;
      if (typeof info.builtAt !== 'string' || typeof info.version !== 'string') throw new Error('bad version.json');
      const got = { version: info.version, builtAt: info.builtAt };
      setRemote(got);
      setFailed(false);
      return got;
    } catch {
      setFailed(true);
      return null;
    } finally {
      setChecking(false);
      setCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    void check();
    const t = window.setInterval(() => { void check(); }, CHECK_MS);
    const onVis = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [check]);

  const available = !!remote && !!CURRENT_BUILD.builtAt && remote.builtAt !== CURRENT_BUILD.builtAt;
  return { available, remote, current: CURRENT_BUILD, check, checking, checkedAt, failed, reload: reloadFresh };
}

/** Reload past any cached copy of the page: a changing query string defeats a stale index.html. */
export function reloadFresh(): void {
  const u = new URL(window.location.href);
  u.searchParams.set('u', Date.now().toString(36));
  window.location.replace(u.toString());
}
