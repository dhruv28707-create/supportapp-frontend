import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useToken } from "../context/TokenContext";
import auth from "@react-native-firebase/auth";
import RazorpayCheckout from "react-native-razorpay";
import { RAZORPAY_KEY_ID } from "../constants";
import { apiFetch } from "../api/client";
import { colors } from "../theme";

/**
 * Safe fallback for the Razorpay key_id.
 *
 * The backend order endpoint should always return keyId. If it doesn't,
 * we only fall back to the locally configured RAZORPAY_KEY_ID when it looks
 * like a real key (starts with rzp_live_ / rzp_test_). If it is a placeholder
 * or unset, we do NOT silently ship a stale/placeholder value into Razorpay —
 * we throw so the failure is visible instead of confusing.
 */
function safeRazorpayKey(): string {
  const key = RAZORPAY_KEY_ID;
  if (/^rzp_(live|test)_/.test(key)) {
    return key;
  }
  throw new Error(
    "Razorpay key_id is not configured. Set RAZORPAY_KEY_ID in your environment " +
    "(or ./secrets.ts locally) before opening the checkout."
  );
}

const PLANS = {
  pro: {
    name: "Pro",
    monthlyPrice: 179,
    yearlyPrice: 699,
    yearlySaving: 459,
    color: colors.primary,
    textColor: colors.text,
    cardBg: "#FFFFFF",
    borderColor: colors.primary,
    btnBg: colors.primary,
    btnText: colors.onPrimary,
    badge: "POPULAR",
    features: [
      "80 messages, refreshes every 4 hours",
      "8 personalities unlocked",
      "Friend & Best Friend",
      "Mentor access",
      "All Guide variants",
      "Priority responses",
    ],
  },
  ultimate: {
    name: "Ultimate",
    monthlyPrice: 199,
    yearlyPrice: 799,
    monthlySaving: null,
    yearlySaving: 589,
    color: colors.onPrimary,
    textColor: colors.onPrimary,
    cardBg: colors.primary,
    borderColor: colors.primary,
    btnBg: colors.onPrimary,
    btnText: colors.primary,
    badge: "BEST",
    features: [
      "200 messages, refreshes every 2 hours",
      "All Pro features",
      "Boyfriend & Girlfriend",
      "Husband & Wife",
      "Early access to new features",
    ],
  },
};

// Wait before reading the plan back after a payment so the verify/webhook
// has time to persist the new tier before we display it.
const PLAN_POLL_DELAY_MS = 4000;

