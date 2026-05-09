import React, { useEffect, useState } from "react";
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
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useToken } from "../context/TokenContext";
import { DEVELOPER_TIER } from "../config/developerAccounts";

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
  BestFriend: {
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
  Custom: {
    bg: "#FFFBF0",
    border: "#E8A84A",
    selectedBg: "#FFF3D0",
    labelColor: "#5C3A00",
    selectedLabelColor: "#3D2000",
  },
  BF: {
    bg: "#E8F4FF",
    border: "#5B9BD5",
    selectedBg: "#C9E2F7",
    labelColor: "#003366",
    selectedLabelColor: "#002244",
  },
  GF: {
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
  }
};

const RELIGION_COLORS: Record<string, {
  bg: string;
  border: string;
  activeBg: string;
  labelColor: string;
}> = {
  Hindu:     { bg: "#FFF0F0", border: "#FF9999", activeBg: "#FFD6D6", labelColor: "#5C0000" },
  Muslim:    { bg: "#E8F5E9", border: "#66BB6A", activeBg: "#C8E6C9", labelColor: "#003300" },
  Christian: { bg: "#F3E5F5", border: "#CE93D8", activeBg: "#E1BEE7", labelColor: "#2A005C" },
  Sikh:      { bg: "#FFF3E0", border: "#FFB74D", activeBg: "#FFE0B2", labelColor: "#4A2000" },
  Jain:      { bg: "#FAFAFA", border: "#BDBDBD", activeBg: "#F5F5F5", labelColor: "#333333" },
  Buddhist:  { bg: "#EFEBE9", border: "#A1887F", activeBg: "#D7CCC8", labelColor: "#3E1E10" },
  General:   { bg: "#E8F4FD", border: "#64B5F6", activeBg: "#BBDEFB", labelColor: "#003366" },
};

// ── Tier unlock map ───────────────────────────────────────────────────────────
const TIER_UNLOCKS: Record<string, string[]> = {
  free:     ["Father", "Mother", "Brother", "Sister"],
  pro:      ["Father", "Mother", "Brother", "Sister", "Friend", "BestFriend", "Mentor", "Guide"],
  ultimate: ["Father", "Mother", "Brother", "Sister", "Friend", "BestFriend", "Mentor", "Guide", "BF", "GF", "Husband", "Wife"],
  [DEVELOPER_TIER]: ["Father", "Mother", "Brother", "Sister", "Friend", "BestFriend", "Mentor", "Guide", "BF", "GF", "Husband", "Wife"],
};

const personalities = [
  { id: "Father",     emoji: "👨", label: "Father"      },
  { id: "Mother",     emoji: "👩", label: "Mother"      },
  { id: "Brother",    emoji: "👦", label: "Brother"     },
  { id: "Sister",     emoji: "👧", label: "Sister"      },
  { id: "Friend",     emoji: "🤝", label: "Friend"      },
  { id: "BestFriend", emoji: "💯", label: "Best Friend" },
  { id: "Mentor",     emoji: "🎓", label: "Mentor"      },
  { id: "Guide",      emoji: "🙏", label: "Guide"       },
  { id: "BF",         emoji: "💙", label: "Boyfriend"   },
  { id: "GF",         emoji: "🩷", label: "Girlfriend"  },
  { id: "Husband",    emoji: "💍", label: "Husband"     },
  { id: "Wife",       emoji: "👰", label: "Wife"        },
];

const religions = [
  { id: "Hindu",     label: "Hindu",     emoji: "🕉️" },
  { id: "Muslim",    label: "Muslim",    emoji: "☪️" },
  { id: "Christian", label: "Christian", emoji: "✝️" },
  { id: "Sikh",      label: "Sikh",      emoji: "🪯" },
  { id: "Jain",      label: "Jain",      emoji: "🙏" },
  { id: "Buddhist",  label: "Buddhist",  emoji: "☸️" },
  { id: "General",   label: "General",   emoji: "🌟" },
];

