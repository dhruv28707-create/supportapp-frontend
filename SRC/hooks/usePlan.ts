import { useState, useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import auth from '@react-native-firebase/auth';
import { apiFetch } from '../api/client';

/** Server uiHints (§E): where the backend allows ambient quota display. */
export interface QuotaUiHints {
  showQuotaInUsageOnly: boolean;
  hideQuotaInLobby: boolean;
  hideQuotaInChat: boolean;
}

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
  /** Server-reported 0..100 percent of quota consumed (see §E). */
  quotaPercent: number;
  /** Ms until refill (from /api/user/usage). Null on older backends. */
  refillInMs: number | null;
  /** Refresh window in hours (from /api/user/usage). */
  refreshHours: number | null;
  /** Server-granted developer account. Only source of truth for developer UI. */
  isDeveloper: boolean;
  /** True when the backend grants unlimited chat quota (developer accounts). */
  unlimited: boolean;
  /** Server placement hints for quota UI (null on older backends). */
  uiHints: QuotaUiHints | null;
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
  uiHints: null,
};

export function usePlan() {
  const [planInfo, setPlanInfo] = useState<PlanInfo>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);
  // True when the last read failed transiently (500/network). UI keeps the
  // last-known server state and can offer a subtle retry affordance.
  const [refreshFailed, setRefreshFailed] = useState(false);
  const planRef = useRef<PlanInfo>(planInfo);
  planRef.current = planInfo;
  // Shared in-flight request: concurrent triggers (app start, chat turn,
  // resume, screen focus) must never stack parallel /api/user/usage reads.
  const inFlightRef = useRef<Promise<PlanInfo> | null>(null);

  const refreshPlan = useCallback(async (): Promise<PlanInfo> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    const task = doRefresh().finally(() => {
      if (inFlightRef.current === task) {
        inFlightRef.current = null;
      }
    });
    inFlightRef.current = task;
    return task;
  }, []);

  async function doRefresh(): Promise<PlanInfo> {
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
          setRefreshFailed(true);
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
        // /api/user/usage reports quotaPercent on a 0..100 scale. Only when
        // an older backend omits it do we derive the same 0..100 scale from
        // the server-reported counts (never a local counter).
        const quotaPercent =
          typeof data.quotaPercent === 'number'
            ? data.quotaPercent
            : messagesTotal > 0
              ? Math.min(100, Math.max(0, (messagesUsed / messagesTotal) * 100))
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
          // Eligibility is decided ONLY by the server (Issue 1) — never inferred
          // locally from account age, token claims, or trialUsed.
          trialAvailable: data.trialAvailable === true,
          showRefillTimer: data.showRefillTimer === true,
          messagesUsed,
          messagesTotal,
          quotaPercent,
          refillInMs: typeof data.refillInMs === 'number' ? data.refillInMs : null,
          refreshHours: typeof data.refreshHours === 'number' ? data.refreshHours : null,
          isDeveloper: data.isDeveloper === true,
          unlimited: data.unlimited === true,
          // Hints default to the documented behaviour when fields are absent.
          uiHints: data.uiHints
            ? {
                showQuotaInUsageOnly: data.uiHints.showQuotaInUsageOnly !== false,
                hideQuotaInLobby: data.uiHints.hideQuotaInLobby !== false,
                hideQuotaInChat: data.uiHints.hideQuotaInChat !== false,
              }
            : null,
        };
        setPlanInfo(fresh);
        setRefreshFailed(false);
        return fresh;
      }
    } catch (e) {
      // A 500/transient failure keeps the last-known server state visible;
      // the caller can surface a subtle "refreshing…" affordance. Never
      // throw plan-fetch errors at the user.
      if (__DEV__) console.log('usePlan fetch error:', e);
      setRefreshFailed(true);
      return planRef.current;
    } finally {
      setLoading(false);
    }
  }

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
        // §C: proactively warm the ID token on resume. The cached token is
        // reused unless it is near expiry, so this adds no Identity-Toolkit
        // pressure; any 401 later still forces a refresh once.
        auth()
          .currentUser?.getIdToken(false)
          .catch(() => {});
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

  return { ...planInfo, loading, refreshFailed, refreshPlan, refreshDeveloperAccess };
}
