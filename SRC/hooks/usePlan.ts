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
}

const DEFAULT_PLAN: PlanInfo = {
  plan: 'free',
  messagesRemaining: 0,
  nextRefreshAt: null,
  isLimitReached: false,
  expiresAt: null,
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
        const fresh: PlanInfo = {
          plan: data.plan || 'free',
          messagesRemaining: data.messagesRemaining ?? 0,
          nextRefreshAt: data.nextRefreshAt || null,
          isLimitReached: data.isLimitReached ?? false,
          expiresAt: data.expiresAt || null,
        };
        setPlanInfo(fresh);
        return fresh;
      }
      // Non-ok response: keep last known good values instead of resetting.
      return planRef.current;
    } catch (e) {
      console.log('usePlan fetch error:', e);
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
        refreshPlan().catch((e) => console.log('usePlan foreground refresh error:', e));
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
