import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import auth from '@react-native-firebase/auth';
import { apiFetch } from '../api/client';

export interface PlanInfo {
  plan: string;
  messagesRemaining: number;
  nextRefreshAt: number | string | null;
  isLimitReached: boolean;
  expiresAt: string | null;
  isTrial: boolean;
  trialEndsAt: number | string | null;
  trialUsed: boolean;
  trialAvailable: boolean;
  /** True only when the quota is exhausted and a refill countdown should be shown. */
  showRefillTimer: boolean;
  messagesUsed: number;
  messagesTotal: number;
  /** 0..1 fraction of quota consumed. */
  quotaPercent: number;
}

const DEFAULT_PLAN: PlanInfo = {
  plan: 'free',
  messagesRemaining: 0,
  nextRefreshAt: null,
  isLimitReached: false,
  expiresAt: null,
  isTrial: false,
  trialEndsAt: null,
  trialUsed: false,
  trialAvailable: false,
  showRefillTimer: false,
  messagesUsed: 0,
  messagesTotal: 0,
  quotaPercent: 0,
};

/**
 * Tracks the user's plan/limits.
 *
 * NOTE: deliberately does NOT use `useFocusEffect` — the provider sits
 * outside NavigationContainer, and useFocusEffect calls useNavigation(),
 * which throws "Couldn't find a navigation object" outside a container
 * (this previously crashed the app right after the splash screen).
 *
 * Refreshes when the auth user changes and when the app returns to the
 * foreground. Screens can also call refreshPlan() manually and read the
 * returned value for up-to-date plan state.
 *
 * Uses `apiFetch`, which attaches a fresh ID token and retries once on a
 * 401 (ID tokens expire after ~1h) before forcing a re-login.
 */
export function usePlan() {
  const [planInfo, setPlanInfo] = useState<PlanInfo>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);
  const planRef = useRef<PlanInfo>(planInfo);
  planRef.current = planInfo;

  const refreshPlan = useCallback(async (): Promise<PlanInfo> => {
    const user = auth().currentUser;
    if (!user) {
      setPlanInfo(DEFAULT_PLAN);
      setLoading(false);
      return DEFAULT_PLAN;
    }
    try {
      // The backend reads the user from the Bearer token — no uid param needed.
      const res = await apiFetch(`/api/user/plan`);
      const data = await res.json();
      if (res.ok) {
        const isTrial = data.isTrial ?? false;
        const trialUsed = data.trialUsed ?? false;
        const messagesRemaining = data.messagesRemaining ?? 0;
        const messagesTotal = data.messagesTotal ?? 0;
        const messagesUsed =
          data.messagesUsed ?? (messagesTotal > 0 ? Math.max(0, messagesTotal - messagesRemaining) : 0);
        const quotaPercent =
          typeof data.quotaPercent === 'number'
            ? data.quotaPercent
            : messagesTotal > 0
              ? Math.min(1, Math.max(0, messagesUsed / messagesTotal))
              : 0;
        const fresh: PlanInfo = {
          plan: data.plan || 'free',
          messagesRemaining,
          nextRefreshAt: data.nextRefreshAt || null,
          isLimitReached: data.isLimitReached ?? false,
          expiresAt: data.expiresAt || null,
          isTrial,
          trialEndsAt: data.trialEndsAt ?? null,
          trialUsed,
          // Backend sends trialAvailable; fall back to derived value for
          // older backends that only send isTrial/trialUsed.
          trialAvailable: data.trialAvailable ?? (!isTrial && !trialUsed),
          // Gate the refill countdown: only show it when the backend says so.
          showRefillTimer: data.showRefillTimer ?? false,
          messagesUsed,
          messagesTotal,
          quotaPercent,
        };
        setPlanInfo(fresh);
        return fresh;
      }
      // Non-ok response: keep last known good values instead of resetting.
      return planRef.current;
    } catch (e) {
      if (__DEV__) console.log('usePlan fetch error:', e);
      return planRef.current;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the auth user changes (login/logout).
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(() => {
      refreshPlan();
    });
    return unsubscribe;
  }, [refreshPlan]);

  // Refresh when the app returns to the foreground (e.g. plan refilled).
  // Debounce repeated 'active' events so a rapid state flutter doesn't hammer
  // the backend.
  useEffect(() => {
    let scheduled: ReturnType<typeof setTimeout> | null = null;

    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;

      if (scheduled) {
        clearTimeout(scheduled);
      }
      scheduled = setTimeout(() => {
        scheduled = null;
        refreshPlan().catch((e) => {
          if (__DEV__) console.log('usePlan foreground refresh error:', e);
        });
      }, 1500);
    });

    return () => {
      subscription.remove();
      if (scheduled) {
        clearTimeout(scheduled);
      }
    };
  }, [refreshPlan]);

  return { ...planInfo, loading, refreshPlan };
}
