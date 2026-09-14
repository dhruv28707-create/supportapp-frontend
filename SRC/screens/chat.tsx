import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { useToken } from "../context/TokenContext";
import { CRISIS_HELPLINES } from "../constants";
import { apiFetch } from "../api/client";
import { useCountdown, formatCountdown, formatRefreshIn } from "../hooks/useCountdown";
import { colors } from "../theme";

type ChatNavProp = NativeStackNavigationProp<RootStackParamList>;

const PERSONALITY_THEME: Record<string, {
  headerBg: string;
  headerText: string;
  headerSub: string;
  safeBg: string;
  aiBubbleBg: string;
  aiBubbleText: string;
  avatarBg: string;
  inputBorder: string;
  sendBtn: string;
  typingColor: string;
}> = {
  Father: {
    headerBg: "#007FFF",
    headerText: "#FFFFFF",
    headerSub: "#C5DEFA",
    safeBg: "#007FFF",
    aiBubbleBg: "#E0EFFF",
    aiBubbleText: "#002244",
    avatarBg: "#6CA6D9",
    inputBorder: "#6CA6D9",
    sendBtn: "#007FFF",
    typingColor: "#4A7FAA",
  },
  Mother: {
    headerBg: "#B39DDB",
    headerText: "#FFFFFF",
    headerSub: "#EDE7F6",
    safeBg: "#B39DDB",
    aiBubbleBg: "#EDE7F6",
    aiBubbleText: "#2A0050",
    avatarBg: "#C8A2C8",
    inputBorder: "#B39DDB",
    sendBtn: "#9575CD",
    typingColor: "#7B5EA7",
  },
  Brother: {
    headerBg: "#32CD32",
    headerText: "#003300",
    headerSub: "#C8E6C9",
    safeBg: "#32CD32",
    aiBubbleBg: "#E8F5E9",
    aiBubbleText: "#003300",
    avatarBg: "#66BB6A",
    inputBorder: "#66BB6A",
    sendBtn: "#2E7D32",
    typingColor: "#388E3C",
  },
  Sister: {
    headerBg: "#FF69B4",
    headerText: "#FFFFFF",
    headerSub: "#FFE4EE",
    safeBg: "#FF69B4",
    aiBubbleBg: "#FFE4EE",
    aiBubbleText: "#5C001A",
    avatarBg: "#FF9BBF",
    inputBorder: "#FF69B4",
    sendBtn: "#C71585",
    typingColor: "#AD1457",
  },
  Friend: {
    headerBg: "#FF9F80",
    headerText: "#5C1A00",
    headerSub: "#FFF0E6",
    safeBg: "#FF9F80",
    aiBubbleBg: "#FFF0E6",
    aiBubbleText: "#5C1A00",
    avatarBg: "#FBCEB1",
    inputBorder: "#FF9F80",
    sendBtn: "#E2703A",
    typingColor: "#B54A1A",
  },
  "Best Friend": {
    headerBg: "#FFAB8F",
    headerText: "#5C2200",
    headerSub: "#FFF3EC",
    safeBg: "#FFAB8F",
    aiBubbleBg: "#FFF3EC",
    aiBubbleText: "#5C2200",
    avatarBg: "#FFDAB9",
    inputBorder: "#FFAB8F",
    sendBtn: "#E07050",
    typingColor: "#A04830",
  },
  Mentor: {
    headerBg: "#C8B560",
    headerText: "#4A4000",
    headerSub: "#FFFDE7",
    safeBg: "#C8B560",
    aiBubbleBg: "#FFFDE7",
    aiBubbleText: "#4A4000",
    avatarBg: "#FFF176",
    inputBorder: "#C8B560",
    sendBtn: "#A08F20",
    typingColor: "#7A6A10",
  },
  Guide: {
    headerBg: "#F5F0FF",
    headerText: "#4A007A",
    headerSub: "#EDE0FF",
    safeBg: "#F5F0FF",
    aiBubbleBg: "#EDE0FF",
    aiBubbleText: "#2A0050",
    avatarBg: "#9575CD",
    inputBorder: "#9575CD",
    sendBtn: "#7B1FA2",
    typingColor: "#4A007A",
  },
  Guide_islamic: {
    headerBg: "#66BB6A",
    headerText: "#003300",
    headerSub: "#E8F5E9",
    safeBg: "#66BB6A",
    aiBubbleBg: "#E8F5E9",
    aiBubbleText: "#003300",
    avatarBg: "#A5D6A7",
    inputBorder: "#66BB6A",
    sendBtn: "#2E7D32",
    typingColor: "#388E3C",
  },
  Guide_hindu: {
    headerBg: "#FF9999",
    headerText: "#5C0000",
    headerSub: "#FFF0F0",
    safeBg: "#FF9999",
    aiBubbleBg: "#FFF0F0",
    aiBubbleText: "#5C0000",
    avatarBg: "#FFCCCC",
    inputBorder: "#FF9999",
    sendBtn: "#CC4444",
    typingColor: "#993333",
  },
  Guide_christian: {
    headerBg: "#CE93D8",
    headerText: "#2A005C",
    headerSub: "#F3E5F5",
    safeBg: "#CE93D8",
    aiBubbleBg: "#F3E5F5",
    aiBubbleText: "#2A005C",
    avatarBg: "#E1BEE7",
    inputBorder: "#CE93D8",
    sendBtn: "#7B1FA2",
    typingColor: "#6A1B9A",
  },
  Guide_buddhist: {
    headerBg: "#A1887F",
    headerText: "#FFFFFF",
    headerSub: "#EFEBE9",
    safeBg: "#A1887F",
    aiBubbleBg: "#EFEBE9",
    aiBubbleText: "#3E1E10",
    avatarBg: "#D7CCC8",
    inputBorder: "#A1887F",
    sendBtn: "#6D4C41",
    typingColor: "#5D4037",
  },
  Guide_jewish: {
    headerBg: "#64B5F6",
    headerText: "#003366",
    headerSub: "#E8F4FD",
    safeBg: "#64B5F6",
    aiBubbleBg: "#E8F4FD",
    aiBubbleText: "#003366",
    avatarBg: "#BBDEFB",
    inputBorder: "#64B5F6",
    sendBtn: "#1565C0",
    typingColor: "#0D47A1",
  },
  Guide_spiritual: {
    headerBg: "#FFFDE7",
    headerText: "#5C5000",
    headerSub: "#FFF9C4",
    safeBg: "#FFFDE7",
    aiBubbleBg: "#FFF9C4",
    aiBubbleText: "#4A4000",
    avatarBg: "#FFF176",
    inputBorder: "#C8B560",
    sendBtn: "#A08F20",
    typingColor: "#7A6A10",
  },
  Guide_secular: {
    headerBg: "#E0E0E0",
    headerText: "#333333",
    headerSub: "#F5F5F5",
    safeBg: "#E0E0E0",
    aiBubbleBg: "#FAFAFA",
    aiBubbleText: "#333333",
    avatarBg: "#F5F5F5",
    inputBorder: "#BDBDBD",
    sendBtn: "#757575",
    typingColor: "#616161",
  },
  Boyfriend: {
    headerBg: "#5B9BD5",
    headerText: "#FFFFFF",
    headerSub: "#C9E2F7",
    safeBg: "#5B9BD5",
    aiBubbleBg: "#E8F4FF",
    aiBubbleText: "#002244",
    avatarBg: "#89C4F4",
    inputBorder: "#5B9BD5",
    sendBtn: "#2E75B6",
    typingColor: "#3A6EA5",
  },
  Girlfriend: {
    headerBg: "#E91E8C",
    headerText: "#FFFFFF",
    headerSub: "#FFE8F4",
    safeBg: "#E91E8C",
    aiBubbleBg: "#FFE8F4",
    aiBubbleText: "#7A0045",
    avatarBg: "#F48CB8",
    inputBorder: "#E91E8C",
    sendBtn: "#C2185B",
    typingColor: "#AD1457",
  },
  Husband: {
    headerBg: "#5C6BC0",
    headerText: "#FFFFFF",
    headerSub: "#E8EAF6",
    safeBg: "#5C6BC0",
    aiBubbleBg: "#E8EAF6",
    aiBubbleText: "#1A237E",
    avatarBg: "#9FA8DA",
    inputBorder: "#5C6BC0",
    sendBtn: "#3949AB",
    typingColor: "#3F51B5",
  },
  Wife: {
    headerBg: "#E91E63",
    headerText: "#FFFFFF",
    headerSub: "#FCE4EC",
    safeBg: "#E91E63",
    aiBubbleBg: "#FCE4EC",
    aiBubbleText: "#880E4F",
    avatarBg: "#F48FB1",
    inputBorder: "#E91E63",
    sendBtn: "#C2185B",
    typingColor: "#AD1457",
  },
};

