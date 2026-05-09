import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

type HistoryNavProp = NativeStackNavigationProp<RootStackParamList>;

type Conversation = {
  id: string;
  title: string;
  personality: string;
  lastMessage: string;
  updatedAt: any;
  messageCount: number;
};

const personalityEmoji: Record<string, string> = {
  Father: "👨", Mother: "👩", Brother: "👦", Sister: "👧",
  Friend: "🤝", BestFriend: "💯", Mentor: "🎓",
  Guide_Hindu: "🕉️", Guide_Muslim: "☪️", Guide_Christian: "✝️",
  Guide_Sikh: "🪯", Guide_Jain: "🙏", Guide_Buddhist: "☸️",
  Guide_General: "🌟", BF: "💙", GF: "🩷", Husband: "💍", Wife: "👰",
};

const personalityColor: Record<string, string> = {
  Father: "#007FFF", Mother: "#B39DDB", Brother: "#32CD32", Sister: "#FF69B4",
  Friend: "#FF9F80", BestFriend: "#FFAB8F", Mentor: "#C8B560",
  Guide_Hindu: "#FF9999", Guide_Muslim: "#66BB6A", Guide_Christian: "#CE93D8",
  Guide_Sikh: "#FFB74D", Guide_Jain: "#BDBDBD", Guide_Buddhist: "#A1887F",
  Guide_General: "#64B5F6", BF: "#5B9BD5", GF: "#E91E8C",
  Husband: "#5C6BC0", Wife: "#E91E63",
};

// All personalities for filter pills
const ALL_FILTERS = [
  "All", "Father", "Mother", "Brother", "Sister", "Friend", "BestFriend",
  "Mentor", "BF", "GF", "Husband", "Wife",
  "Guide_Hindu", "Guide_Muslim", "Guide_Christian", "Guide_Sikh",
  "Guide_Jain", "Guide_Buddhist", "Guide_General",
];

const displayLabel = (personality: string) => {
  if (personality.startsWith("Guide_")) return `Guide · ${personality.split("_")[1]}`;
  if (personality === "BestFriend") return "Best Friend";
  if (personality === "BF") return "Boyfriend";
  if (personality === "GF") return "Girlfriend";
  return personality;
};

