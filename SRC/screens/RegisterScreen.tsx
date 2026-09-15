import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import { SUPPORT_EMAIL } from "../constants";
import { colors, radius, spacing, shadow, typography } from "../theme";

export default function RegisterScreen() {
  const nav = useNavigation<any>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const genders = ["Male", "Female", "Other", "Prefer not to say"];

  const handleEmergencyContactFocus = () => {
    Alert.alert(
      "Your Number is Safe",
      "Your emergency contact number is stored securely and will NEVER be misused, shared, or contacted by us without your consent.\n\nIt is only shown to you during a crisis moment inside the app — nothing else.\n\nIf you ever find this violated, email us immediately with proof:\n\n" + SUPPORT_EMAIL,
      [
        { text: "Contact Us", onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
        { text: "Got It", style: "default" },
      ]
    );
  };

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !gender) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (emergencyContact && !/^\d{10}$/.test(emergencyContact)) {
      Alert.alert("Invalid Contact", "Emergency contact must be a 10 digit number.");
      return;
    }
    if (!agreedToTerms) {
      Alert.alert(
        "Please Accept Terms",
        "You must agree to our Terms & Conditions and Privacy Policy to create an account.",
        [
          { text: "Read Terms", onPress: () => nav.navigate("Settings", { initialPolicyTab: "terms" }) },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      // `tier` is required by the Firestore rules (allow create: tier == 'free').
      await firestore().collection("users").doc(uid).set({
        firstName,
        lastName,
        gender,
        email,
        emergencyContact: emergencyContact || null,
        tier: "free",
        createdAt: firestore.FieldValue.serverTimestamp(),
        agreedToTermsAt: firestore.FieldValue.serverTimestamp(),
      });

      // Navigation to the app stack happens automatically via onAuthStateChanged
      // in AppNavigator — do NOT call navigation.replace("Lobby") here, the auth
      // stack has no such route and it races the auth-state switch.
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      Alert.alert(
        "Please Accept Terms",
        "You must agree to our Terms & Conditions and Privacy Policy before continuing.",
        [
          { text: "Read Terms", onPress: () => nav.navigate("Settings", { initialPolicyTab: "terms" }) },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

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

      // If first time, create user doc. `tier` is required by the Firestore rules.
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

      <ScrollView
        style={styles.formWrapper}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.welcomeText}>Create Account</Text>
        <Text style={styles.welcomeSub}>Tell us a little about yourself</Text>

        {/* First Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>First Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your first name"
            placeholderTextColor={colors.textFaint}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        {/* Last Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your last name"
            placeholderTextColor={colors.textFaint}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Gender */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Gender *</Text>
          <View style={styles.genderRow}>
            {genders.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnSelected]}
                onPress={() => setGender(g)}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email *</Text>
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

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Emergency Contact */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Emergency Contact <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="10 digit phone number"
            placeholderTextColor={colors.textFaint}
            keyboardType="phone-pad"
            maxLength={10}
            value={emergencyContact}
            onChangeText={(text) => setEmergencyContact(text.replace(/[^0-9]/g, ""))}
            onFocus={handleEmergencyContactFocus}
          />
          <Text style={styles.hint}>Only shown to you during a crisis moment — never shared</Text>
        </View>

        {/* T&C Checkbox */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreedToTerms((prev) => !prev)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text
              style={styles.termsLink}
              onPress={() => nav.navigate("Settings", { initialPolicyTab: "terms" })}
            >
              Terms & Conditions
            </Text>
            {" "}and{" "}
            <Text
              style={styles.termsLink}
              onPress={() => nav.navigate("Settings", { initialPolicyTab: "privacy" })}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (loading || !agreedToTerms) && styles.primaryButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Creating Account..." : "Create Account"}
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

        {/* Login link */}
        <View style={styles.bottomRow}>
          <Text style={styles.bottomPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => nav.navigate("Login")}>
            <Text style={styles.bottomLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  welcomeSub: { fontSize: typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  inputGroup: { marginBottom: spacing.lg },
  inputLabel: {
    fontSize: typography.label,
    fontWeight: "600",
    color: colors.primaryDarker,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  optional: { fontWeight: "400", color: colors.textFaint },
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
  hint: { fontSize: typography.caption, color: colors.textFaint, marginTop: spacing.sm },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  genderBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySofter,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  genderBtnSelected: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
  genderText: { fontSize: typography.label, color: colors.primaryDarker, fontWeight: "500" },
  genderTextSelected: { color: colors.primary, fontWeight: "700" },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.onPrimary, fontSize: 13, fontWeight: "700" },
  termsText: { flex: 1, fontSize: typography.label, color: colors.primaryDarker, lineHeight: 20 },
  termsLink: { color: colors.primary, fontWeight: "700", textDecorationLine: "underline" },
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
