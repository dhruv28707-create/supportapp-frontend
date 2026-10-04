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
  }),
});

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const planInfo = usePlan();

  const value = useMemo<TokenContextType>(
    () => ({
      plan: planInfo.plan,
      messagesRemaining: planInfo.messagesRemaining,
      nextRefreshAt: planInfo.nextRefreshAt,
      isLimitReached: planInfo.isLimitReached,
      expiresAt: planInfo.expiresAt,
      isTrial: planInfo.isTrial,
      trialEndsAt: planInfo.trialEndsAt,
      trialUsed: planInfo.trialUsed,
      trialAvailable: planInfo.trialAvailable,
      loading: planInfo.loading,
      refreshPlan: planInfo.refreshPlan,
    }),
    [planInfo]
  );

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
