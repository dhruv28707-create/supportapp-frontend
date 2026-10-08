import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToken } from "../context/TokenContext";
import { PLAN_COLORS, PLANS, PlanKey, APP_VERSION } from "../constants";
import { useCountdown, formatRefreshIn } from "../hooks/useCountdown";
import { ApiError } from "../api/client";
import {
  cancelSubscription,
  requestAccountDeletion,
} from "../services/safeSpaceApi";
import { colors } from "../theme";
import { friendlyAuthError } from "../utils/auth";

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const route = useRoute<any>();
  const { plan, messagesRemaining, nextRefreshAt, expiresAt, isTrial, trialEndsAt, refreshPlan, showRefillTimer, messagesUsed, messagesTotal, quotaPercent } = useToken();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const currentUser = auth().currentUser;
  const isLoggedIn = Boolean(currentUser);

  const secondsLeft = useCountdown(showRefillTimer ? nextRefreshAt : null);
  const showUsageBar = quotaPercent >= 0.75 && messagesTotal > 0;
  const forwardedTab = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPlan().catch(() => {});
    }, [refreshPlan])
  );

  useEffect(() => {
    const tab = route.params?.initialPolicyTab;
    if (typeof tab === 'string' && tab.length > 0 && forwardedTab.current !== tab) {
      forwardedTab.current = tab;
      navigation.setParams({ initialPolicyTab: undefined } as any);
      navigation.navigate("Policy", { tab });
    }
  }, [navigation, route.params?.initialPolicyTab]);

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
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      });
    } catch {}
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
              Alert.alert("Error", friendlyAuthError(error, "Could not log you out. Please try again."));
            }
          },
        },
      ]
    );
  };

  const clearLocalStateAfterDelete = async () => {
    setUserProfile(null);
    try {
      await AsyncStorage.removeItem('safespace:trial-banner-dismissed');
    } catch {}
    // Note: TokenContext/usePlan resets to DEFAULT_PLAN automatically via
    // onAuthStateChanged once we sign out — no refreshPlan() here, the token
    // is dead at this point and a fetch would just fail.
  };

  const finishDeletedAndSignOut = async () => {
    await clearLocalStateAfterDelete();
    try {
      await auth().signOut();
    } catch {}
    navigateToAuthRoot();
  };

  const isAbortOrTimeout = (e: any) => {
    const name = typeof e?.name === 'string' ? e.name : '';
    const msg = typeof e?.message === 'string' ? e.message : '';
    return (
      name === 'AbortError' ||
      /abort|timed out|timeout|network request failed/i.test(msg)
    );
  };

  const handleDeleteAccount = () => {
    if (deleting) return;
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
                    if (deleting) return;
                    setDeleting(true);
                    try {
                      // 1. Long-timeout DELETE — the server purge can take 60s+.
                      //    Never treat timeout/abort as success.
                      //    Never call currentUser.delete() and never delete
                      //    Firestore docs client-side (rules deny it).
                      let result = await requestAccountDeletion();

                      // 4a. Active subscription → force-cancel, then retry once.
                      if (result.status === 409 && result.body?.code === 'active_subscription') {
                        try {
                          await cancelSubscription();
                        } catch (cancelErr: any) {
                          if (cancelErr instanceof ApiError && cancelErr.status === 401) {
                            await finishDeletedAndSignOut();
                            return;
                          }
                          Alert.alert(
                            "Active Subscription",
                            friendlyAuthError(cancelErr, "Please cancel your subscription first before deleting your account."),
                          );
                          return;
                        }
                        result = await requestAccountDeletion();
                        if (result.status === 409 && result.body?.code === 'active_subscription') {
                          Alert.alert(
                            "Active Subscription",
                            "Your subscription is still active. Please cancel it and try deleting again.",
                          );
                          return;
                        }
                      }

                      // 4b. Already deleted server-side → safe to sign out.
                      if (
                        result.status === 401 &&
                        (result.body?.code === 'auth/user-not-found' ||
                          /user-not-found/i.test(result.body?.error ?? ''))
                      ) {
                        await finishDeletedAndSignOut();
                        return;
                      }

                      // 2. ONLY true success signs out:
                      //    200 + success:true + firebaseAuthDeleted !== false.
                      if (
                        result.status === 200 &&
                        result.body?.success === true &&
                        result.body?.firebaseAuthDeleted !== false
                      ) {
                        if (result.body?.chatDocsFailed && result.body.chatDocsFailed > 0) {
                          Alert.alert(
                            "Partial Deletion",
                            `Your account was deleted, but ${result.body.chatDocsFailed} chat document(s) couldn't be removed. Contact support if this is an issue.`,
                          );
                        }
                        await finishDeletedAndSignOut();
                        return;
                      }

                      // 3. Backend tells the truth on failure:
                      //    500 { code:'auth_delete_failed' } or
                      //    success:false / firebaseAuthDeleted === false.
                      //    Stay signed in — the Auth record survived.
                      if (
                        result.status === 500 ||
                        result.body?.code === 'auth_delete_failed' ||
                        result.body?.firebaseAuthDeleted === false ||
                        result.body?.success === false
                      ) {
                        Alert.alert(
                          "Account deletion failed",
                          result.body?.error ||
                            "We couldn't delete your account. Please try again. You are still signed in.",
                        );
                        return;
                      }

                      // Any other non-success status → stay signed in.
                      Alert.alert(
                        "Account deletion failed",
                        result.body?.error ||
                          "We couldn't delete your account. Please try again. You are still signed in.",
                      );
                    } catch (error: any) {
                      // 401 via apiFetch means the token refresh failed and
                      // apiFetch already signed out locally. If the backend
                      // says the user is gone, treat as already deleted;
                      // otherwise stay signed in and report failure.
                      if (error instanceof ApiError && error.status === 401) {
                        await finishDeletedAndSignOut();
                        return;
                      }
                      if (isAbortOrTimeout(error)) {
                        Alert.alert(
                          "Account deletion failed",
                          "The request timed out and your account was NOT deleted. You are still signed in — please try again.",
                        );
                        return;
                      }
                      Alert.alert("Error", friendlyAuthError(error, "Could not delete your account. Please try again. You are still signed in."));
                    } finally {
                      setDeleting(false);
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
            <TouchableOpacity
              style={styles.planInfoWrap}
              onPress={() => navigation.navigate("Usage")}
              activeOpacity={0.85}
            >
              <Text style={[styles.planName, { color: planStyle.text }]}>
                {planInfo.name} Plan
              </Text>
              <Text style={styles.planSub}>
                {showRefillTimer && nextRefreshAt
                  ? `${messagesRemaining} ${messagesRemaining === 1 ? "message" : "messages"} left · refills in ${formatRefreshIn(secondsLeft)}`
                  : messagesTotal > 0
                    ? `${messagesUsed}/${messagesTotal} used · ${messagesRemaining} left`
                    : `${messagesRemaining} ${messagesRemaining === 1 ? "message" : "messages"} left`}
              </Text>
              {showUsageBar && (
                <View style={styles.usageBarTrack}>
                  <View style={[styles.usageBarFill, { width: `${Math.round(quotaPercent * 100)}%` }]} />
                </View>
              )}
              {expiresAt && planKey !== 'free' && !isTrial && (
                <Text style={styles.planExpires}>
                  Renews on {new Date(expiresAt).toLocaleDateString()}
                </Text>
              )}
              {isTrial && trialEndsAt && (
                <Text style={styles.planExpires}>
                  Ultimate trial ends on {new Date(trialEndsAt).toLocaleDateString()}
                </Text>
              )}
              <Text style={styles.viewUsage}>View usage →</Text>
            </TouchableOpacity>
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
  usageBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 8,
    overflow: "hidden",
  },
  usageBarFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  planExpires: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontWeight: "600" },
  viewUsage: { fontSize: 12, color: colors.primary, marginTop: 6, fontWeight: "700" },
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
