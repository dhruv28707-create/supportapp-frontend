import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./SRC/navigation/AppNavigator";
import { TokenProvider } from "./SRC/context/TokenContext";
import SplashScreen from "./SRC/screens/SplashScreen";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WEB_CLIENT_ID } from "./SRC/constants";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <TokenProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </TokenProvider>
  );
}