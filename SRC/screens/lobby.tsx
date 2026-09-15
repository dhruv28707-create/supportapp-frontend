import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useToken } from "../context/TokenContext";
import { TIER_UNLOCKS, PlanKey } from "../constants";
import { useCountdown, formatRefreshIn } from "../hooks/useCountdown";
import { colors } from "../theme";

type LobbyNavProp = NativeStackNavigationProp<RootStackParamList, "Lobby">;

const PERSONALITY_COLORS: Record<string, {
  bg: string;
  border: string;
  selectedBg: string;
  labelColor: string;
  selectedLabelColor: string;
}> = {
  Father: {
    bg: "#E0EFFF",
    border: "#6CA6D9",
    selectedBg: "#C5DEFA",
    labelColor: "#003366",
    selectedLabelColor: "#002244",
  },
  Mother: {
    bg: "#EDE7F6",
    border: "#B39DDB",
    selectedBg: "#D8C4F0",
    labelColor: "#3D007A",
    selectedLabelColor: "#2A0050",
  },
  Brother: {
    bg: "#E8F5E9",
    border: "#66BB6A",
    selectedBg: "#C8E6C9",
    labelColor: "#1B5E20",
    selectedLabelColor: "#003300",
  },
  Sister: {
    bg: "#FFE4EE",
    border: "#FF69B4",
    selectedBg: "#FFB6C1",
    labelColor: "#7A0020",
    selectedLabelColor: "#5C001A",
  },
  Friend: {
    bg: "#FFF0E6",
    border: "#FF9F80",
    selectedBg: "#FBCEB1",
    labelColor: "#7A2200",
    selectedLabelColor: "#5C1A00",
  },
  "Best Friend": {
    bg: "#FFF3EC",
    border: "#FFAB8F",
    selectedBg: "#FFDAB9",
    labelColor: "#7A3000",
    selectedLabelColor: "#5C2200",
  },
  Mentor: {
    bg: "#FFFDE7",
    border: "#C8B560",
    selectedBg: "#FFF176",
    labelColor: "#5C5000",
    selectedLabelColor: "#4A4000",
  },
  Guide: {
    bg: "#F5F0FF",
    border: "#9575CD",
    selectedBg: "#EDE0FF",
    labelColor: "#4A007A",
    selectedLabelColor: "#2A0050",
  },
  Boyfriend: {
    bg: "#E8F4FF",
    border: "#5B9BD5",
    selectedBg: "#C9E2F7",
    labelColor: "#003366",
    selectedLabelColor: "#002244",
  },
  Girlfriend: {
    bg: "#FFE8F4",
    border: "#E91E8C",
    selectedBg: "#FFC5E5",
    labelColor: "#1A237E",
    selectedLabelColor: "#0D1257",
  },
  Husband: {
    bg: "#E8EAF6",
    border: "#5C68C0",
    selectedBg: "#C5CAE9",
    labelColor: "#1A237E",
    selectedLabelColor: "#0D1257",
  },
  Wife: {
    bg: "#FCE4EC",
    border: "#E91E63",
    selectedBg: "#F8B8D0",
    labelColor: "#880E4F",
    selectedLabelColor: "#6A0033",
  },
  Custom: {
    bg: "#F5F0F0",
    border: colors.primary,
    selectedBg: "#F0E0D0",
    labelColor: colors.text,
    selectedLabelColor: colors.primaryDarker,
  }
};

const RELIGION_COLORS: Record<string, {
  bg: string;
  border: string;
  activeBg: string;
  labelColor: string;
}> = {
  islamic:   { bg: "#E8F5E9", border: "#66BB6A", activeBg: "#C8E6C9", labelColor: "#003300" },
  hindu:     { bg: "#FFF0F0", border: "#FF9999", activeBg: "#FFD6D6", labelColor: "#5C0000" },
  christian: { bg: "#F3E5F5", border: "#CE93D8", activeBg: "#E1BEE7", labelColor: "#2A005C" },
  buddhist:  { bg: "#EFEBE9", border: "#A1887F", activeBg: "#D7CCC8", labelColor: "#3E1E10" },
  jewish:    { bg: "#E8F4FD", border: "#64B5F6", activeBg: "#BBDEFB", labelColor: "#003366" },
  spiritual: { bg: "#FFFDE7", border: "#C8B560", activeBg: "#FFF176", labelColor: "#5C5000" },
  secular:   { bg: "#FAFAFA", border: "#BDBDBD", activeBg: "#F5F5F5", labelColor: "#333333" },
};