const formatTime = (timestamp: any): string => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function ConversationHistoryScreen() {
  const navigation = useNavigation<HistoryNavProp>();
  const route = useRoute<any>();
  const filterPersonality: string | undefined = route.params?.filterPersonality;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>(filterPersonality ?? "All");

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const unsubscribe = firestore()
      .collection("users")
      .doc(uid)
      .collection("conversations")
      .orderBy("updatedAt", "desc")
      .onSnapshot(
        (snapshot) => {
          setConversations(
            snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title ?? "Chat",
                personality: data.personality ?? "Father",
                lastMessage: data.lastMessage ?? "",
                updatedAt: data.updatedAt,
                messageCount: data.messageCount ?? 0,
              };
            })
          );
          setLoading(false);
        },
        (error) => {
          console.log("history screen error:", error.message);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const filtered = activeFilter === "All"
    ? conversations
    : conversations.filter((c) => c.personality === activeFilter);

  const handleOpen = (conversation: Conversation) => {
    navigation.navigate("chat", {
      personality: conversation.personality,
      conversationId: conversation.id,
    });
  };

  const handleDelete = useCallback((conversation: Conversation) => {
    Alert.alert(
      "Delete Conversation",
      `Delete your chat with ${displayLabel(conversation.personality)}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const uid = auth().currentUser?.uid;
            if (!uid) return;
            try {
              // Delete all messages in the subcollection first
              const messagesRef = firestore()
                .collection("users")
                .doc(uid)
                .collection("conversations")
                .doc(conversation.id)
                .collection("messages");

              const messagesSnap = await messagesRef.get();
              const batch = firestore().batch();
              messagesSnap.docs.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();

              // Then delete the conversation document
              await firestore()
                .collection("users")
                .doc(uid)
                .collection("conversations")
                .doc(conversation.id)
                .delete();
            } catch (error: any) {
              console.log("delete error:", error.message);
              Alert.alert("Error", "Could not delete conversation. Please try again.");
            }
          },
        },
      ]
    );
  }, []);

  const renderConversation = ({ item }: { item: Conversation }) => {
    const color = personalityColor[item.personality] ?? "#C8702A";
    const emoji = personalityEmoji[item.personality] ?? "💬";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpen(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.82}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: color + "22" }]}>
          <Text style={styles.avatarEmoji}>{emoji}</Text>
          <View style={[styles.avatarDot, { backgroundColor: color }]} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardTime}>{formatTime(item.updatedAt)}</Text>
          </View>
          <View style={styles.cardBottom}>
            <Text style={[styles.cardPersonality, { color }]}>
              {displayLabel(item.personality)}
            </Text>
            <Text style={styles.cardDot}>·</Text>
            <Text style={styles.cardPreview} numberOfLines={1}>{item.lastMessage}</Text>
          </View>
        </View>

        {/* Arrow */}
        <Text style={styles.cardArrow}>›</Text>
      </TouchableOpacity>
    );
  };

  const renderFilterPill = (filter: string) => {
    const isActive = activeFilter === filter;
    const color = filter === "All" ? "#C8702A" : (personalityColor[filter] ?? "#C8702A");
    const emoji = filter === "All" ? "💬" : (personalityEmoji[filter] ?? "💬");
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.pill,
          isActive
            ? { backgroundColor: color, borderColor: color }
            : { backgroundColor: "#FFF8F0", borderColor: "#E8D0B8" },
        ]}
        onPress={() => setActiveFilter(filter)}
        activeOpacity={0.8}
      >
        <Text style={styles.pillEmoji}>{filter === "All" ? "" : emoji}</Text>
        <Text style={[styles.pillText, { color: isActive ? "#FFF" : "#7A5000" }]}>
          {filter === "All" ? "All" : displayLabel(filter)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Conversations</Text>
          <Text style={styles.headerSub}>
            {filtered.length} {filtered.length === 1 ? "chat" : "chats"}
            {activeFilter !== "All" ? ` with ${displayLabel(activeFilter)}` : " total"}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.pillsWrapper}>
        <FlatList
          data={ALL_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderFilterPill(item)}
          contentContainerStyle={styles.pillsRow}
        />
      </View>

      {/* List */}
      <View style={styles.listWrapper}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#C8702A" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySub}>
              {activeFilter === "All"
                ? "Start a chat from the home screen"
                : `No chats with ${displayLabel(activeFilter)} yet`}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate("Lobby")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Start a Chat →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderConversation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Long press hint */}
      {filtered.length > 0 && (
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>Long press a chat to delete it</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#C8702A" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#C8702A",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: { color: "#FFF8F0", fontSize: 20, fontWeight: "700" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF8F0",
    letterSpacing: 0.3,
  },
  headerSub: { fontSize: 12, color: "#F5D9B8", marginTop: 2 },

  pillsWrapper: {
    backgroundColor: "#FDF6EC",
    paddingTop: 14,
  },
  pillsRow: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
    flexDirection: "row",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
    marginRight: 8,
  },
  pillEmoji: { fontSize: 13 },
  pillText: { fontSize: 13, fontWeight: "600" },

  listWrapper: {
    flex: 1,
    backgroundColor: "#FDF6EC",
  },
  listContent: {
    padding: 16,
    paddingBottom: 60,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F0DCC8",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarEmoji: { fontSize: 24 },
  avatarDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#FFF8F0",
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3D2000",
    flex: 1,
    marginRight: 8,
  },
  cardTime: { fontSize: 11, color: "#B0937A" },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardPersonality: { fontSize: 12, fontWeight: "600" },
  cardDot: { fontSize: 12, color: "#C0A080" },
  cardPreview: { fontSize: 12, color: "#9E7C63", flex: 1 },
  cardArrow: { fontSize: 22, color: "#C8702A", fontWeight: "700" },

  separator: { height: 8 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2000",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#9E7C63",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: "#C8702A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: { color: "#FFF8F0", fontWeight: "700", fontSize: 14 },

  hintBar: {
    backgroundColor: "#FDF6EC",
    borderTopWidth: 1,
    borderTopColor: "#F0DCC8",
    paddingVertical: 8,
    alignItems: "center",
  },
  hintText: { fontSize: 11, color: "#B0937A" },
});