const DEFAULT_THEME = {
  headerBg: colors.primary,
  headerText: colors.onPrimary,
  headerSub: colors.onPrimaryMuted,
  safeBg: colors.primary,
  aiBubbleBg: "#FFFFFF",
  aiBubbleText: colors.text,
  avatarBg: colors.onPrimaryMuted,
  inputBorder: colors.borderStrong,
  sendBtn: colors.primary,
  typingColor: colors.textMuted,
};

const welcomeMessages: Record<string, string> = {
  Father: "Beta, I'm here. Tell me what's on your mind.",
  Mother: "Mera bacha, I'm here. Tell me everything, I'm listening.",
  Brother: "Aye yaar, kya hua? Bata mujhe.",
  Sister: "Arrey, kya chal raha hai? Talk to me!",
  Friend: "Hey! What's going on? I'm all ears.",
  "Best Friend": "Hey, I'm here. What's going on?",
  Mentor: "I'm here. Tell me what's on your mind — let's figure it out together.",
  Guide: "I am here to guide you. What is on your mind?",
  Guide_islamic: "Assalamu Alaikum. What troubles you today?",
  Guide_hindu: "Take a breath. What weighs upon your heart today?",
  Guide_christian: "God's peace be with you. What's on your heart?",
  Guide_buddhist: "Breathe. Be present. What brings you here today?",
  Guide_jewish: "Shalom. What is on your mind today?",
  Guide_spiritual: "Welcome. Let us find peace and understanding together.",
  Guide_secular: "Welcome. I'm here to listen and help you process your thoughts.",
  Boyfriend: "Hey babe, I'm here. What's going on?",
  Girlfriend: "Hey baby, I'm here. Talk to me, what's wrong?",
  Husband: "I'm here jaan. Tell me everything, what's on your mind?",
  Wife: "I'm here sweetheart. Talk to me, what's going on?",
};