const personalities = [
  { id: "Father",      emoji: "👨", label: "Father"      },
  { id: "Mother",      emoji: "👩", label: "Mother"      },
  { id: "Brother",     emoji: "👦", label: "Brother"     },
  { id: "Sister",      emoji: "👧", label: "Sister"      },
  { id: "Friend",      emoji: "🤝", label: "Friend"      },
  { id: "Best Friend", emoji: "💯", label: "Best Friend" },
  { id: "Mentor",      emoji: "🎓", label: "Mentor"      },
  { id: "Guide",       emoji: "🙏", label: "Guide"       },
  { id: "Husband",     emoji: "💍", label: "Husband"     },
  { id: "Wife",        emoji: "👰", label: "Wife"        },
  { id: "Boyfriend",   emoji: "💙", label: "Boyfriend"   },
  { id: "Girlfriend",  emoji: "🩷", label: "Girlfriend"  },
];

const religions = [
  { id: "spiritual", label: "Spiritual", emoji: "✨" },
  { id: "secular",   label: "Secular",   emoji: "🌿" },
  { id: "islamic",   label: "Islamic",   emoji: "☪️" },
  { id: "hindu",     label: "Hindu",     emoji: "🕉️" },
  { id: "christian", label: "Christian", emoji: "✝️" },
  { id: "buddhist",  label: "Buddhist",  emoji: "☸️" },
  { id: "jewish",    label: "Jewish",    emoji: "✡️" },
];

