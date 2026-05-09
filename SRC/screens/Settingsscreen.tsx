import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useToken } from "../context/TokenContext";

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string; emoji: string }> = {
  free:      { bg: "#F0DCC8", text: "#7A4A1A", border: "#C8702A", emoji: "🌱" },
  pro:       { bg: "#FFF3E0", text: "#E65100", border: "#FF9800", emoji: "⚡" },
  ultimate:  { bg: "#FDF6EC", text: "#C8702A", border: "#C8702A", emoji: "👑" },
  developer: { bg: "#E8F5E9", text: "#1B5E20", border: "#4CAF50", emoji: "🛠️" },
};

export default function SettingsScreen() {
  const navigation = useNavigation<SettingsNavProp>();
  const { tier } = useToken();
  const [userProfile, setUserProfile] = useState<any>(null);

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

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const planStyle = PLAN_COLORS[tier] ?? PLAN_COLORS.free;
  const fullName = userProfile
    ? `${userProfile.firstName ?? ""} ${userProfile.lastName ?? ""}`.trim()
    : "Loading...";
  const email = auth().currentUser?.email ?? "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {userProfile?.firstName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{fullName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
            {userProfile?.language && (
              <Text style={styles.profileLang}>🌐 {userProfile.language}</Text>
            )}
          </View>
        </View>

        {/* Plan Card */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>SUBSCRIPTION</Text>
        </View>
        <View style={[styles.planCard, { borderColor: planStyle.border, backgroundColor: planStyle.bg }]}>
          <View style={styles.planRow}>
            <Text style={styles.planEmoji}>{planStyle.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: planStyle.text }]}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
              </Text>
              <Text style={styles.planSub}>
                {tier === "free"
                  ? "Limited messages per day"
                  : tier === "pro"
                  ? "100 messages per day · 8 personalities"
                  : tier === "ultimate"
                  ? "300 messages per day · All personalities"
                  : "Full developer access"}
              </Text>
            </View>
            {tier === "free" && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate("Paywall")}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>Upgrade ✨</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Policies */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>LEGAL</Text>
        </View>
        <View style={styles.menuCard}>
          {[
            { label: "Terms & Conditions", tab: "terms", icon: "📋" },
            { label: "Privacy Policy",     tab: "privacy", icon: "🔒" },
            { label: "Payment Policy",     tab: "payment", icon: "💳" },
            { label: "Refund Policy",      tab: "refund",  icon: "↩️" },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.tab}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
              onPress={() => navigation.navigate("Policy", { tab: item.tab })}
              activeOpacity={0.8}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Support */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>SUPPORT</Text>
        </View>
        <View style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>📧</Text>
            <Text style={styles.menuLabel}>emotionalsupapp1912@gmail.com</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>SafeSpace · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#C8702A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#C8702A",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center", alignItems: "center",
  },
  backIcon: { color: "#FFF8F0", fontSize: 18, fontWeight: "700" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFF8F0" },

  scroll: { flex: 1, backgroundColor: "#FDF6EC" },
  scrollContent: { padding: 20, paddingBottom: 48 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#F0DCC8",
    gap: 16,
  },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#C8702A",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#FFF8F0" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "700", color: "#3D2000" },
  profileEmail: { fontSize: 13, color: "#B0937A", marginTop: 2 },
  profileLang: { fontSize: 12, color: "#C8702A", marginTop: 4, fontWeight: "600" },

  sectionLabel: { marginBottom: 8, marginTop: 4 },
  sectionLabelText: { fontSize: 11, fontWeight: "700", color: "#B0937A", letterSpacing: 1 },

  planCard: {
    borderRadius: 16, borderWidth: 1.5,
    padding: 16, marginBottom: 24,
  },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planEmoji: { fontSize: 28 },
  planName: { fontSize: 16, fontWeight: "700" },
  planSub: { fontSize: 12, color: "#9E7C63", marginTop: 2 },
  upgradeBtn: {
    backgroundColor: "#C8702A",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  upgradeBtnText: { color: "#FFF8F0", fontSize: 12, fontWeight: "700" },

  menuCard: {
    backgroundColor: "#FFF8F0",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0DCC8",
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
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0DCC8" },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: "#3D2000", fontWeight: "500" },
  menuArrow: { fontSize: 20, color: "#C8702A", fontWeight: "700" },

  logoutBtn: {
    backgroundColor: "#FFF0F0",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFCDD2",
    marginBottom: 16,
  },
  logoutText: { color: "#D32F2F", fontSize: 16, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12, color: "#C0A080" },
});