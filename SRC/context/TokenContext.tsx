import React,{ createContext, useContext, useEffect, useState } from "react";
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { DEVELOPER_DAILY_LIMIT, DEVELOPER_TIER, isDeveloperEmail } from '../config/developerAccounts';

const DAILY_LIMITS: Record<string, number> ={
  free: 20,
  pro: 100,
  ultimate: 300,
  [DEVELOPER_TIER]: DEVELOPER_DAILY_LIMIT,
};
interface TokenContextType {
  messagesUsed: number;
  dailyLimit: number;
  tier: string;
  percentUsed: number;
  remainingMessages: number;
  isSlowMode: boolean;
}

const TokenContext = createContext<TokenContextType>({
  messagesUsed: 0,
  dailyLimit: 20,
  tier: 'free',
  percentUsed: 0,
  remainingMessages: 20,
  isSlowMode: false,
});

export const TokenProvider = ({ children } : { children: React.ReactNode}) => {
  const [messagesUsed, setMessagesUsed] = useState(0);
  const[tier, setTier] = useState('free');

  const todayKey = () => new Date().toISOString().slice(0, 10);

  useEffect (() => {
    let unsubscribeSession: undefined | (() => void);
    let unsubscribeUser: undefined | (() => void);

    const unsubscribeAuth = auth().onAuthStateChanged((user) => {
      unsubscribeSession?.();
      unsubscribeUser?.();

      if (!user) {
        setMessagesUsed(0);
        setTier('free');
        return;
      }

      if (isDeveloperEmail(user.email)) {
        setMessagesUsed(0);
        setTier(DEVELOPER_TIER);
        return;
      }

      unsubscribeSession = firestore()
        .collection('sessions')
        .doc(user.uid)
        .onSnapshot(snap => {
          if (snap.exists()) {
            const data = snap.data();
            setMessagesUsed(data?.messageUsageDate === todayKey() ? data?.messagesUsed || 0 : 0);
          } else {
            setMessagesUsed(0);
          }
        });

      unsubscribeUser = firestore()
        .collection('users')
        .doc(user.uid)
        .onSnapshot(snap => {
          if(snap.exists()) {
            setTier(snap.data()?.tier || 'free');
          } else {
            setTier('free');
          }
        });
    });
    
    return () => {
      unsubscribeSession?.();
      unsubscribeUser?.();
      unsubscribeAuth();
    };
  }, []);

  const dailyLimit = DAILY_LIMITS[tier] ?? 20;
  const percentUsed = dailyLimit > 0 ? (messagesUsed / dailyLimit) * 100: 0;
  const remainingMessages = Math.max(0, dailyLimit - messagesUsed);
  const isSlowMode = percentUsed >= 75;

  return (
    <TokenContext.Provider value={{
      messagesUsed,
      dailyLimit,
      tier,
      percentUsed,
      remainingMessages,
      isSlowMode
    }}>
      {children}
    </TokenContext.Provider>
  );
};

export const useToken = () => useContext(TokenContext);
