import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useToken } from "../context/TokenContext";
import { PLAN_COLORS, PLANS, PlanKey, APP_VERSION } from "../constants";
import { useCountdown, formatRefreshIn } from "../hooks/useCountdown";
import { apiFetch } from "../api/client";
import { colors } from "../theme";

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const { plan, messagesRemaining, nextRefreshAt, expiresAt, refreshPlan } = useToken();
  const [userProfile, setUserProfile] = useState<any>(null);
  const currentUser = auth().currentUser;
  const isLoggedIn = Boolean(currentUser);

  const secondsLeft = useCountdown(nextRefreshAt);

  // Refetch the plan whenever this screen gains focus (e.g. returning from
  // the paywall after a purchase).
  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    firestore()
      .collection("users")
      .doc(uid)
      .get()
      .then((doc) => {
        if (doc.exists()) setUserProfile(doc.data());
      });
  }, []);

  const navigateToAuthRoot = () => {
    // After sign-out / account deletion we want the app to show the
    // Sign In / Create Account entry point, not the settings/policy tab.
    // The onAuthStateChanged listener in AppNavigator will fire after
    // signOut() and re-render the unauth stack (Auth/Login/Register).
    // We reset to Lobby (auth stack root) so the current screen is cleared;
    // when onAuthStateChanged fires, the unauth stack takes over.
    navigation.reset({
      index: 0,
      routes: [{ name: "Lobby" }],
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Choose an option:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: () => {
            handleDeleteAccount();
          },
        },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              await auth().signOut();
              navigateToAuthRoot();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your conversations. This cannot be undone. We will also try to cancel your subscription automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Once you delete your account, all your data and conversations will be permanently removed. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const uid = auth().currentUser?.uid;
                      if (uid) {
                        // Delete conversations first, then the user document.
                        const convosRef = firestore()
                          .collection("users")
                          .doc(uid)
                          .collection("conversations");

                        const convosSnap = await convosRef.get();
                        const BATCH_LIMIT = 400;

                        for (let i = 0; i < convosSnap.docs.length; i += BATCH_LIMIT) {
                          const batch = firestore().batch();
                          const chunk = convosSnap.docs.slice(i, i + BATCH_LIMIT);

                          // Delete messages in each conversation.
                          for (const convo of chunk) {
                            const messagesRef = convo.ref.collection("messages");
                            const msgsSnap = await messagesRef.get();
                            for (let j = 0; j < msgsSnap.docs.length; j += BATCH_LIMIT) {
                              const msgBatch = firestore().batch();
                              const msgChunk = msgsSnap.docs.slice(j, j + BATCH_LIMIT);
                              for (const msg of msgChunk) {
                                msgBatch.delete(msg.ref);
                              }
                              await msgBatch.commit();
                            }

                            batch.delete(convo.ref);
                          }

                          await batch.commit();
                        }

                        await firestore().collection("users").doc(uid).delete();
                      }

                      // Best-effort: cancel any active Razorpay subscription
                      // so the user isn't charged after deletion.
                      // If the endpoint doesn't exist or fails, we still
                      // proceed with deletion — the user can cancel manually.
                      try {
                        await apiFetch('/api/payment-cancel', {
                          method: 'POST',
                        });
                      } catch (cancelError) {
                        console.log('subscription cancel failed (non-fatal):', cancelError);
                      }

                      try {
                        await auth().currentUser?.delete();
                      } catch (authError: any) {
                        // Some Firebase SDK versions/account states only support
                        // signOut for direct user-deletion. Fall back to signOut.
                        console.log("account delete failed, signing out instead:", authError?.message);
                        await auth().signOut();
                      }

                      navigateToAuthRoot();
                    } catch (error: any) {
                      Alert.alert("Error", error.message);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const planKey: PlanKey = (plan === 'pro' || plan === 'ultimate') ? plan : 'free';
  const planStyle = PLAN_COLORS[planKey] ?? PLAN_COLORS.free;
  const planInfo = PLANS[planKey];
  const fullName = userProfile
    ? `${userProfile.firstName ?? ""} ${userProfile.lastName ?? ""}`.trim()
    : "Loading...";
  const email = currentUser?.email ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {isLoggedIn && (
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userProfile?.firstName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.profileInfoWrap}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
        </View>
        )}

        {isLoggedIn && (
          <>
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>SUBSCRIPTION</Text>
        </View>
        <View style={[styles.planCard, { borderColor: planStyle.border, backgroundColor: planStyle.bg }]}>
          <View style={styles.planRow}>
            <View style={styles.planInfoWrap}>
              <Text style={[styles.planName, { color: planStyle.text }]}>
                {planInfo.name} Plan
              </Text>
              <Text style={styles.planSub}>
                {messagesRemaining} {messagesRemaining === 1 ? "message" : "messages"} left
                {nextRefreshAt ? ` · refills in ${formatRefreshIn(secondsLeft)}` : ""}
              </Text>
              {expiresAt && planKey !== 'free' && (
                <Text style={styles.planExpires}>
                  Renews on {new Date(expiresAt).toLocaleDateString()}
                </Text>
              )}
            </View>
            {planKey === 'free' && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate("Paywall")}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
          </>
        )}

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>LEGAL</Text>
        </View>
        <View style={styles.menuCard}>
          {[
            { label: "Terms & Conditions", tab: "terms" },
            { label: "Privacy Policy",     tab: "privacy" },
            { label: "Payment Policy",     tab: "payment" },
            { label: "Refund Policy",      tab: "refund" },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.tab}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
              onPress={() => navigation.navigate("Policy", { tab: item.tab })}
              activeOpacity={0.8}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>SUPPORT</Text>
        </View>
        <View style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Text style={styles.menuLabel}>emotionalsupapp1912@gmail.com</Text>
          </View>
        </View>

        {isLoggedIn && (
          <>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} activeOpacity={0.85}>
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.version}>SafeSpace · v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  backIcon: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  headerSpacer: { width: 36 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.onPrimary },

  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 48 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.onPrimary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: colors.onPrimary },
  profileInfoWrap: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  sectionLabel: { marginBottom: 8, marginTop: 4 },
  sectionLabelText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 1 },

  planCard: {
    borderRadius: 16, borderWidth: 1.5,
    padding: 16, marginBottom: 24,
  },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planInfoWrap: { flex: 1 },
  planName: { fontSize: 16, fontWeight: "700" },
  planSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  planExpires: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: "600" },
  upgradeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  upgradeBtnText: { color: colors.onPrimary, fontSize: 12, fontWeight: "700" },

  menuCard: {
    backgroundColor: colors.onPrimary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 12,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: "500" },
  menuArrow: { fontSize: 20, color: colors.primary, fontWeight: "700" },

  logoutBtn: {
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.dangerBorder,
    marginBottom: 12,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "700" },

  deleteAccountBtn: {
    backgroundColor: "transparent",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.danger,
    marginBottom: 16,
  },
  deleteAccountText: { color: colors.danger, fontSize: 15, fontWeight: "700" },

  version: { textAlign: "center", fontSize: 12, color: colors.textFaint },
});
