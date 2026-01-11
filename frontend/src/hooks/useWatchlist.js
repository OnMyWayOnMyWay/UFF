import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'uff_watchlist_v1';

function readWatchlist() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeWatchlist(nextList) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
  } catch {
    // ignore
  }
}

export default function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => readWatchlist());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        setWatchlist(readWatchlist());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const normalized = useMemo(() => {
    return new Set(watchlist.map((n) => String(n).toLowerCase()));
  }, [watchlist]);

  const isWatching = useCallback(
    (playerName) => {
      if (!playerName) return false;
      return normalized.has(String(playerName).toLowerCase());
    },
    [normalized]
  );

  const addPlayer = useCallback((playerName) => {
    const name = (playerName || '').trim();
    if (!name) return;

    setWatchlist((prev) => {
      const exists = prev.some((p) => String(p).toLowerCase() === name.toLowerCase());
      const next = exists ? prev : [name, ...prev];
      writeWatchlist(next);
      return next;
    });
  }, []);

  const removePlayer = useCallback((playerName) => {
    const name = (playerName || '').trim();
    if (!name) return;

    setWatchlist((prev) => {
      const next = prev.filter((p) => String(p).toLowerCase() !== name.toLowerCase());
      writeWatchlist(next);
      return next;
    });
  }, []);

  const togglePlayer = useCallback(
    (playerName) => {
      if (isWatching(playerName)) {
        removePlayer(playerName);
        return false;
      }
      addPlayer(playerName);
      return true;
    },
    [addPlayer, isWatching, removePlayer]
  );

  const clearWatchlist = useCallback(() => {
    setWatchlist(() => {
      writeWatchlist([]);
      return [];
    });
  }, []);

  return {
    watchlist,
    isWatching,
    addPlayer,
    removePlayer,
    togglePlayer,
    clearWatchlist,
  };
}
