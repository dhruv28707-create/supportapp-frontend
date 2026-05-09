import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AppNavigator from "./SRC/navigation/AppNavigator";
import BootSplash from "react-native-bootsplash";
import { TokenProvider } from "./SRC/context/TokenContext";

export default function App() {
  useEffect(() => {
    const init = async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 6000));
      await BootSplash.hide({ fade: true });
    };

    init();
  }, []);

  return (
    <TokenProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </TokenProvider>
  );
}