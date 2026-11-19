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

/** Max time to wait for one plan/usage request before giving up. */
const REQUEST_TIMEOUT_MS = 15000;
/** Auto-retries after a transient failure (network / timeout / 5xx). */
const MAX_AUTO_RETRIES = 3;
/** Backoff base: retries fire after 2s, 4s, 8s. */
const RETRY_BASE_DELAY_MS = 2000;

/**
 * Rejects if the promise has not settled within `ms`. Without this, a request
 * that never completes would leave the shared in-flight promise pending
 * forever and block every later refresh.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('request timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
  // Bounded auto-retry state for transient failures.
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRetryCallRef = useRef(false);

  const refreshPlan = useCallback(async (): Promise<PlanInfo> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    // A fresh trigger (app start, resume, screen focus, manual retry) gets a
    // new retry budget and cancels any retry that is still waiting.
    if (!isRetryCallRef.current) {
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }
    isRetryCallRef.current = false;

    const task = doRefresh().finally(() => {
      if (inFlightRef.current === task) {
        inFlightRef.current = null;
      }
    });
    inFlightRef.current = task;
    return task;
  }, []);

  /** Schedules a limited number of retries with exponential backoff. */
  function scheduleRetry() {
    if (retryCountRef.current >= MAX_AUTO_RETRIES) return;
    if (retryTimerRef.current) return; // one pending retry at a time
    const delay = RETRY_BASE_DELAY_MS * 2 ** retryCountRef.current;
    retryCountRef.current += 1;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      isRetryCallRef.current = true;
      refreshPlan().catch(() => {});
    }, delay);
  }

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
        const res = await withTimeout(apiFetch(`/api/user/usage`), REQUEST_TIMEOUT_MS);
        if (!res.ok) throw new Error(`usage ${res.status}`);
        data = await res.json();
      } catch (e) {
        // Always logged (not only in dev) so a release build can be diagnosed.
        console.warn('[usePlan] /api/user/usage failed, falling back to /api/user/plan:', String(e));
        const res = await withTimeout(apiFetch(`/api/user/plan`), REQUEST_TIMEOUT_MS);
        if (!res.ok) {
          console.warn('[usePlan] /api/user/plan failed with status', res.status);
          setRefreshFailed(true);
          // Only server-side / transient errors are worth retrying; a 4xx
          // will not fix itself.
          if (res.status >= 500) scheduleRetry();
          return planRef.current;
        }
        data = await res.json();
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
        retryCountRef.current = 0; // success resets the retry budget
        return fresh;
      }
    } catch (e) {
      // A network error, timeout or transient failure keeps the last-known
      // server state visible and schedules a bounded retry. Never throw
      // plan-fetch errors at the user.
      console.warn('[usePlan] plan fetch error:', String(e));
      setRefreshFailed(true);
      scheduleRetry();
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
        console.warn('[usePlan] developer token refresh error:', String(e));
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

  // Cancel any pending retry when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

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
          console.warn('[usePlan] foreground refresh error:', String(e));
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