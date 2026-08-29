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
  loading: true,
  refreshPlan: async () => ({
    plan: 'free',
    messagesRemaining: 0,
    nextRefreshAt: null,
    isLimitReached: false,
    expiresAt: null,
  }),
});

export const TokenProvider = ({ children }: { children: React.ReactNode }) => {
  const { plan, messagesRemaining, nextRefreshAt, isLimitReached, expiresAt, loading, refreshPlan } = usePlan();

  return (
    <TokenContext.Provider
      value={{
        plan,
        messagesRemaining,
        nextRefreshAt,
        isLimitReached,
        expiresAt,
        loading,
        refreshPlan,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
