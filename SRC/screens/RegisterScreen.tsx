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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import database from "@react-native-firebase/database";
import { DEVELOPER_TIER, isDeveloperEmail } from "../config/developerAccounts";

const SUPPORT_EMAIL = "emotionalsupapp1912@gmail.com";

const languages = [
  "English", "Hindi", "Hinglish", "Marathi", "Gujarati", "Bengali",
  "Tamil", "Telugu", "Kannada", "Malayalam", "Punjabi", "Urdu",
  "Odia", "Gunglish/Gujlish",
];

export default function RegisterScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [language, setLanguage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  // ── NEW: T&C checkbox state ───────────────────────────────────────────────
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
    if (!firstName || !lastName || !email || !password || !gender || !language) {
      Alert.alert("Missing Fields", "Please fill all required fields including your preferred language.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (emergencyContact && emergencyContact.length !== 10) {
      Alert.alert("Invalid Contact", "Emergency contact must be a 10 digit number.");
      return;
    }
    // ── NEW: block registration if T&C not accepted ───────────────────────
    if (!agreedToTerms) {
      Alert.alert(
        "Please Accept Terms",
        "You must agree to our Terms & Conditions and Privacy Policy to create an account.",
        [{ text: "Read Terms", onPress: () => navigation.navigate("Policy", { tab: "terms" }) },
         { text: "OK", style: "cancel" }]
      );
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;
      const isDeveloper = isDeveloperEmail(email);

      await firestore().collection("users").doc(uid).set({
        firstName, lastName, gender, language, email,
        emergencyContact: emergencyContact || null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        tier: isDeveloper ? DEVELOPER_TIER : "free",
        role: isDeveloper ? DEVELOPER_TIER : "user",
        isDeveloper,
        premium: isDeveloper,
        expiresAt: null,
        razorpayOrderId: null,
        agreedToTermsAt: firestore.FieldValue.serverTimestamp(), // ← store consent
      });
      await firestore().collection("sessions").doc(uid).set({
        tokensUsed: 0,
        tokenLimit: 10000,
        sessionStartedAt: firestore.FieldValue.serverTimestamp(),
      });
      if (isDeveloper) {
        await database().ref(`users/${uid}`).set({
          role: DEVELOPER_TIER, premium: true, isDeveloper: true, email,
        });
      }

      navigation.replace("Lobby");
    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>SafeSpace</Text>
        <Text style={styles.appTagline}>You are not alone 🌿</Text>
      </View>

      {/* Form */}
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
            placeholderTextColor="#BBAAA4"
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
            placeholderTextColor="#BBAAA4"
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

        {/* Preferred Language */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Preferred Language *</Text>
          <Text style={styles.inputHint}>The AI will always talk to you in this language</Text>
          <TouchableOpacity
            style={[styles.input, styles.languagePicker]}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
          >
            <Text style={language ? styles.languageSelected : styles.languagePlaceholder}>
              {language || "Select your language"}
            </Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#BBAAA4"
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
            placeholderTextColor="#BBAAA4"
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
            placeholderTextColor="#BBAAA4"
            keyboardType="phone-pad"
            maxLength={10}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            onFocus={handleEmergencyContactFocus}
          />
          <Text style={styles.hint}>Only shown to you during a crisis moment — never shared</Text>
        </View>

        {/* ── NEW: T&C Checkbox ─────────────────────────────────────────────── */}
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
              onPress={() => navigation.navigate("Policy", { tab: "terms" })}
            >
              Terms & Conditions
            </Text>
            {" "}and{" "}
            <Text
              style={styles.termsLink}
              onPress={() => navigation.navigate("Policy", { tab: "privacy" })}
            >
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>
        {/* ─────────────────────────────────────────────────────────────────── */}

        {/* Register Button */}
        <TouchableOpacity
          style={[
            styles.registerButton,
            (loading || !agreedToTerms) && styles.registerButtonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.registerButtonText}>
            {loading ? "Creating Account..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Your Language</Text>
            <Text style={styles.modalSub}>The AI will always reply in this language</Text>
            <ScrollView style={{ width: "100%" }}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langRow, language === lang && styles.langRowActive]}
                  onPress={() => { setLanguage(lang); setShowLanguageModal(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                    {lang}
                  </Text>
                  {language === lang && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F2A58E" },
  header: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 28, backgroundColor: "transparent" },
  appName: { fontSize: 32, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.5 },
  appTagline: { fontSize: 14, color: "rgba(255,255,255,0.80)", marginTop: 4 },
  formWrapper: { flex: 1, backgroundColor: "#FAF5F2", borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  formContent: { padding: 28, paddingBottom: 60 },
  welcomeText: { fontSize: 22, fontWeight: "700", color: "#1A1A1A", marginBottom: 4, marginTop: 8 },
  welcomeSub: { fontSize: 14, color: "#9E9E9E", marginBottom: 28 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#8C5C52", marginBottom: 6, letterSpacing: 0.3 },
  inputHint: { fontSize: 11, color: "#BBAAA4", marginBottom: 8 },
  optional: { fontWeight: "400", color: "#BBAAA4" },
  input: {
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#E8D5CE",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1A1A1A",
  },
  languagePicker: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  languageSelected: { fontSize: 15, color: "#1A1A1A" },
  languagePlaceholder: { fontSize: 15, color: "#BBAAA4" },
  dropdownArrow: { fontSize: 16, color: "#BBAAA4" },
  hint: { fontSize: 12, color: "#BBAAA4", marginTop: 6 },
  genderRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderBtn: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: "#F0E8E5", borderWidth: 1.5, borderColor: "transparent",
  },
  genderBtnSelected: { backgroundColor: "#FFF0EB", borderColor: "#E8896C" },
  genderText: { fontSize: 13, color: "#8C5C52", fontWeight: "500" },
  genderTextSelected: { color: "#E8896C", fontWeight: "700" },

  // ── T&C checkbox styles ───────────────────────────────────────────────────
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: "#E8D5CE",
    backgroundColor: "#FFF",
    justifyContent: "center", alignItems: "center",
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: "#E8896C", borderColor: "#E8896C" },
  checkboxTick: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  termsText: { flex: 1, fontSize: 13, color: "#8C5C52", lineHeight: 20 },
  termsLink: { color: "#E8896C", fontWeight: "700", textDecorationLine: "underline" },
  // ─────────────────────────────────────────────────────────────────────────

  registerButton: {
    backgroundColor: "#E8896C", borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8, elevation: 3,
    shadowColor: "#E8896C", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  registerButtonDisabled: { backgroundColor: "#F2C4B5" },
  registerButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginPrompt: { fontSize: 14, color: "#9E9E9E" },
  loginLink: { fontSize: 14, color: "#E8896C", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#FAF5F2", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, alignItems: "center", maxHeight: "75%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#9E9E9E", textAlign: "center", marginBottom: 20 },
  langRow: {
    flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14,
    marginBottom: 8, backgroundColor: "#FFFFFF", borderWidth: 1,
    borderColor: "transparent", width: "100%",
  },
  langRowActive: { backgroundColor: "#FFF0EB", borderWidth: 1.5, borderColor: "#E8896C" },
  langText: { fontSize: 16, color: "#1A1A1A", flex: 1, fontWeight: "500" },
  langTextActive: { color: "#E8896C", fontWeight: "700" },
  checkmark: { fontSize: 16, color: "#E8896C", fontWeight: "700" },
  modalCancel: { marginTop: 8, padding: 14, width: "100%", alignItems: "center" },
  modalCancelText: { color: "#E8896C", fontSize: 15, fontWeight: "600" },
});