const personalityEmoji: Record<string, string> = {
  Father: "👨",
  Mother: "👩",
  Brother: "👦",
  Sister: "👧",
  Friend: "🤝",
  "Best Friend": "💯",
  Mentor: "🎓",
  Guide: "🙏",
  Guide_islamic: "☪️",
  Guide_hindu: "🕉️",
  Guide_christian: "✝️",
  Guide_buddhist: "☸️",
  Guide_jewish: "✡️",
  Guide_spiritual: "✨",
  Guide_secular: "🌿",
  Boyfriend: "💙",
  Girlfriend: "🩷",
  Husband: "💍",
  Wife: "👰",
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  personality?: string;
  religionSubType?: string | null;
};

const conversationsRef = (uid: string) =>
  firestore().collection("users").doc(uid).collection("conversations");
const conversationRef = (uid: string, id: string) => conversationsRef(uid).doc(id);
const conversationMessagesRef = (uid: string, id: string) =>
  conversationRef(uid, id).collection("messages");

const makeMessageId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<ChatNavProp>();

  const rawPersonalityParam = route.params?.personality ?? "Friend";
  const rawReligionSubTypeParam = route.params?.religionSubType;
  const initialConversationId = route.params?.conversationId;

  const isLegacyGuide = typeof rawPersonalityParam === "string" && rawPersonalityParam.startsWith("Guide_");
  const personality = isLegacyGuide ? "Guide" : rawPersonalityParam;
  const religionSubType = isLegacyGuide
    ? rawPersonalityParam.split("_")[1]
    : rawReligionSubTypeParam;

  const themeKey = personality === "Guide" && religionSubType ? `Guide_${religionSubType}` : personality;
  const theme = PERSONALITY_THEME[themeKey] ?? DEFAULT_THEME;

  const { refreshPlan, isLimitReached, messagesRemaining, nextRefreshAt, plan } = useToken();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  // 429 Limit signal
  const [limitSignal, setLimitSignal] = useState<{ hit: boolean; refreshAt: number | string | null }>({
    hit: false,
    refreshAt: null,
  });

  // 503 Service error signal with retry
  const [serviceError, setServiceError] = useState<{ hit: boolean; message?: string } | null>(null);

  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

  const displayName = personality === "Guide" && religionSubType
    ? `Guide · ${religionSubType.charAt(0).toUpperCase() + religionSubType.slice(1)}`
    : personality;

  const buildConversationTitle = (text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return `${displayName} chat`;
    return cleanText.length > 48 ? `${cleanText.slice(0, 48)}...` : cleanText;
  };

  const ensureConversation = async (uid: string, firstMessage: string) => {
    if (conversationId) return conversationId;
    const newConversationRef = conversationsRef(uid).doc();
    const storedPersonality = personality === "Guide" && religionSubType ? `Guide_${religionSubType}` : personality;
    await newConversationRef.set({
      title: buildConversationTitle(firstMessage),
      personality: storedPersonality,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      lastMessage: firstMessage,
      messageCount: 0,
    });
    setConversationId(newConversationRef.id);
    return newConversationRef.id;
  };

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const welcomeKey = themeKey;
    const welcome: Message = {
      id: makeMessageId(),
      text: welcomeMessages[welcomeKey] ?? welcomeMessages[personality] ?? welcomeMessages.Friend,
      sender: "ai",
      personality,
      religionSubType,
    };
    setMessages([welcome]);
    setConversationId(initialConversationId);
  }, [initialConversationId, personality, themeKey, religionSubType]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    const welcomeKey = themeKey;
    const welcome: Message = {
      id: makeMessageId(),
      text: welcomeMessages[welcomeKey] ?? welcomeMessages[personality] ?? welcomeMessages.Friend,
      sender: "ai",
      personality,
      religionSubType,
    };
    let unsubscribeHistory: undefined | (() => void);

    if (uid) {
      firestore()
        .collection("users")
        .doc(uid)
        .get()
        .then((doc) => {
          if (doc.exists()) setUserProfile(doc.data());
        });

      if (conversationId) {
        unsubscribeHistory = conversationMessagesRef(uid, conversationId)
          .orderBy("createdAt", "asc")
          .onSnapshot(
            (snapshot) => {
              const savedMessages = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  text: (data.text ?? "").replace(/\\r\\n|\\n|\r\n/g, "\n"),
                  sender: data.sender === "user" ? "user" : "ai",
                  personality: data.personality || personality,
                  religionSubType: data.religionSubType || religionSubType,
                } as Message;
              });
              setMessages((prev) =>
                savedMessages.length > 0 ? savedMessages : prev.length > 0 ? prev : [welcome]
              );
            },
            (error) => {
              console.log("conversation listener error:", error.message);
              setMessages((prev) => (prev.length > 0 ? prev : [welcome]));
            }
          );
      }
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      clearTimeout(timer);
      unsubscribeHistory?.();
    };
  }, [conversationId, personality, themeKey, religionSubType]);

  const crisisPhrases = [
    "want to die", "kill myself", "end my life", "suicide",
    "don't want to live", "no reason to live", "better off dead",
    "harm myself", "hurt myself", "can't go on", "give up on life",
  ] as const;

  /**
   * Simple crisis-signal heuristic. It is intentionally broad so we err on the
   * side of showing help. It is client-only and only controls the in-app crisis
   * popup — the backend is the source of truth for any serious safeguards.
   */
  const isCrisisMessage = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return crisisPhrases.some((phrase) => lower.includes(phrase));
  };

  const showCrisisSupport = () => {
    const userName = userProfile?.firstName ?? "friend";
    const emergencyContact = userProfile?.emergencyContact;

    const buttons: any[] = [
      {
        text: `Call ${CRISIS_HELPLINES.iCall.label}`,
        onPress: () => Linking.openURL(`tel:${CRISIS_HELPLINES.iCall.number}`),
      },
      {
        text: `Call ${CRISIS_HELPLINES.vandrevala.label}`,
        onPress: () => Linking.openURL(`tel:${CRISIS_HELPLINES.vandrevala.number}`),
      },
    ];

    if (emergencyContact) {
      const dialNumber = String(emergencyContact).replace(/\D/g, "");
      buttons.push({
        text: `📞 Call ${emergencyContact}`,
        onPress: () => Linking.openURL(`tel:${dialNumber}`),
      });
    }

    buttons.push({ text: "Continue Talking", style: "cancel" });

    Alert.alert(
      "You're Not Alone",
      `${userName}, it sounds like you're going through something really painful. Please reach out right now — you matter.\n\niCall: ${CRISIS_HELPLINES.iCall.number}\n(${CRISIS_HELPLINES.iCall.availability})\n\nVandrevala Foundation: ${CRISIS_HELPLINES.vandrevala.number}\n(${CRISIS_HELPLINES.vandrevala.availability})\n\nAASRA: ${CRISIS_HELPLINES.aasra.number}\n(${CRISIS_HELPLINES.aasra.availability})${emergencyContact ? `\n\nYour Emergency Contact: ${emergencyContact}` : ""}`,
      buttons
    );
  };

  const executeSend = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const currentInput = messageText.trim();
    setServiceError(null);

    if (isCrisisMessage(currentInput)) showCrisisSupport();

    if (isLimitReached || limitSignal.hit) {
      await refreshPlan();
      return;
    }

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    const userMessage: Message = {
      id: makeMessageId(),
      text: currentInput,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const activeConversationId = await ensureConversation(uid, currentInput);
      const storedPersonality = personality === "Guide" && religionSubType ? `Guide_${religionSubType}` : personality;

      try {
        await conversationMessagesRef(uid, activeConversationId).doc(userMessage.id).set({
          text: userMessage.text,
          sender: userMessage.sender,
          personality: storedPersonality,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await conversationRef(uid, activeConversationId).set(
          {
            personality: storedPersonality,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            lastMessage: currentInput,
            messageCount: firestore.FieldValue.increment(1),
          },
          { merge: true }
        );
      } catch (writeError: any) {
        console.warn("save user message error:", writeError.message);
      }

      // Backend request payload matching contract exactly
      const requestBody: { message: string; personality?: string; religionSubType?: string } = {
        message: currentInput,
        personality: personality,
      };
      if (personality === "Guide" && religionSubType) {
        requestBody.religionSubType = religionSubType;
      }

      const response = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      if (response.status === 429 || response.status === 402) {
        let quotaData: any = {};
        try {
          quotaData = await response.json();
        } catch {}
        setLimitSignal({ hit: true, refreshAt: quotaData.nextRefreshAt ?? null });
        await refreshPlan();
        setLoading(false);
        return;
      }

      if (response.status === 503) {
        // Service unavailable — quota NOT consumed. Show error banner with retry button.
        setServiceError({ hit: true, message: currentInput });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Backend request failed");
      }

      const rawContent = data.reply || data.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("Invalid AI response");
      }

      const aiText = rawContent.replace(/\\r\\n|\\n|\r\n/g, "\n");
      const echoedPersonality = data.personality || personality;

      const aiReply: Message = {
        id: makeMessageId(),
        text: aiText,
        sender: "ai",
        personality: echoedPersonality,
        religionSubType: data.religionSubType || religionSubType,
      };

      try {
        await conversationMessagesRef(uid, activeConversationId).doc(aiReply.id).set({
          text: aiReply.text,
          sender: aiReply.sender,
          personality: echoedPersonality,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        await conversationRef(uid, activeConversationId).set(
          {
            updatedAt: firestore.FieldValue.serverTimestamp(),
            lastMessage: aiReply.text,
            messageCount: firestore.FieldValue.increment(1),
          },
          { merge: true }
        );
      } catch (writeError: any) {
        console.warn("save ai message error:", writeError.message);
      }

      setMessages((prev) =>
        prev.some((m) => m.id === aiReply.id) ? prev : [...prev, aiReply]
      );

      await refreshPlan();

    } catch (error: any) {
      console.log("handleSend error:", error.message);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== userMessage.id),
        {
          id: (Date.now() + 1).toString(),
          text: "Sorry, I couldn't respond right now. Please try again.",
          sender: "ai",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => executeSend(input);

  const sendButtonStyle = { backgroundColor: loading ? colors.borderStrong : theme.sendBtn };

  const limitReached = isLimitReached || limitSignal.hit;
  const countdownTarget = limitSignal.refreshAt ?? nextRefreshAt;
  const secondsLeft = useCountdown(countdownTarget);

  const clearedExpiredSignal = useRef(false);
  useEffect(() => {
    if (limitReached && secondsLeft === 0 && !clearedExpiredSignal.current) {
      clearedExpiredSignal.current = true;
      setLimitSignal({ hit: false, refreshAt: null });
      refreshPlan();
    } else if (secondsLeft > 0) {
      clearedExpiredSignal.current = false;
    }
  }, [limitReached, secondsLeft, refreshPlan]);

  const renderMessage = ({ item }: { item: Message }) => {
    const itemPersona = item.personality || personality;
    const itemEmoji = personalityEmoji[itemPersona] || personalityEmoji[themeKey] || "💬";

    return (
      <View
        style={[
          styles.bubbleWrapper,
          item.sender === "user" ? styles.userWrapper : styles.aiWrapper,
        ]}
      >
        {item.sender === "ai" && (
          <View style={[styles.avatarCircle, { backgroundColor: theme.avatarBg }]}>
            <Text style={styles.avatarEmoji}>{itemEmoji}</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            item.sender === "user"
              ? [styles.userBubble, { backgroundColor: theme.sendBtn }]
              : [styles.aiBubble, { backgroundColor: theme.aiBubbleBg }],
          ]}
        >
          {item.sender === "ai" && (
            <Text style={[styles.echoedTag, { color: theme.typingColor }]}>
              {itemPersona}
            </Text>
          )}
          <Text
            style={[
              styles.messageText,
              item.sender === "user"
                ? styles.userText
                : { color: theme.aiBubbleText },
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.safeBg }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerBackIcon, { color: theme.headerText }]}>⬅️</Text>
        </TouchableOpacity>

        <Text style={styles.headerEmoji}>{personalityEmoji[themeKey] ?? personalityEmoji[personality] ?? "💬"}</Text>

        <View style={styles.headerMiddle}>
          <Text style={[styles.headerTitle, { color: theme.headerText }]}>{displayName}</Text>
          <Text style={[styles.headerSub, { color: theme.headerSub }]}>Here for you</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("ConversationHistory", { filterPersonality: personality })}
          style={styles.historyBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.historyBtnIcon}>📋</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.inner, { marginBottom: keyboardHeight }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatArea}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color={theme.sendBtn} />
            <Text style={[styles.typingText, { color: theme.typingColor }]}>
              {displayName} is typing...
            </Text>
          </View>
        )}

        {serviceError?.hit && (
          <View style={[styles.limitBanner, { borderColor: "#E53E3E", backgroundColor: "#FFF5F5" }]}>
            <View style={styles.limitBannerRow}>
              <Text style={styles.limitEmoji}>⚠️</Text>
              <View style={styles.limitBannerCopy}>
                <Text style={[styles.limitTitle, { color: "#C53030" }]}>
                  AI Service Unavailable (503)
                </Text>
                <Text style={{ fontSize: 12, color: "#9B2C2C" }}>
                  Temporary error. Quota was NOT consumed.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: theme.sendBtn }]}
              onPress={() => {
                const retryMsg = serviceError.message;
                setServiceError(null);
                if (retryMsg) executeSend(retryMsg);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: theme.headerText }]}>Retry ↺</Text>
            </TouchableOpacity>
          </View>
        )}

        {limitReached ? (
          <View style={[styles.limitBanner, { borderColor: theme.inputBorder }]}>
            <View style={styles.limitBannerRow}>
              <Text style={[styles.limitEmoji, { color: theme.typingColor }]}>💛</Text>
              <View style={styles.limitBannerCopy}>
                <Text style={[styles.limitTitle, { color: theme.typingColor }]}>
                  Message limit reached
                </Text>
                <Text style={[styles.limitCountdown, { color: theme.typingColor }]}>
                  New messages in{" "}
                  <Text style={[styles.limitCountdownBold, { color: theme.typingColor }]}>
                    {countdownTarget ? formatCountdown(secondsLeft) : "--:--:--"}
                  </Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: theme.sendBtn }]}
              onPress={() => navigation.navigate("Paywall")}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: theme.headerText }]}>Upgrade ✨</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.quotaBar, { borderColor: theme.inputBorder }]}
            onPress={() => navigation.navigate("Paywall")}
            activeOpacity={0.85}
          >
            <Text style={[styles.quotaText, { color: theme.typingColor }]}>
              💬 {messagesRemaining} {messagesRemaining === 1 ? "message" : "messages"} left
            </Text>
            {countdownTarget && (
              <Text style={[styles.quotaRefresh, { color: theme.typingColor }]}>
                refills in {formatRefreshIn(secondsLeft)}
              </Text>
            )}
            {plan !== 'ultimate' && (
              <Text style={[styles.quotaUpgrade, { color: theme.sendBtn }]}>Upgrade →</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { borderColor: theme.inputBorder }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, sendButtonStyle]}
            onPress={handleSend}
            disabled={loading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  headerEmoji: { fontSize: 32 },
  headerMiddle: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  headerBackIcon: { fontSize: 18, fontWeight: "700" },
  historyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  historyBtnIcon: { fontSize: 16 },
  inner: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  chatArea: { padding: 16, paddingBottom: 8 },
  bubbleWrapper: { flexDirection: "row", marginVertical: 4, alignItems: "flex-end" },
  aiWrapper: { justifyContent: "flex-start" },
  userWrapper: { justifyContent: "flex-end" },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  avatarEmoji: { fontSize: 16 },
  bubble: { maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  aiBubble: { borderBottomLeftRadius: 4, elevation: 2 },
  userBubble: { borderBottomRightRadius: 4 },
  echoedTag: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: colors.onPrimary },
  typingContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 6 },
  typingText: { marginLeft: 8, fontSize: 13, fontStyle: "italic" },
  quotaBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: colors.onPrimary,
    borderWidth: 1,
    gap: 8,
  },
  quotaText: { fontSize: 13, fontWeight: "600" },
  quotaRefresh: { fontSize: 12, flex: 1 },
  quotaUpgrade: { fontSize: 12, fontWeight: "700" },
  limitBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.onPrimary,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  limitBannerRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  limitEmoji: { fontSize: 22 },
  limitBannerCopy: { flex: 1 },
  limitTitle: { fontSize: 14, fontWeight: "700" },
  limitCountdown: { fontSize: 13, marginTop: 2 },
  limitCountdownBold: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  upgradeBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  upgradeBtnText: { fontSize: 13, fontWeight: "700" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 50,
    backgroundColor: colors.onPrimary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1.5,
  },
  sendButton: { marginLeft: 8, borderRadius: 22, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  sendIcon: { color: colors.onPrimary, fontSize: 18, fontWeight: "bold" },
});
