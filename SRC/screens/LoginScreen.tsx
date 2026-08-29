import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, spacing, shadow, typography } from "../theme";

export default function LoginScreen({ navigation }: any) {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email, password);
      // Navigation to the app stack happens automatically via onAuthStateChanged
      // in AppNavigator — do NOT call navigation.replace("Lobby") here, the auth
      // stack has no such route and it races the auth-state switch.
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        Alert.alert("Google Sign-In Failed", "Could not retrieve account token. Please try again.");
        return;
      }
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);
      const uid = userCredential.user.uid;

      // If first time signing in with Google, create user doc.
      // `tier` is required by the Firestore rules (allow create: tier == 'free').
      const userDoc = await firestore().collection("users").doc(uid).get();
      if (!userDoc.exists()) {
        const displayName = userCredential.user.displayName || "";
        const nameParts = displayName.split(" ");
        await firestore().collection("users").doc(uid).set({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          gender: "",
          email: userCredential.user.email || "",
          emergencyContact: null,
          tier: "free",
          createdAt: firestore.FieldValue.serverTimestamp(),
          agreedToTermsAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled, do nothing
      } else {
        Alert.alert("Google Sign-In Failed", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>SafeSpace</Text>
        <Text style={styles.appTagline}>You are not alone</Text>
      </View>

      {/* Form area */}
      <KeyboardAvoidingView
        style={styles.formWrapper}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => nav.navigate("Register")}>
              <Text style={styles.bottomLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    backgroundColor: "transparent",
  },
  appName: {
    fontSize: typography.heading,
    fontWeight: "800",
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  appTagline: { fontSize: 14, color: colors.onPrimaryMuted, marginTop: 4 },

  formWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  formContent: { padding: spacing.xxl, paddingBottom: 60 },
  welcomeText: {
    fontSize: typography.subsection,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  welcomeSub: { fontSize: typography.body, color: colors.textMuted, marginBottom: spacing.xxxl },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: {
    fontSize: typography.label,
    fontWeight: "600",
    color: colors.primaryDarker,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: typography.body,
    color: colors.text,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadow.press,
  },
  primaryButtonDisabled: { backgroundColor: colors.primarySoft },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: typography.body,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
    gap: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderStrong },
  dividerText: { fontSize: typography.label, color: colors.textFaint, fontWeight: "500" },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
    width: 22,
    textAlign: "center",
  },
  googleBtnText: { color: colors.text, fontSize: typography.body, fontWeight: "600" },
  bottomRow: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
  bottomPrompt: { fontSize: typography.body, color: colors.textMuted },
  bottomLink: { fontSize: typography.body, color: colors.primary, fontWeight: "700" },
});