export default function LobbyScreen() {
  const navigation = useNavigation<LobbyNavProp>();
  const { plan, messagesRemaining, nextRefreshAt } = useToken();
  const isUltimate = plan === 'ultimate';
  const [selected, setSelected] = useState("Father");
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [selectedReligion, setSelectedReligion] = useState("spiritual");

  const secondsLeft = useCountdown(nextRefreshAt);

  const planKey: PlanKey = (plan === 'pro' || plan === 'ultimate') ? plan : 'free';
  const unlockedPersonalities = TIER_UNLOCKS[planKey] ?? TIER_UNLOCKS.free;

  const handlePersonalitySelect = (id: string) => {
    if (!unlockedPersonalities.includes(id)) {
      Alert.alert(
        "Locked 🔒",
        "This personality is not available on your current plan. Upgrade to unlock!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Upgrade ✨", onPress: ()=> navigation.navigate("Paywall") },
        ]
      );
      return;
    }
    setSelected(id);
    if (id === "Guide") {
      setShowReligionModal(true);
    }
  };

  const getReligionLabel = (id: string) => {
    const r = religions.find((item) => item.id === id);
    return r ? r.label : id;
  };

  const handleChat = () => {
    if (selected === "Guide") {
      navigation.navigate("chat", { personality: "Guide", religionSubType: selectedReligion });
    } else {
      navigation.navigate("chat", { personality: selected });
    }
  };

  const getCardColors = (id: string, isSelected: boolean) => {
    if (id === "Guide" && isSelected) {
      const rc = RELIGION_COLORS[selectedReligion] ?? RELIGION_COLORS.General;
      return { bg: rc.activeBg, border: rc.border, labelColor: rc.labelColor };
    }
    const cardColors = PERSONALITY_COLORS[id] ?? PERSONALITY_COLORS.Custom;
    return {
      bg: isSelected ? cardColors.selectedBg : cardColors.bg,
      border: isSelected ? cardColors.border : "transparent",
      labelColor: isSelected ? cardColors.selectedLabelColor : cardColors.labelColor,
    };
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>SafeSpace</Text>
        <Text style={styles.headerSub}>You are not alone 🌿</Text>
      </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.quotaBar}
          onPress={() => navigation.navigate("Paywall")}
          activeOpacity={0.85}
        >
          <Text style={styles.quotaText}>
            💬 {messagesRemaining} {messagesRemaining === 1 ? "message" : "messages"} left
          </Text>
          {nextRefreshAt && (
            <Text style={styles.quotaRefresh}>
              refills in {formatRefreshIn(secondsLeft)}
            </Text>
          )}
          {!isUltimate && <Text style={styles.quotaUpgrade}>Upgrade →</Text>}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Choose Your Companion</Text>
        <Text style={styles.sectionSub}>Who do you want to talk to today?</Text>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >

          {personalities.map((p) => {
            const isSelected = selected === p.id;
            const isLocked = !unlockedPersonalities.includes(p.id);
            const cardColors = getCardColors(p.id, isSelected);

            const cardStyle = { backgroundColor: cardColors.bg, borderColor: cardColors.border };

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.card,
                  cardStyle,
                  isSelected && styles.cardSelected,
                  isLocked && styles.cardLocked,
                ]}
                onPress={() => handlePersonalitySelect(p.id)}
                activeOpacity={0.8}
              >
                {isLocked && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proText}>🔒</Text>
                  </View>
                )}
                <Text style={styles.cardEmoji}>{p.emoji}</Text>
                <Text style={[styles.cardLabel, { color: cardColors.labelColor }]}>
                  {p.label}
                </Text>
                {isSelected && p.id === "Guide" && (
                  <Text style={[styles.religionTag, { color: RELIGION_COLORS[selectedReligion]?.border ?? "#9575CD" }]}>
                    {getReligionLabel(selectedReligion)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleChat} activeOpacity={0.85}>
          <Text style={styles.startButtonText}>
            Start Chat {selected === "Guide" ? `· ${getReligionLabel(selectedReligion)}` : ""}
          </Text>
          <Text style={styles.startArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showReligionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReligionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Select Your Faith</Text>
            <Text style={styles.modalSub}>
              Your Guide will speak with wisdom from your tradition
            </Text>

            <ScrollView style={styles.modalScroll}>
              {religions.map((r) => {
                const isActive = selectedReligion === r.id;
                const rc = RELIGION_COLORS[r.id] ?? RELIGION_COLORS.General;
                const rowStyle = {
                  backgroundColor: isActive ? rc.activeBg : rc.bg,
                  borderWidth: isActive ? 1.5 : 0.5,
                  borderColor: isActive ? rc.border : "#E0D0C0",
                };
                const labelStyle = { color: isActive ? rc.labelColor : colors.text };
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.religionRow, rowStyle]}
                    onPress={() => {
                      setSelectedReligion(r.id);
                      setShowReligionModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.religionEmoji}>{r.emoji}</Text>
                    <Text style={[
                      styles.religionLabel,
                      labelStyle,
                      isActive && styles.religionLabelActive,
                    ]}>
                      {r.label}
                    </Text>
                    {isActive && (
                      <Text style={[styles.checkmark, { color: rc.border }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowReligionModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  headerCopy: { flex: 1 },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  headerSub: { fontSize: 13, color: colors.onPrimaryMuted, marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  settingsIcon: { color: colors.onPrimary, fontSize: 22, fontWeight: "700" },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  quotaBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.onPrimary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  quotaText: { fontSize: 13, fontWeight: "600", color: colors.text },
  quotaRefresh: { fontSize: 12, color: colors.textMuted, flex: 1 },
  quotaUpgrade: { fontSize: 12, fontWeight: "700", color: colors.primary },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  sectionSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 120,
  },
  card: {
    width: "47%",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  cardEmoji: { fontSize: 36, marginBottom: 8 },
  cardSelected: { borderWidth: 2 },
  cardLocked: { opacity: 0.5 },
  cardLabel: { fontSize: 15, fontWeight: "600" },
  religionTag: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  proBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#E8A84A",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proText: { fontSize: 10, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  startArrow: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {  
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,   
    alignItems: "center",
    maxHeight: "80%",
  },
  modalScroll: { width: "100%" },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginBottom: 20 },
  religionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    width: "100%",
  },
  religionEmoji: { fontSize: 20, marginRight: 12 },
  religionLabel: { fontSize: 16, flex: 1, fontWeight: "500" },
  religionLabelActive: { fontWeight: "700" },
  checkmark: { fontSize: 16, fontWeight: "700" },
  modalCancel: { marginTop: 8, padding: 14, width: "100%", alignItems: "center" },
  modalCancelText: { color: colors.primaryDark, fontSize: 15, fontWeight: "600" },
});
