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
  import database from "@react-native-firebase/database";
  import { DEVELOPER_TIER, isDeveloperEmail } from "../config/developerAccounts";
  import { isGoogleSignInCancel, signInWithGoogle } from "../services/googleAuth";

  export default function LoginScreen({ navigation }: any) {
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
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        if (isDeveloperEmail(userCredential.user.email)) {
          await Promise.all([
            firestore().collection("users").doc(userCredential.user.uid).set(
              {
                email: userCredential.user.email,
                role: DEVELOPER_TIER,
                tier: DEVELOPER_TIER,
                isDeveloper: true,
                premium: true,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            ),
            database().ref(`users/${userCredential.user.uid}`).update({
              role: DEVELOPER_TIER,
              premium: true,
              isDeveloper: true,
            }),
          ]);
        }
        navigation.replace("Lobby");
      } catch (error: any) {
        Alert.alert("Login Failed", error.message);
      } finally {
        setLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      setLoading(true);
      try {
        const userCredential = await signInWithGoogle();
        if (userCredential) navigation.replace("Lobby");
      } catch (error: any) {
        if (!isGoogleSignInCancel(error)) {
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
          <Text style={styles.appTagline}>You are not alone 🌿</Text>
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
                placeholderTextColor="#BBAAA4"
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
                placeholderTextColor="#BBAAA4"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.registerLink}>Create one</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const styles = StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: "#F2A58E",   // Peach Pink — header bg
    },
    header: {
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 28,
      backgroundColor: "transparent", // inherits peach pink from safe
    },
    appName: {
      fontSize: 32,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    appTagline: {
      fontSize: 14,
      color: "rgba(255,255,255,0.80)",
      marginTop: 4,
    },
    formWrapper: {
      flex: 1,
      backgroundColor: "#FAF5F2",    // Warm off-white form bg
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
    },
    formContent: {
      padding: 28,
      paddingBottom: 60,
    },
    welcomeText: {
      fontSize: 22,
      fontWeight: "700",
      color: "#1A1A1A",              // Soft black heading
      marginBottom: 4,
      marginTop: 8,
    },
    welcomeSub: {
      fontSize: 14,
      color: "#9E9E9E",              // Warm grey subtitle
      marginBottom: 32,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: "#8C5C52",              // Warm grey-brown label
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    input: {
      backgroundColor: "#FFFFFF",
      borderWidth: 1.5,
      borderColor: "#E8D5CE",        // Blush pink border
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: "#1A1A1A",
    },
    loginButton: {
      backgroundColor: "#E8896C",   // Warm peach button
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
      elevation: 3,
      shadowColor: "#E8896C",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    loginButtonDisabled: {
      backgroundColor: "#F2C4B5",   // Lighter peach when disabled
    },
    loginButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    googleButton: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 12,
      borderWidth: 1.5,
      borderColor: "#E8D5CE",
    },
    googleButtonDisabled: {
      opacity: 0.65,
    },
    googleButtonText: {
      color: "#1A1A1A",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    registerRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 24,
    },
    registerPrompt: {
      fontSize: 14,
      color: "#9E9E9E",
    },
    registerLink: {
      fontSize: 14,
      color: "#E8896C",              // Warm peach link
      fontWeight: "700",
    },
  });
