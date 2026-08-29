import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme";

// ✅ Typed navigation
type PolicyNavProp = NativeStackNavigationProp<RootStackParamList>;

const TABS = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "payment", label: "Payment" },
  { id: "refund", label: "Refund" },
];

const POLICIES: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  terms: {
    title: "Terms & Conditions",
    sections: [
      { heading: "Effective Date", body: "These Terms & Conditions are effective as of the date of your first use of SafeSpace." },
      { heading: "1. Acceptance of Terms", body: "By accessing or using SafeSpace, you agree to be bound by these Terms & Conditions. If you do not agree, do not use the application." },
      { heading: "2. Nature of the Service", body: "SafeSpace is an AI-powered emotional support and conversational companion platform.\n\n• The service is not a substitute for professional therapy, counseling, or medical advice.\n• No human counselors or licensed professionals are involved.\n• You acknowledge that any responses generated are automated and may not always be accurate, appropriate, or sufficient for your situation." },
      { heading: "3. Medical Disclaimer", body: "SafeSpace does not provide medical, psychological, or psychiatric services.\n\n• Do not rely on the app for crisis situations.\n• In case of emergency, contact local emergency services or a qualified professional immediately." },
      { heading: "4. Eligibility", body: "Minimum age: 15 years. Users under 18 must have parental or legal guardian consent.\n\nBy using the app, you confirm that you meet these requirements." },
      { heading: "5. User Accounts", body: "SafeSpace uses Firebase for authentication.\n\n• Users must provide accurate information (e.g., email).\n• You are responsible for maintaining account confidentiality.\n• We reserve the right to suspend or terminate accounts for violations." },
      { heading: "6. Data & Privacy", body: "• We collect and store email addresses only for authentication.\n• Conversations are stored securely and are used only to power your in-app chat history. They are never sold, shared with third parties, or read by humans.\n• Basic usage logs may be collected for system performance and security." },
      { heading: "7. Subscription & Payments", body: "Payments are processed via Razorpay.\n\nPlans:\n• Pro Plan: ₹179/month or ₹699/year\n• Ultimate Plan: ₹199/month or ₹799/year\n\nRefund Policy:\n• Refunds are allowed within 24 hours of purchase only.\n• After 24 hours, no refunds will be issued.\n\nSafeSpace reserves the right to modify pricing at any time." },
      { heading: "8. Usage Limits", body: "• Free Plan: 20 messages, refreshes every 5 hours.\n• Pro Plan: 80 messages, refreshes every 4 hours.\n• Ultimate Plan: 200 messages, refreshes every 2 hours.\n• Limits and refill rates may be updated without prior notice." },
      { heading: "9. Acceptable Use", body: "Users agree NOT to:\n• Use abusive, harmful, or offensive language.\n• Attempt to exploit or manipulate the AI system.\n• Use the app for illegal or unethical activities.\n\nViolation may result in account suspension or permanent ban." },
      { heading: "10. Crisis & Self-Harm Handling", body: "If a user expresses self-harm or crisis-related intent:\n• The app will display emergency helpline numbers and guidance.\n• SafeSpace does not intervene, monitor, or escalate situations.\n\nUsers are solely responsible for seeking real-world help." },
      { heading: "11. Limitation of Liability", body: "SafeSpace is provided \"as is\" without warranties of any kind.\n\nWe are not liable for:\n• Emotional distress\n• Decisions made based on AI responses\n• Any direct or indirect damages arising from use of the app" },
      { heading: "12. Modifications", body: "We may update these Terms at any time. Continued use of the app means you accept the updated Terms." },
      { heading: "13. Intellectual Property", body: "All content, branding, and technology related to SafeSpace are owned by the developer/company." },
      { heading: "14. Governing Law", body: "These Terms are governed by the laws of India, with jurisdiction in Gujarat." },
      { heading: "15. Company Status", body: "SafeSpace is currently an independently developed application and may be registered under a formal company entity in the future." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      { heading: "Effective Date", body: "This Privacy Policy is effective as of the date of your first use of SafeSpace." },
      { heading: "1. Introduction", body: "SafeSpace is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.\n\nBy using the app, you agree to the terms outlined in this Privacy Policy." },
      { heading: "2. Information We Collect", body: "a. Account Information\nWe collect your email address via authentication, handled using Firebase.\n\nb. Usage Data\nWe may collect limited technical data such as:\n• Device type\n• App performance logs\n• Error reports\n\nc. Conversations\nConversations are stored securely and are used only to power your in-app chat history. They are never sold, shared with third parties, or read by humans. You can delete any conversation at any time from the Conversation History screen. To delete your account and all associated data, contact us at emotionalsupapp1912@gmail.com." },
      { heading: "3. How We Use Your Information", body: "We use collected data to:\n• Provide and maintain the service\n• Authenticate users\n• Improve performance and fix bugs\n• Ensure security and prevent misuse\n\nWe do NOT:\n• Sell your data\n• Share personal data with advertisers\n• Use conversations for training or analysis" },
      { heading: "4. Payments", body: "All payments are securely processed through Razorpay.\n\n• We do not store your card or payment details.\n• Payment data is handled directly by the payment provider." },
      { heading: "5. Data Sharing", body: "We do not sell or rent your personal data.\n\nWe may share limited data only:\n• With service providers (e.g., Firebase) for app functionality\n• If required by law or legal process" },
      { heading: "6. Data Security", body: "We implement reasonable security measures to protect your information. However, no system is 100% secure. You use the app at your own risk." },
      { heading: "7. Data Retention", body: "• Email data is stored as long as your account is active.\n• Conversation history is stored securely until you delete it (via the app) or request account deletion." },
      { heading: "8. Your Rights", body: "Depending on applicable laws in India, you may:\n• Request access to your data\n• Request deletion of your account and associated data\n• Contact us for any privacy-related concerns" },
      { heading: "9. Children's Privacy", body: "Minimum age: 15 years. Users under 18 must have parental or guardian consent.\n\nWe do not knowingly collect data from users without required consent." },
      { heading: "10. Third-Party Services", body: "SafeSpace relies on:\n• Firebase (authentication & backend)\n• Razorpay (payments)\n\nThese services have their own privacy policies." },
      { heading: "11. Changes to This Policy", body: "We may update this Privacy Policy at any time. Continued use of the app means you accept the updated policy." },
      { heading: "12. Contact Information", body: "For any questions or concerns:\n📧 emotionalsupapp1912@gmail.com" },
    ],
  },
  payment: {
    title: "Payment Policy",
    sections: [
      { heading: "Effective Date", body: "This Payment Policy is effective as of the date of your first purchase on SafeSpace." },
      { heading: "1. Overview", body: "This Payment Policy outlines the terms related to subscriptions, payments, billing, and refunds for SafeSpace.\n\nBy purchasing any paid plan, you agree to this Payment Policy." },
      { heading: "2. Subscription Plans", body: "SafeSpace offers the following premium plans:\n\n• Pro Plan: ₹179/month or ₹699/year\n• Ultimate Plan: ₹199/month or ₹799/year\n\nAll features and limits are subject to change at any time." },
      { heading: "3. Payment Processing", body: "All payments are securely processed through Razorpay.\n\n• SafeSpace does not store or process card/banking details directly.\n• Payment information is handled by the payment provider." },
      { heading: "4. Billing Terms", body: "• Payments are charged in advance for the selected subscription period.\n• By subscribing, you authorize recurring charges (if applicable).\n\nIf payment fails, access to premium features will be restricted immediately." },
      { heading: "5. Refund Policy", body: "• Refund requests are accepted within 24 hours of purchase only.\n• After 24 hours, no refunds will be issued under any circumstances.\n\nEligibility requires:\n• Valid proof of purchase\n• Request through official support channels" },
      { heading: "6. Cancellation Policy", body: "• Users may cancel their subscription at any time.\n• Cancellation stops future billing only.\n• No partial refunds for unused time." },
      { heading: "7. Pricing Changes", body: "SafeSpace reserves the right to modify pricing or introduce/remove plans. Changes apply to future billing cycles only." },
      { heading: "8. Failed Transactions", body: "If a payment fails:\n• Your subscription may be paused or downgraded.\n• You may be required to update payment details." },
      { heading: "9. Abuse & Fraud", body: "We reserve the right to:\n• Suspend accounts involved in fraudulent activity\n• Deny refunds in cases of abuse or policy violation" },
      { heading: "10. Taxes", body: "All prices are listed in INR (₹). Applicable taxes may be added at checkout as per Indian regulations." },
      { heading: "11. Contact for Billing Issues", body: "For payment-related queries or refund requests:\n📧 emotionalsupapp1912@gmail.com" },
    ],
  },
  refund: {
    title: "Refund Policy",
    sections: [
      { heading: "Effective Date", body: "This Refund Policy is effective as of the date of your first purchase on SafeSpace." },
      { heading: "1. Overview", body: "This Refund Policy outlines the conditions under which refunds may be issued for purchases made within SafeSpace.\n\nBy purchasing any subscription, you agree to this Refund Policy." },
      { heading: "2. Eligibility for Refunds", body: "Refunds are only eligible if:\n• The request is made within 24 hours of the original purchase.\n\nAfter 24 hours, all payments are final and non-refundable." },
      { heading: "3. Valid Refund Scenarios", body: "Refunds may be considered if:\n• The purchase was made accidentally\n• You did not receive access to premium features after payment\n• A technical issue prevented proper use of the service\n\nAll requests are subject to verification." },
      { heading: "4. Non-Refundable Cases", body: "Refunds will NOT be provided for:\n• Partial usage of subscription period\n• Change of mind after purchase\n• Dissatisfaction with AI responses\n• Failure to use the service after purchase\n• Requests made after 24 hours" },
      { heading: "5. Processing Refunds", body: "All refunds are processed through Razorpay via the original payment method. Processing time may vary depending on the payment provider." },
      { heading: "6. Subscription Cancellation", body: "• Users can cancel their subscription at any time.\n• Cancellation prevents future billing only.\n• No refunds for the remaining subscription period." },
      { heading: "7. Abuse & Misuse", body: "We reserve the right to deny refund requests if there is evidence of abuse, fraud, or repeated exploitation of the policy." },
      { heading: "8. Chargebacks", body: "If a user initiates a chargeback without contacting support first:\n• The account may be suspended or permanently banned.\n• Future access to SafeSpace may be restricted." },
      { heading: "9. How to Request a Refund", body: "Contact us at:\n📧 emotionalsupapp1912@gmail.com\n\nInclude:\n• Registered email address\n• Proof of payment\n• Reason for refund request" },
      { heading: "10. Policy Updates", body: "We reserve the right to modify this Refund Policy at any time. Continued use of the app indicates acceptance of updated terms." },
    ],
  },
};

