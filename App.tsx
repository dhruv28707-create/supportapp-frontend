import React, { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "./SRC/navigation/AppNavigator";
import { TokenProvider } from "./SRC/context/TokenContext";
import SplashScreen from "./SRC/screens/SplashScreen";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WEB_CLIENT_ID } from "./SRC/constants";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

if (__DEV__ && /placeholder|SET_ME_IN_ENV/i.test(GOOGLE_WEB_CLIENT_ID)) {
  console.warn(
    '[GoogleSignin] GOOGLE_WEB_CLIENT_ID is a placeholder. ' +
      'Set it in .env (must be the Web-application client from google-services.json / Firebase console) ' +
      'or every sign-in will fail with DEVELOPER_ERROR.'
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.log("App crash:", error?.message);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.crash}>
          <Text style={styles.crashTitle}>Something went wrong</Text>
          <Text style={styles.crashSub}>Please restart the app and try again.</Text>
        </View>
      );
    }
    return this.state.error ? null : this.props.children;
  }
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <TokenProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </TokenProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  crash: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  crashTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  crashSub: { fontSize: 14, opacity: 0.7, textAlign: "center" },
});
