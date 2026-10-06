import React, { createContext, useContext, useMemo } from "react";
import { usePlan, PlanInfo } from "../hooks/usePlan";

interface TokenContextType extends PlanInfo {
  loading: boolean;
  refreshPlan: () => Promise<PlanInfo>;
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
  loading: true,
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
  }),
});

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const { plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, isTrial, trialEndsAt, trialUsed, trialAvailable, showRefillTimer, messagesUsed, messagesTotal, quotaPercent, refillInMs, refreshHours, loading, refreshPlan } = usePlan();

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
      loading,
      refreshPlan,
    }),
    [plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, isTrial, trialEndsAt, trialUsed, trialAvailable, showRefillTimer, messagesUsed, messagesTotal, quotaPercent, refillInMs, refreshHours, loading, refreshPlan]
  );

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
