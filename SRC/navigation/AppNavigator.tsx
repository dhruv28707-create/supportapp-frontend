import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";

import AuthScreen from "../screens/auth-screen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import UserSetup from "../screens/user-setup";
import Lobby from "../screens/lobby";
import Chat from "../screens/chat";
import PaywallScreen from "../screens/paywall";
import ConversationHistoryScreen from "../screens/ConversationHistoryScreen";

export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  UserSetup: undefined;
  Lobby: undefined;
  chat: { personality: string; conversationId?: string };
  Paywall: undefined;
  Policy: { tab: string };
  ConversationHistory: { filterPersonality? : string} | undefined
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe; // cleanup on unmount
  }, []);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        // User is logged in
        <>
          <Stack.Screen name="Lobby" component={Lobby} />
          <Stack.Screen name="UserSetup" component={UserSetup} />
          <Stack.Screen name="chat" component={Chat} />
          <Stack.Screen name="Paywall" component={PaywallScreen} /> 
          <Stack.Screen name="ConversationHistory" component={ConversationHistoryScreen} />
        </>
      ) : (
        // User is not logged in
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