export default function LobbyScreen() {
  const navigation = useNavigation<LobbyNavProp>();
  const { tier } = useToken();
  const [selected, setSelected] = useState("Father");
  const [showReligionModal, setShowReligionModal] = useState(false);
  const [selectedReligion, setSelectedReligion] = useState("General");

  const unlockedPersonalities = TIER_UNLOCKS[tier] ?? TIER_UNLOCKS.free;

  const handlePersonalitySelect = (id: string) => {
    if (!unlockedPersonalities.includes(id)) {
      Alert.alert(
        "Locked 🔒",
        "This personality is not available on your current plan. Upgrade to unlock!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Upgrade ✨", onPress: ()=> navigation.navigate("Paywall") },
          // { text: "Upgrade", onPress: () => navigation.navigate("Paywall") },
        ]
      );
      return;
    }
    setSelected(id);
    if (id === "Guide") {
      setShowReligionModal(true);
    }
  };

  const handleChat = () => {
    const finalPersonality = selected === "Guide"
      ? `Guide_${selectedReligion}`
      : selected;
    navigation.navigate("chat", { personality: finalPersonality });
  };

  const getCardColors = (id: string, isSelected: boolean) => {
    if (id === "Guide" && isSelected) {
      const rc = RELIGION_COLORS[selectedReligion] ?? RELIGION_COLORS.General;
      return { bg: rc.activeBg, border: rc.border, labelColor: rc.labelColor };
    }
    const c = PERSONALITY_COLORS[id] ?? PERSONALITY_COLORS.Custom;
    return {
      bg: isSelected ? c.selectedBg : c.bg,
      border: isSelected ? c.border : "transparent",
      labelColor: isSelected ? c.selectedLabelColor : c.labelColor,
    };
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SafeSpace</Text>
        <Text style={styles.headerSub}>You are not alone 🌿</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Choose Your Companion</Text>
        <Text style={styles.sectionSub}>Who do you want to talk to today?</Text>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >

          {personalities.map((p) => {
            const isSelected = selected === p.id;
            const isLocked = !unlockedPersonalities.includes(p.id);
            const colors = getCardColors(p.id, isSelected);

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    borderWidth: isSelected ? 2 : 1.5,
                    opacity: isLocked ? 0.5 : 1,
                  },
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
                <Text style={[styles.cardLabel, { color: colors.labelColor }]}>
                  {p.label}
                </Text>
                {isSelected && p.id === "Guide" && (
                  <Text style={[styles.religionTag, { color: RELIGION_COLORS[selectedReligion]?.border ?? "#9575CD" }]}>
                    {selectedReligion}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Start Chat Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleChat} activeOpacity={0.85}>
          <Text style={styles.startButtonText}>
            Start Chat {selected === "Guide" ? `· ${selectedReligion}` : ""}
          </Text>
          <Text style={styles.startArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Religion Modal */}
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

            <ScrollView style={{ width: "100%" }}>
              {religions.map((r) => {
                const isActive = selectedReligion === r.id;
                const rc = RELIGION_COLORS[r.id] ?? RELIGION_COLORS.General;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.religionRow,
                      {
                        backgroundColor: isActive ? rc.activeBg : rc.bg,
                        borderWidth: isActive ? 1.5 : 0.5,
                        borderColor: isActive ? rc.border : "#E0D0C0",
                      },
                    ]}
                    onPress={() => {
                      setSelectedReligion(r.id);
                      setShowReligionModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.religionEmoji}>{r.emoji}</Text>
                    <Text style={[
                      styles.religionLabel,
                      { color: isActive ? rc.labelColor : "#3D2000" },
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
  safe: { flex: 1, backgroundColor: "#C8702A" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#C8702A",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF8F0",
    letterSpacing: 0.5,
  },
  headerSub: { fontSize: 13, color: "#F5D9B8", marginTop: 2 },
  content: {
    flex: 1,
    backgroundColor: "#FDF6EC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3D2000",
    textAlign: "center",
  },
  sectionSub: {
    fontSize: 13,
    color: "#B0937A",
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
    backgroundColor: "#FDF6EC",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 50,
    borderTopWidth: 1,
    borderTopColor: "#F0DCC8",
  },
  startButton: {
    backgroundColor: "#C8702A",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
  },
  startButtonText: {
    color: "#FFF8F0",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  startArrow: { color: "#FFF8F0", fontSize: 18, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: "#FDF6EC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    alignItems: "center",
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#3D2000", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#B0937A", textAlign: "center", marginBottom: 20 },
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
  modalCancelText: { color: "#E05C2A", fontSize: 15, fontWeight: "600" },
});
