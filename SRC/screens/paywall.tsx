import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useToken } from "../context/TokenContext";

const PLANS = {
  pro: {
    name: "Pro",
    monthlyPrice: 179,
    yearlyPrice: 699,
    monthlySaving: null,
    yearlySaving: 459,
    color: "#C8702A",
    textColor: "#3D2000",
    cardBg: "#FFFFFF",
    borderColor: "#C8702A",
    btnBg: "#C8702A",
    btnText: "#FFF8F0",
    badge: "POPULAR",
    features: [
      "💬 100 messages per day",
      "👨‍👩‍👧 8 personalities unlocked",
      "🤝 Friend & Best Friend",
      "🎓 Mentor access",
      "🙏 All Guide variants",
      "⚡ Priority responses",
    ],
  },
  ultimate: {
    name: "Ultimate",
    monthlyPrice: 199,
    yearlyPrice: 799,
    monthlySaving: null,
    yearlySaving: 589,
    color: "#FFF8F0",
    textColor: "#FFF8F0",
    cardBg: "#C8702A",
    borderColor: "#C8702A",
    btnBg: "#FFF8F0",
    btnText: "#C8702A",
    badge: "BEST",
    features: [
      "💬 300 messages per day",
      "✨ All Pro features",
      "💙 Boyfriend & Girlfriend",
      "💍 Husband & Wife",
      "🔮 Early access to new features",
    ],
  },
};

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { tier } = useToken();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleSubscribe = (plan: string) => {
    Alert.alert(
      "Coming Soon 🚀",
      `${plan} plan will be available very soon. We'll notify you when it launches!`,
      [{ text: "Got it!", style: "default" }]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={styles.heroEmoji}>💛</Text>
        <Text style={styles.heroTitle}>You deserve more support</Text>
        <Text style={styles.heroSub}>
          Unlock more companions and longer conversations
        </Text>

        {/* Current Plan Badge */}
        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanText}>
            Current plan: {tier.toUpperCase()}
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              billingCycle === "monthly" && styles.toggleBtnActive,
            ]}
            onPress={() => setBillingCycle("monthly")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                billingCycle === "monthly" && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              billingCycle === "yearly" && styles.toggleBtnActive,
            ]}
            onPress={() => setBillingCycle("yearly")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.toggleText,
                billingCycle === "yearly" && styles.toggleTextActive,
              ]}
            >
              Yearly
            </Text>
            {billingCycle === "yearly" && (
              <View style={styles.savingPill}>
                <Text style={styles.savingPillText}>Save more</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        {Object.entries(PLANS).map(([key, plan]) => (
          <View
            key={key}
            style={[
              styles.planCard,
              {
                backgroundColor: plan.cardBg,
                borderColor: plan.borderColor,
              },
            ]}
          >
            {/* Plan Header */}
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: plan.textColor }]}>
                  {plan.name}
                </Text>
                <Text style={[styles.planPrice, { color: plan.color === "#FFF8F0" ? "#F5D9B8" : "#C8702A" }]}>
                  ₹{billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  <Text style={styles.planPeriod}>
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </Text>
                </Text>
                {billingCycle === "yearly" && (
                  <Text style={[styles.savingText, { color: plan.color === "#FFF8F0" ? "#F5D9B8" : "#888" }]}>
                    Save ₹{plan.yearlySaving} vs monthly
                  </Text>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: plan.color === "#FFF8F0" ? "rgba(255,255,255,0.2)" : "#C8702A" }]}>
                <Text style={[styles.badgeText, { color: plan.color === "#FFF8F0" ? "#FFF8F0" : "#FFF" }]}>
                  {plan.badge}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: plan.color === "#FFF8F0" ? "rgba(255,255,255,0.2)" : "#F0DCC8" }]} />

            {/* Features */}
            {plan.features.map((f, i) => (
              <Text
                key={i}
                style={[styles.featureItem, { color: plan.textColor }]}
              >
                {f}
              </Text>
            ))}

            {/* Subscribe Button */}
            <TouchableOpacity
              style={[styles.subscribeBtn, { backgroundColor: plan.btnBg }]}
              onPress={() => handleSubscribe(plan.name)}
              activeOpacity={0.85}
            >
              <Text style={[styles.subscribeBtnText, { color: plan.btnText }]}>
                Coming Soon
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer}>
          Payments are secure. Cancel anytime within 24 hours for a full refund.{"\n"}
          Monthly plans renew every 30 days. Yearly plans renew annually.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FDF6EC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0DCC8",
  },
  backBtn: { width: 60 },
  backText: { color: "#C8702A", fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#3D2000" },

  content: { padding: 24, paddingBottom: 48, alignItems: "center" },

  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#3D2000",
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    color: "#B0937A",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },

  currentPlanBadge: {
    backgroundColor: "#F0DCC8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  currentPlanText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C8702A",
    letterSpacing: 0.5,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F0DCC8",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    width: "100%",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: "#C8702A",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B0937A",
  },
  toggleTextActive: {
    color: "#FFF8F0",
  },
  savingPill: {
    backgroundColor: "#FFF8F0",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C8702A",
  },

  planCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planName: {
    fontSize: 22,
    fontWeight: "800",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: "500",
  },
  savingText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    marginBottom: 16,
  },

  featureItem: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: "500",
  },

  subscribeBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  subscribeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  footer: {
    fontSize: 12,
    color: "#B0937A",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});