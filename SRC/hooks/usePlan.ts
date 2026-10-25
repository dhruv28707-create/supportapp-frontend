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
  /** Ms until refill (from /api/user/usage). Null on older backends. */
  refillInMs: number | null;
  /** Refresh window in hours (from /api/user/usage). */
  refreshHours: number | null;
  /** Server-granted developer account. Only source of truth for developer UI. */
  isDeveloper: boolean;
  /** True when the backend grants unlimited chat quota (developer accounts). */
  unlimited: boolean;
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
  refillInMs: null,
  refreshHours: null,
  isDeveloper: false,
  unlimited: false,
};

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
      let data: any = null;
      try {
        const res = await apiFetch(`/api/user/usage`);
        data = await res.json();
        if (!res.ok) throw new Error(`usage ${res.status}`);
      } catch {
        const res = await apiFetch(`/api/user/plan`);
        data = await res.json();
        if (!res.ok) {
          return planRef.current;
        }
      }
      {
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
          trialAvailable: data.trialAvailable ?? (!isTrial && !trialUsed),
          showRefillTimer: data.showRefillTimer ?? false,
          messagesUsed,
          messagesTotal,
          quotaPercent,
          refillInMs: typeof data.refillInMs === 'number' ? data.refillInMs : null,
          refreshHours: typeof data.refreshHours === 'number' ? data.refreshHours : null,
          isDeveloper: data.isDeveloper === true,
          unlimited: data.unlimited === true,
        };
        setPlanInfo(fresh);
        return fresh;
      }
    } catch (e) {
      if (__DEV__) console.log('usePlan fetch error:', e);
      return planRef.current;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Developer access is granted server-side. When the backend tells us we are
   * (or are no longer) a developer, force one ID-token refresh so the new
   * claims are visible, then re-read plan/usage. Intentionally not retried.
   */
  const refreshDeveloperAccess = useCallback(async (): Promise<PlanInfo> => {
    const user = auth().currentUser;
    if (user) {
      try {
        await user.getIdToken(true);
      } catch (e) {
        if (__DEV__) console.log('usePlan developer token refresh error:', e);
      }
    }
    return refreshPlan();
  }, [refreshPlan]);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(() => {
      refreshPlan();
    });
    return unsubscribe;
  }, [refreshPlan]);

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

  return { ...planInfo, loading, refreshPlan, refreshDeveloperAccess };
}
