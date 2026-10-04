import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../constants';

type TargetTime = number | string | null | undefined;

function secondsUntil(target: TargetTime): number {
  if (target === null || target === undefined || target === '') return 0;
  let targetMs: number;
  if (typeof target === 'number') {
    targetMs = target;
  } else {
    const num = Number(target);
    if (!isNaN(num)) {
      targetMs = num;
    } else {
      targetMs = new Date(target).getTime();
    }
  }
  if (isNaN(targetMs)) return 0;
  const diff = targetMs - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

/**
 * Returns a live count of seconds remaining until `target` (epoch ms or ISO string),
 * re-evaluated every second. Returns 0 when there is no target or it passed.
 */
export function useCountdown(target: TargetTime): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(target));

  useEffect(() => {
    setSeconds(secondsUntil(target));
    if (!target) return;
    const id = setInterval(() => setSeconds(secondsUntil(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  return seconds;
}

/** Formats a seconds value as HH:MM:SS. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Formats a seconds value as a short human string like "2h 14m" or "45s". */
export function formatRefreshIn(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe <= 0) return 'now';
  if (safe < 60) return `${safe}s`;
  const m = Math.floor(safe / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Returns true when the device appears to be offline.
 *
 * Uses a lightweight HEAD-style check on the backend health endpoint.
 * Results are cached for `cacheMs` so a flaky connection doesn't cause
 * the indicator to flicker on every keystroke or scroll event.
 */
export function useOnlineStatus(cacheMs = 10_000): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let abortTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      const controller = new AbortController();
      abortTimer = setTimeout(() => controller.abort(), 3000);
      try {
        // Must be GET — the backend health route only registers GET/POST/DELETE,
        // so a HEAD request returns 405 and made the app always look offline.
        // Accepts the new `firebase` field; 503 / disconnected = degraded.
        const res = await fetch(`${BACKEND_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        if (!res.ok) {
          if (!cancelled) setOnline(false);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setOnline(data.firebase !== 'disconnected');
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        if (abortTimer) {
          clearTimeout(abortTimer);
          abortTimer = null;
        }
      }
    };

    check();
    pollTimer = setInterval(check, cacheMs);
    return () => {
      cancelled = true;
      if (abortTimer) clearTimeout(abortTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [cacheMs]);

  return online;
}
