import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { SUPPORT_EMAIL } from "../constants";
import { colors } from "../theme";

export default function AuthScreen() {
  const navigation = useNavigation<any>();

  const handleCreateAccount = () => {
    Alert.alert(
      "Your Privacy Matters",
      "Your conversations on SafeSpace are completely private and will never be shared with anyone not with us, not with third parties.\n\nOur AI processes your messages to respond to you, but no human ever reads your conversations.\n\nIf you ever feel your privacy has been violated, reach out to us immediately:\n\n " + SUPPORT_EMAIL,
      [
        {
          text: "Contact Us",
          onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`),
        },
        {
          text: "I Understand →",
          onPress: () => navigation.navigate("Register"),
          style: "default",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topSection}>
        <Text style={styles.appName}>SafeSpace</Text>
        <Text style={styles.tagline}>You are not alone 🌿</Text>
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.welcomeText}>A safe place to talk</Text>
        <Text style={styles.welcomeSub}>
          Share what's on your mind with someone who truly listens — without judgment, anytime.
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.85}
        >
          <Text style={styles.loginButtonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleCreateAccount}
          activeOpacity={0.85}
        >
          <Text style={styles.registerButtonText}>Create New Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: colors.onPrimary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: { fontSize: 16, color: "#F5D9B8", letterSpacing: 0.3 },
  bottomSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 50,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 10,
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
  },
  loginButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  registerButton: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  registerButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