export default function PaywallScreen() {
  type PaywallNavProp = NativeStackNavigationProp<RootStackParamList>;

  const navigation = useNavigation<PaywallNavProp>();
  const { plan, refreshPlan } = useToken();

  const activePlanKey: "pro" | "ultimate" | null = plan.startsWith("pro")
  ? "pro"
  : plan.startsWith("ultimate")
  ? "ultimate"
  : null;

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<"pro" | "ultimate" | null>(null);
  const [activating, setActivating] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);

  const handleSubscribe = async (planKey: "pro" | "ultimate") => {
    const user = auth().currentUser;

    if (!user) {
      Alert.alert("Not logged in", "Please log in to subscribe.");
      return;
    }

    const tierKey = `${planKey}_${billingCycle}` as
      | "pro_monthly"
      | "pro_yearly"
      | "ultimate_monthly"
      | "ultimate_yearly";

    try {
      setLoading(planKey);
      setPaymentFailed(false);

      // The backend authenticates via the Bearer token — do not send uid in
      // the body (it is ignored/rejected now). apiFetch attaches a fresh
      // token and retries once on 401.
      const orderRes = await apiFetch("/api/payment-order", {
        method: "POST",
        body: JSON.stringify({ tier: tierKey }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create order");
      }

      // The order endpoint returns orderId, amount, currency, keyId
      const options = {
        description: `${PLANS[planKey].name} Plan – ${billingCycle === "monthly" ? "Monthly" : "Yearly"}`,
        currency: orderData.currency || "INR",
        key: orderData.keyId || orderData.key || safeRazorpayKey(),
        amount: orderData.amount,
        order_id: orderData.orderId,
        name: "SafeSpace",
        prefill: {
          email: user.email || "",
          contact: "",
          name: user.displayName || "",
        },
        theme: { color: colors.primary },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // Send the 3 Razorpay fields returned by payment.success
      const verifyRes = await apiFetch("/api/payment-verify", {
        method: "POST",
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok && !verifyData.alreadyVerified) {
        throw new Error(verifyData.error || "Verification failed");
      }

      setActivating(true);
      // Read the freshly fetched plan (the context value is stale here — it
      // was captured when this closure was created). Poll again after a few
      // seconds so a webhook-triggered update is reflected too.
      let freshPlan = await refreshPlan();

      if (freshPlan.plan === "free") {
        await new Promise<void>((resolve) => setTimeout(() => resolve(), PLAN_POLL_DELAY_MS));
        freshPlan = await refreshPlan();
      }

      if (freshPlan.plan === 'free') {
        setPaymentFailed(true);
        setActivating(false);
        return;
      }

      const expiresText = freshPlan.expiresAt
        ? `\n\nRenews on ${new Date(freshPlan.expiresAt).toLocaleDateString()}.`
        : "";

      Alert.alert(
        "Payment Successful",
        `You are now on the ${PLANS[planKey].name} ${billingCycle === "monthly" ? "Monthly" : "Yearly"} plan.${expiresText}`,
        [{ text: "Continue", onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (error?.code === "PAYMENT_CANCELLED") {
        Alert.alert("Cancelled", "Payment was cancelled.");
      } else {
        Alert.alert("Payment Failed", error?.message || "Something went wrong.");
      }
    } finally {
      setLoading(null);
      setActivating(false);
    }
  };

  const handleRetry = async () => {
    setPaymentFailed(false);
    setActivating(true);
    let freshPlan = await refreshPlan();

    if (freshPlan.plan === 'free') {
      await new Promise<void>((resolve) => setTimeout(() => resolve(), PLAN_POLL_DELAY_MS));
      freshPlan = await refreshPlan();
    }

    if (freshPlan.plan === 'free') {
      setPaymentFailed(true);
      setActivating(false);
      return;
    }
    setActivating(false);

    const expiresText = freshPlan.expiresAt
      ? `\n\nRenews on ${new Date(freshPlan.expiresAt).toLocaleDateString()}.`
      : "";

    Alert.alert(
      "Plan Activated",
      `Your plan is now active.${expiresText}`,
      [{ text: "Continue", onPress: () => navigation.goBack() }]
    );
  };

  const allPlansOwned = activePlanKey === "ultimate";

  if (activating) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.activatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.activatingTitle}>Activating your plan...</Text>
          <Text style={styles.activatingSub}>Please wait while we confirm your payment</Text>
          {paymentFailed && (
            <View style={styles.retryContainer}>
              <Text style={styles.retryText}>Still showing Free plan. Please retry.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroTitle}>You deserve more support</Text>
        <Text style={styles.heroSub}>
          Unlock more companions and longer conversations
        </Text>

        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanText}>
            Current plan: {plan.toUpperCase()}
          </Text>
        </View>

        {allPlansOwned ? (
          <View style={styles.allOwnedCard}>
            <Text style={styles.allOwnedTitle}>You have the best plan</Text>
            <Text style={styles.allOwnedSub}>
              You are on the Ultimate plan and have access to everything SafeSpace offers.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, billingCycle === "monthly" && styles.toggleBtnActive]}
                onPress={() => setBillingCycle("monthly")}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, billingCycle === "monthly" && styles.toggleTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, billingCycle === "yearly" && styles.toggleBtnActive]}
                onPress={() => setBillingCycle("yearly")}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, billingCycle === "yearly" && styles.toggleTextActive]}>
                  Yearly
                </Text>
                {billingCycle === "yearly" && (
                  <View style={styles.savingPill}>
                    <Text style={styles.savingPillText}>Save more</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {Object.entries(PLANS).map(([key, planItem]) => {
              if (key === "pro" && (activePlanKey === "pro" || activePlanKey === "ultimate")) return null;

              const isPurchased = activePlanKey === key;
              const isUltimateStyle = planItem.color === colors.onPrimary;
              const planPriceColor = { color: isUltimateStyle ? colors.onPrimaryMuted : colors.primary };
              const savingTextColor = { color: isUltimateStyle ? colors.onPrimaryMuted : "#888" };
              const badgeBg = { backgroundColor: isUltimateStyle ? "rgba(255,255,255,0.2)" : colors.primary };
              const badgeTextColor = { color: isUltimateStyle ? colors.onPrimary : "#FFF" };
              const dividerColor = { backgroundColor: isUltimateStyle ? "rgba(255,255,255,0.2)" : colors.border };
              const subscribeBtnBg = { backgroundColor: isPurchased ? "#E0D0C0" : planItem.btnBg };
              const subscribeBtnTextColor = { color: isPurchased ? colors.textSubtle : planItem.btnText };

              return (
                <View
                  key={key}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: planItem.cardBg,
                      borderColor: planItem.borderColor,
                    },
                  ]}
                >
                  <View style={styles.planHeader}>
                    <View>
                      <Text style={[styles.planName, { color: planItem.textColor }]}>
                        {planItem.name}
                      </Text>
                      <Text style={[styles.planPrice, planPriceColor]}>
                        ₹{billingCycle === "monthly" ? planItem.monthlyPrice : planItem.yearlyPrice}
                        <Text style={styles.planPeriod}>
                          {billingCycle === "monthly" ? "/month" : "/year"}
                        </Text>
                      </Text>
                      {billingCycle === "yearly" && (
                        <Text style={[styles.savingText, savingTextColor]}>
                          Save ₹{planItem.yearlySaving} vs monthly
                        </Text>
                      )}
                    </View>
                    <View style={[styles.badge, badgeBg]}>
                      <Text style={[styles.badgeText, badgeTextColor]}>
                        {isPurchased ? "ACTIVE" : planItem.badge}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, dividerColor]} />

                  {planItem.features.map((f, i) => (
                    <Text key={i} style={[styles.featureItem, { color: planItem.textColor }]}>
                      {f}
                    </Text>
                  ))}

                  <TouchableOpacity
                    style={[styles.subscribeBtn, subscribeBtnBg]}
                    onPress={() => !isPurchased && handleSubscribe(key as "pro" | "ultimate")}
                    activeOpacity={isPurchased ? 1 : 0.85}
                    disabled={loading === key || isPurchased}
                  >
                    {loading === key ? (
                      <ActivityIndicator color={planItem.btnText} />
                    ) : (
                      <Text style={[styles.subscribeBtnText, subscribeBtnTextColor]}>
                        {isPurchased ? "Purchased" : "Subscribe"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {!allPlansOwned && (
          <Text style={styles.footer}>
            Payments are secure. Cancel anytime within 24 hours for a full refund.{"\n"}
            Monthly plans renew every 30 days. Yearly plans renew annually.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 60 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  headerSpacer: { width: 60 },

  content: { padding: 24, paddingBottom: 48, alignItems: "center" },

  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },

  currentPlanBadge: {
    backgroundColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  currentPlanText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },

  allOwnedCard: {
    width: "100%",
    backgroundColor: colors.onPrimary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
  },
  allOwnedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginBottom: 10,
  },
  allOwnedSub: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.border,
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
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
  toggleTextActive: { color: colors.onPrimary },
  savingPill: {
    backgroundColor: colors.onPrimary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingPillText: { fontSize: 10, fontWeight: "700", color: colors.primary },

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
  planName: { fontSize: 22, fontWeight: "800" },
  planPrice: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  planPeriod: { fontSize: 14, fontWeight: "500" },
  savingText: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  divider: { height: 1, marginBottom: 16 },

  featureItem: { fontSize: 15, marginBottom: 10, fontWeight: "500" },

  subscribeBtn: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  subscribeBtnText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },

  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },

  activatingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  activatingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 24,
    textAlign: "center",
  },
  activatingSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  retryContainer: {
    marginTop: 32,
    alignItems: "center",
    backgroundColor: colors.dangerBg,
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  retryText: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: "700" },
});
