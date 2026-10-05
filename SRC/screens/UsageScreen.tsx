import React, { useCallback, useState } from "react";
import {
  RefreshControl,
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
import { useToken } from "../context/TokenContext";
import { PLAN_COLORS, PLANS, PlanKey } from "../constants";
import { useCountdown, formatCountdown, formatRefreshIn } from "../hooks/useCountdown";
import { colors } from "../theme";

type UsageNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function UsageScreen() {
  const navigation = useNavigation<UsageNavProp>();
  const {
    plan,
    messagesUsed,
    messagesTotal,
    messagesRemaining,
    quotaPercent,
    nextRefreshAt,
    refillInMs,
    refreshHours,
    isLimitReached,
    showRefillTimer,
    isTrial,
    trialEndsAt,
    refreshPlan,
  } = useToken();
  const [refreshing, setRefreshing] = useState(false);

  // Refresh on focus + allow pull-to-refresh. Count is synchronous on the
  // backend now, so usage is correct immediately after each chat reply.
  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPlan();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPlan]);

  // 75% rule: gate the countdown on showRefillTimer === true. nextRefreshAt /
  // refillInMs are always present for compat — ignore them unless the flag is set.
  const secondsLeft = useCountdown(showRefillTimer ? nextRefreshAt : null);
  const refillLabel = showRefillTimer
    ? nextRefreshAt
      ? `Refills in ${formatCountdown(secondsLeft)}`
      : typeof refillInMs === 'number' && refillInMs > 0
        ? `Refills in ${formatRefreshIn(Math.ceil(refillInMs / 1000))}`
        : "Refilling soon"
    : null;

  const planKey: PlanKey = (plan === 'pro' || plan === 'ultimate') ? (plan as PlanKey) : 'free';
  const planStyle = PLAN_COLORS[planKey] ?? PLAN_COLORS.free;
  const planInfo = PLANS[planKey];
  const percent = Math.round(Math.min(1, Math.max(0, quotaPercent)) * 100);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usage</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.card, { borderColor: planStyle.border, backgroundColor: planStyle.bg }]}>
          <Text style={[styles.planName, { color: planStyle.text }]}>
            {planInfo.name} Plan
          </Text>
          <Text style={styles.usageNumbers}>
            {messagesUsed}/{messagesTotal} used · {messagesRemaining} left
          </Text>

          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.percentText}>{percent}% used</Text>

          {refillLabel && (
            <Text style={styles.refillText}>💛 {refillLabel}</Text>
          )}
          {!showRefillTimer && typeof refreshHours === 'number' && (
            <Text style={styles.hintText}>Refreshes every {refreshHours}h</Text>
          )}
          {isLimitReached && !showRefillTimer && (
            <Text style={styles.refillText}>Message limit reached — please try again in a bit.</Text>
          )}
          {isTrial && trialEndsAt && (
            <Text style={styles.trialText}>
              Ultimate trial ends on {new Date(trialEndsAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        <Text style={styles.note}>
          Stranger chats count toward your quota like normal messages.
        </Text>

        {planKey === 'free' && (
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => navigation.navigate("Paywall")}
            activeOpacity={0.85}
          >
            <Text style={styles.upgradeBtnText}>Upgrade ✨</Text>
          </TouchableOpacity>
        )}
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
  card: { borderRadius: 16, borderWidth: 1.5, padding: 18 },
  planName: { fontSize: 18, fontWeight: "700" },
  usageNumbers: { fontSize: 14, color: colors.textSubtle, marginTop: 4, fontWeight: "600" },
  barTrack: {
    height: 8, borderRadius: 4, backgroundColor: colors.border,
    marginTop: 12, overflow: "hidden",
  },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  percentText: { fontSize: 12, color: colors.textSubtle, marginTop: 6, fontWeight: "600" },
  refillText: { fontSize: 13, color: colors.text, marginTop: 10, fontWeight: "600" },
  hintText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  trialText: { fontSize: 12, color: colors.textSubtle, marginTop: 8, fontWeight: "600" },
  note: { fontSize: 12, color: colors.textMuted, marginTop: 16, textAlign: "center" },
  upgradeBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 16, alignItems: "center", marginTop: 20,
  },
  upgradeBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: "700" },
});
