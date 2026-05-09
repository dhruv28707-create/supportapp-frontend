import React, { useState } from "react";
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
import { isGoogleSignInCancel, signInWithGoogle } from "../services/googleAuth";
import firestore from "@react-native-firebase/firestore";

const SUPPORT_EMAIL = "emotionalsupapp1912@gmail.com";

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
  setLoading(true);

  try {
    const userCredential = await signInWithGoogle();

    if (userCredential?.user) {
      const user = userCredential.user;
      const today = new Date().toISOString().slice(0, 10);

      // Create/update Firestore user document
      await firestore()
        .collection("users")
        .doc(user.uid)
        .set(
          {
            email: user.email ?? "",
            tier: "free",
            createdAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      // Create/update session document
      await firestore()
        .collection("sessions")
        .doc(user.uid)
        .set(
          {
            tokensUsed: 0,
            usageDate: today,
            messagesUsed: 0,
            messageUsageDate: today,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      navigation.navigate("Lobby");
    }
  } catch (error: any) {
    console.log("GOOGLE SIGN IN ERROR:", error);

    if (!isGoogleSignInCancel(error)) {
      Alert.alert("Google Sign-In Failed", error.message);
    }
  } finally {
    setLoading(false);
  }
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
          style={[styles.googleButton, loading && styles.googleButtonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.googleButtonText}>
            {loading ? "Connecting..." : "Continue with Google"}
          </Text>
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
  safe: { flex: 1, backgroundColor: "#C8702A" },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFF8F0",
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: { fontSize: 16, color: "#F5D9B8", letterSpacing: 0.3 },
  bottomSection: {
    backgroundColor: "#FDF6EC",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 50,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3D2000",
    marginBottom: 10,
  },
  welcomeSub: {
    fontSize: 14,
    color: "#B0937A",
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: "#C8702A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
  },
  loginButtonText: {
    color: "#FFF8F0",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  registerButton: {
    backgroundColor: "#FFF3E8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8C9A0",
  },
  googleButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8C9A0",
    marginBottom: 12,
  },
  googleButtonDisabled: {
    opacity: 0.65,
  },
  googleButtonText: {
    color: "#3D2000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  registerButtonText: {
    color: "#C8702A",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
