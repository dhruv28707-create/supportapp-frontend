import React, { createContext, useContext, useMemo } from "react";
import { usePlan, PlanInfo } from "../hooks/usePlan";

interface TokenContextType extends PlanInfo {
  loading: boolean;
  /** Last usage/plan read failed transiently; the state shown is last-known. */
  refreshFailed: boolean;
  refreshPlan: () => Promise<PlanInfo>;
  refreshDeveloperAccess: () => Promise<PlanInfo>;
}

const TokenContext = createContext<TokenContextType>({
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
  loading: true,
  refreshFailed: false,
  refreshPlan: async () => ({
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
  }),
  refreshDeveloperAccess: async () => ({
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
  }),
});

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const { plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, isTrial, trialEndsAt, trialUsed, trialAvailable, showRefillTimer, messagesUsed, messagesTotal, quotaPercent, refillInMs, refreshHours, isDeveloper, unlimited, uiHints, loading, refreshFailed, refreshPlan, refreshDeveloperAccess } = usePlan();

  const value = useMemo<TokenContextType>(
    () => ({
      plan,
      messagesRemaining,
      nextRefreshAt,
      isLimitReached,
      expiresAt,
      isTrial,
      trialEndsAt,
      trialUsed,
      trialAvailable,
      showRefillTimer,
      messagesUsed,
      messagesTotal,
      quotaPercent,
      refillInMs,
      refreshHours,
      isDeveloper,
      unlimited,
      uiHints,
      loading,
      refreshFailed,
      refreshPlan,
      refreshDeveloperAccess,
    }),
    [plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, isTrial, trialEndsAt, trialUsed, trialAvailable, showRefillTimer, messagesUsed, messagesTotal, quotaPercent, refillInMs, refreshHours, isDeveloper, unlimited, uiHints, loading, refreshFailed, refreshPlan, refreshDeveloperAccess]
  );

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
