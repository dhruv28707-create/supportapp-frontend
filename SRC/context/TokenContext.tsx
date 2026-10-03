import React, { createContext, useContext } from "react";
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
  const { plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, isTrial, trialEndsAt, trialUsed, trialAvailable, loading, refreshPlan } = usePlan();

  return (
    <TokenContext.Provider
      value={{
        plan,
        messagesRemaining,
        nextRefreshAt,
        isLimitReached,
        expiresAt,
        isTrial,
        trialEndsAt,
        trialUsed,
        trialAvailable,
        loading,
        refreshPlan,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