export default function PolicyScreen() {
  const navigation = useNavigation<PolicyNavProp>(); // ✅ Now properly typed
  const route = useRoute<any>();
  const initialTab = route.params?.tab ?? "terms";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const policy = POLICIES[activeTab];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{policy.title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {policy.sections.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={styles.contactBox}>
          <Text style={styles.contactText}>
            Questions? Reach us at{"\n"}
            <Text style={styles.contactEmail}>emotionalsupapp1912@gmail.com</Text>
          </Text>
        </View>
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
  headerTitle: {
    fontSize: 17, fontWeight: "700", color: colors.onPrimary,
    flex: 1, textAlign: "center", marginHorizontal: 8,
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: colors.background,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: "center", backgroundColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: colors.onPrimary },
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 20, paddingBottom: 48 },
  section: {
    marginBottom: 16, backgroundColor: colors.onPrimary,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionHeading: {
    fontSize: 14, fontWeight: "700", color: colors.primary, marginBottom: 8,
  },
  sectionBody: { fontSize: 14, color: colors.text, lineHeight: 22 },
  contactBox: {
    backgroundColor: colors.border, borderRadius: 14,
    padding: 16, alignItems: "center", marginTop: 8,
  },
  contactText: { fontSize: 13, color: colors.primaryDarker, textAlign: "center", lineHeight: 22 },
  contactEmail: { fontWeight: "700", color: colors.primary },
});
