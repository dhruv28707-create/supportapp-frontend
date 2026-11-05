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
import { CRISIS_HELPLINES, isStrangerPersonality, VALID_PERSONALITIES, VALID_RELIGIONS } from "../constants";
import { sendChatMessage } from "../api/client";
import { useCountdown, formatCountdown, useOnlineStatus } from "../hooks/useCountdown";
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
  Stranger: {
    headerBg: "#455A64",
    headerText: "#FFFFFF",
    headerSub: "#CFD8DC",
    safeBg: "#455A64",
    aiBubbleBg: "#ECEFF1",
    aiBubbleText: "#263238",
    avatarBg: "#78909C",
    inputBorder: "#78909C",
    sendBtn: "#455A64",
    typingColor: "#546E7A",
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
  Stranger: "Hey — I'm just a stranger passing by. What's on your mind? Nothing you say here is kept.",
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
  Stranger: "🎭",
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
  personality?: string;
  religionSubType?: string | null;
  /** True only for a user turn or a completed assistant reply. */
  isConversationMessage?: boolean;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const conversationsRef = (uid: string) =>
  firestore().collection("users").doc(uid).collection("conversations");
const conversationRef = (uid: string, id: string) => conversationsRef(uid).doc(id);
const conversationMessagesRef = (uid: string, id: string) =>
  conversationRef(uid, id).collection("messages");

const makeMessageId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;

// History budget is server-enforced (Issue 5): <= 16 turns, <= 500 chars per
// turn, <= 4000 chars total. We send ~6-10 short recent turns and truncate
// our OWN transcript client-side; the server silently drops anything over.
const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_TURN_CHARS = 500;
const MAX_HISTORY_TOTAL_CHARS = 4000;
// ONE in-flight chat request per user, ever (Issue 2). Module-scoped so two
// mounted ChatScreen instances cannot parallel-send and burn the per-uid
// 30/5min abuse budget.

const normalizePersonality = (value: unknown): string => {
  if (typeof value === "string" && (VALID_PERSONALITIES as readonly string[]).includes(value)) {
    return value;
  }
  return "Friend";
};

const normalizeReligion = (value: unknown): string | undefined => {
  if (typeof value === "string" && (VALID_RELIGIONS as readonly string[]).includes(value)) {
    return value;
  }
  return undefined;
};

const normalizeNewlines = (text: string): string =>
  text.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n/g, "\n");

const getChatHistory = (messages: Message[]): ChatHistoryMessage[] => {
  const seenIds = new Set<string>();
  const candidate = messages
    .filter((message) => {
      if (!message.isConversationMessage || !message.text.trim() || seenIds.has(message.id)) {
        return false;
      }
      seenIds.add(message.id);
      // Only user/assistant roles are allowlisted server-side.
      return true;
    })
    .slice(-MAX_HISTORY_TURNS)
    .map((message) => ({
      role: message.sender === "user" ? "user" : "assistant",
      content: message.text.trim().slice(0, MAX_HISTORY_TURN_CHARS),
    })) as ChatHistoryMessage[];

  // Keep only the most recent turns that fit the 4000-char total budget.
  let total = 0;
  let start = candidate.length;
  while (start > 0 && total + candidate[start - 1].content.length <= MAX_HISTORY_TOTAL_CHARS) {
    total += candidate[start - 1].content.length;
    start -= 1;
  }
  return candidate.slice(start);
};

const withoutRetriedMessage = (messages: Message[], text: string): Message[] => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.isConversationMessage && message.sender === "user" && message.text === text) {
      return [...messages.slice(0, index), ...messages.slice(index + 1)];
    }
  }
  return messages;
};

// ONE in-flight chat request per user, ever (Issue 2). Module-scoped so two
// mounted ChatScreen instances cannot parallel-send and burn the per-uid
// 30/5min abuse budget.
let chatInFlight: Promise<void> | null = null;
const isChatInFlight = () => chatInFlight !== null;

const ABUSE_COOLDOWN_MS = 60_000;
const UPSTREAM_AUTO_RETRY_DELAY_MS = 2_000;
const UPSTREAM_MANUAL_RETRY_DELAY_MS = 20_000;

type LimitSignal = {
  hit: boolean;
  // 'quota' = 429 quota_exhausted (hard cap) — usage counts + upgrade.
  // 'cooldown' = abuse/IP throttle — generic slow-down with >= 60s backoff.
  kind: "quota" | "cooldown" | null;
  refreshAt: number | string | null;
  showRefillTimer: boolean;
  messagesUsed: number;
  messagesTotal: number;
  /** Server-provided 0-100 percent; null when the payload omits it. */
  quotaPercent: number | null;
  /** Error code from the 429 body, e.g. ip_rate_limited. */
  code: string | null;
};

const CLEAR_LIMIT_SIGNAL: LimitSignal = {
  hit: false,
  kind: null,
  refreshAt: null,
  showRefillTimer: false,
  messagesUsed: 0,
  messagesTotal: 0,
  quotaPercent: null,
  code: null,
};

export default function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<ChatNavProp>();

  const rawPersonalityParam = route.params?.personality ?? "Friend";
  const rawReligionSubTypeParam = route.params?.religionSubType;
  const initialConversationId = route.params?.conversationId;

  const isLegacyGuide = typeof rawPersonalityParam === "string" && rawPersonalityParam.startsWith("Guide_");
  const basePersonality = isLegacyGuide ? "Guide" : rawPersonalityParam;
  const personality = normalizePersonality(basePersonality);
  const religionSubType = isStrangerPersonality(personality)
    ? undefined
    : isLegacyGuide
      ? normalizeReligion(rawPersonalityParam.split("_")[1]) ?? undefined
      : normalizeReligion(rawReligionSubTypeParam);

  const isStranger = isStrangerPersonality(personality);

  const themeKey = personality === "Guide" && religionSubType ? `Guide_${religionSubType}` : personality;
  const theme = PERSONALITY_THEME[themeKey] ?? DEFAULT_THEME;

  const { refreshPlan, isDeveloper, isLimitReached, nextRefreshAt, unlimited } = useToken();
  // Developer or server-unlimited accounts never see quota/refill UI (§E).
  const quotaExempt = isDeveloper || unlimited;

  const [input, setInput] = useState("");
  // Inline composer validation (400/length) — never a 503-style banner.
  const [composerError, setComposerError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);

  // Mirror of `messages` for async flows (auto-retry) that must not read a
  // stale render closure.
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const [limitSignal, setLimitSignal] = useState<LimitSignal>({
    hit: false,
    kind: null,
    refreshAt: null,
    showRefillTimer: false,
    messagesUsed: 0,
    messagesTotal: 0,
    quotaPercent: null,
    code: null,
  });

  // Hard epoch timestamp until which sending stays blocked after an
  // abuse-driven 429. 429 never means "retry now" (golden rule 5).
  const cooldownUntilRef = useRef(0);

  const [serviceError, setServiceError] = useState<{
    hit: boolean;
    message?: string;
    autoRetrying?: boolean;
    cooldownUntil?: number;
  } | null>(null);

  // Auto-retry budget for 503 upstream failures: at most ONE per session.
  const upstreamAutoRetriesRef = useRef(0);

  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      refreshPlan().catch(() => {});
    }, [refreshPlan])
  );

  const displayName = isStranger
    ? "Anonymous stranger"
    : personality === "Guide" && religionSubType
      ? `Guide · ${religionSubType.charAt(0).toUpperCase() + religionSubType.slice(1)}`
      : personality;
  const headerSub = isStranger ? "No history is kept" : "Here for you";

  const buildConversationTitle = (text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return `${displayName} chat`;
    return cleanText.length > 48 ? `${cleanText.slice(0, 48)}...` : cleanText;
  };

  const ensureConversation = async (uid: string, firstMessage: string) => {
    if (isStranger) return undefined;
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
      isConversationMessage: false,
    };
    setMessages([welcome]);
    // Stranger never reopens a saved conversation — always start fresh.
    setConversationId(isStranger ? undefined : initialConversationId);
  }, [initialConversationId, personality, themeKey, religionSubType, isStranger]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    const welcomeKey = themeKey;
    const welcome: Message = {
      id: makeMessageId(),
      text: welcomeMessages[welcomeKey] ?? welcomeMessages[personality] ?? welcomeMessages.Friend,
      sender: "ai",
      personality,
      religionSubType,
      isConversationMessage: false,
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

      // Stranger: no history listener — nothing is saved, nothing to load.
      if (!isStranger && conversationId) {
        unsubscribeHistory = conversationMessagesRef(uid, conversationId)
          .orderBy("createdAt", "asc")
          .onSnapshot(
            (snapshot) => {
              const savedMessages = snapshot.docs.map((doc) => {
                const data = doc.data();
                const sender = data.role === "user" || data.sender === "user" ? "user" : "ai";
                return {
                  id: doc.id,
                  text: normalizeNewlines(data.content ?? data.text ?? ""),
                  sender,
                  personality: data.personality || personality,
                  religionSubType: religionSubType,
                  isConversationMessage: Boolean(data.content ?? data.text),
                } as Message;
              });
              setMessages((prev) =>
                savedMessages.length > 0 ? savedMessages : prev.length > 0 ? prev : [welcome]
              );
            },
            (error) => {
              if (__DEV__) console.log("conversation listener error:", error?.message);
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
  }, [conversationId, personality, themeKey, religionSubType, isStranger]);

  const crisisPhrases = [
    "want to die", "kill myself", "end my life", "suicide",
    "don't want to live", "no reason to live", "better off dead",
    "harm myself", "hurt myself", "can't go on", "give up on life",
  ] as const;

  const isCrisisMessage = (text: string): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return crisisPhrases.some((phrase) => lower.includes(phrase));
  };

  const showCrisisSupport = () => {
    const userName = userProfile?.firstName ?? "friend";
    const emergencyContact = userProfile?.emergencyContact;

    const openDialer = (num: string) => {
      Linking.openURL(`tel:${num}`).catch(() => {});
    };

    const buttons: any[] = [
      {
        text: `Call ${CRISIS_HELPLINES.iCall.label}`,
        onPress: () => openDialer(CRISIS_HELPLINES.iCall.number),
      },
      {
        text: `Call ${CRISIS_HELPLINES.vandrevala.label}`,
        onPress: () => openDialer(CRISIS_HELPLINES.vandrevala.number),
      },
    ];

    if (emergencyContact) {
      const dialNumber = String(emergencyContact).replace(/\D/g, "");
      buttons.push({
        text: `📞 Call ${emergencyContact}`,
        onPress: () => openDialer(dialNumber),
      });
    }

    buttons.push({ text: "Continue Talking", style: "cancel" });

    Alert.alert(
      "You're Not Alone",
      `${userName}, it sounds like you're going through something really painful. Please reach out right now — you matter.\n\niCall: ${CRISIS_HELPLINES.iCall.number}\n(${CRISIS_HELPLINES.iCall.availability})\n\nVandrevala Foundation: ${CRISIS_HELPLINES.vandrevala.number}\n(${CRISIS_HELPLINES.vandrevala.availability})\n\nAASRA: ${CRISIS_HELPLINES.aasra.number}\n(${CRISIS_HELPLINES.aasra.availability})${emergencyContact ? `\n\nYour Emergency Contact: ${emergencyContact}` : ""}`,
      buttons
    );
  };

  const executeSend = async (messageText: string, opts?: { retry?: boolean; skipReligion?: boolean }) => {
    if (!messageText.trim()) return;

    // Serialize: ONE in-flight chat request per user, ever. Parallel sends
    // only burn the 30/5min abuse budget and stack "quota exhausted" toasts.
    // Internal retries (opts.retry) run on behalf of the in-flight task
    // itself, so the guard must not block them.
    if (chatInFlight && !opts?.retry) {
      return chatInFlight;
    }

    // 400-length equivalent: inline composer validation, not an error banner.
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      setComposerError(`Message is too long. Please shorten it to 2,000 characters or fewer.`);
      return;
    }

    // Check if this is a crisis message and show crisis support if needed.
    if (isCrisisMessage(messageText)) {
      showCrisisSupport();
      return;
    }

    const currentInput = messageText.trim();

    // The uid is used ONLY for the client-side Firestore transcript path;
    // identity on the wire is the Firebase ID token (golden rule 1).
    const uid = auth().currentUser?.uid;
    if (!uid) return;

    // Any fresh attempt invalidates a stale 503 banner — it is either being
    // retried (manually or auto) or succeeded.
    setServiceError(null);

    const userMessage: Message = {
      id: makeMessageId(),
      text: currentInput,
      sender: "user",
      isConversationMessage: true,
    };
    const priorMessages = opts?.retry
      ? withoutRetriedMessage(messagesRef.current, currentInput)
      : messagesRef.current;

    if (!opts?.retry) {
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
    }
    // On an internal retry the user bubble stays visible — the turn is being
    // retried, not duplicated, so no message-list edits are made.
    setLoading(true);

    const task = (async () => {
      // Streaming (§F): tokens render into one placeholder bubble; the `done`
      // event supplies the final text. Nothing is persisted until completion.
      let streamedId: string | null = null;
      let streamedText = "";
      const dropPartialStream = () => {
        if (!streamedId) return;
        const id = streamedId;
        streamedId = null;
        setMessages((prev) => prev.filter((m) => m.id !== id));
      };
      try {
        let activeConversationId: string | undefined = conversationId;
        if (!isStranger) {
          try {
            activeConversationId = await ensureConversation(uid, currentInput);
          } catch (e: any) {
            console.warn('ensureConversation failed — continuing without history:', e?.message);
          }
        } else {
          activeConversationId = undefined;
        }
        const storedPersonality = personality === "Guide" && religionSubType ? `Guide_${religionSubType}` : personality;

        // Stranger entries are never persisted; paid personas honor
        // storeHistory:false / noHistory:true from the response by dropping
        // the turn from Firestore as well.
        const userDocRef = !isStranger && activeConversationId
          ? conversationMessagesRef(uid, activeConversationId).doc(userMessage.id)
          : null;

        const requestBody: {
          message: string;
          messages?: ChatHistoryMessage[];
          personality: string;
          religionSubType?: string;
        } = {
          message: currentInput,
          personality: isStranger ? "Stranger" : personality,
        };
        // Stranger persona = no history, no persistence: omit messages
        // entirely (Issue 5).
        if (!isStranger) {
          requestBody.messages = getChatHistory(priorMessages);
        }
        if (personality === "Guide" && religionSubType && !opts?.skipReligion) {
          requestBody.religionSubType = religionSubType;
        }

        if (userDocRef) {
          try {
            await userDocRef.set({
              text: userMessage.text,
              sender: userMessage.sender,
              content: userMessage.text,
              role: "user",
              personality: storedPersonality,
              ...(personality === "Guide" && religionSubType ? { religionSubType } : {}),
              createdAt: firestore.FieldValue.serverTimestamp(),
            });
            await conversationRef(uid, activeConversationId!).set(
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
        }

        const result = await sendChatMessage(requestBody, (token) => {
          if (!streamedId) {
            const id = makeMessageId();
            streamedId = id;
            streamedText = token;
            setMessages((prev) => [
              ...prev,
              {
                id,
                text: streamedText,
                sender: "ai",
                personality,
                religionSubType,
                isConversationMessage: false,
              },
            ]);
            return;
          }
          streamedText += token;
          const id = streamedId;
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, text: streamedText } : m))
          );
        });
        // Non-stream replies degrade to the same shape (status + parsed body).
        const response = { status: result.status };
        const parsedError = async (): Promise<any> => result.body ?? {};

        // Limit responses (429; 402 kept for older backends). NEVER
        // auto-retry a 429 — the cooldown gate in handleSend enforces the
        // >= 60s backoff instead (golden rule 5). Quota 429s carry
        // code:"quota_exhausted" + usage fields and surface the quota
        // screen; other 429s are the 30/5min per-uid limiter or a per-IP
        // throttle and surface a generic "hold on" cooldown.
        if (response.status === 429 || response.status === 402) {
          const errData: any = await parsedError();
          const isQuotaLimit =
            response.status === 402 || errData?.code === "quota_exhausted";
          const refreshAt =
            errData?.nextRefreshAt && Number(errData.nextRefreshAt) > Date.now()
              ? Number(errData.nextRefreshAt)
              : isQuotaLimit
                ? null
                : Date.now() + ABUSE_COOLDOWN_MS;
          if (!quotaExempt) {
            cooldownUntilRef.current = isQuotaLimit ? 0 : (refreshAt as number) || 0;
            setLimitSignal({
              hit: true,
              kind: isQuotaLimit ? "quota" : "cooldown",
              refreshAt,
              showRefillTimer: isQuotaLimit
                ? errData?.showRefillTimer === true
                : Boolean(refreshAt),
              messagesUsed: typeof errData?.messagesUsed === "number" ? errData.messagesUsed : 0,
              messagesTotal: typeof errData?.messagesTotal === "number" ? errData.messagesTotal : 0,
              // Never derive quota percent locally — use the server value.
              quotaPercent:
                typeof errData?.quotaPercent === "number" ? errData.quotaPercent : null,
              code: typeof errData?.code === "string" ? errData.code : null,
            });
          }
          // The server is the source of truth for quota — refetch after any
          // 429 cycle (Issue 2); never compute `remaining` client-side.
          await refreshPlan().catch(() => {});
          return;
        }

        // 503 ai_upstream_error — quota was NOT consumed. Auto-retry at most
        // once after ~2s per session (Issue 8), then defer to a
        // user-initiated retry delayed by >= 15-30s.
        if (response.status === 503) {
          // A mid-stream failure leaves a partial reply — drop it so the user
          // never sees half a sentence presented as the final answer.
          dropPartialStream();
          if (!opts?.retry && upstreamAutoRetriesRef.current < 1) {
            upstreamAutoRetriesRef.current += 1;
            setServiceError({
              hit: true,
              autoRetrying: true,
              message: currentInput,
            });
            await new Promise((r) => setTimeout(r, UPSTREAM_AUTO_RETRY_DELAY_MS));
            await executeSend(currentInput, { retry: true });
            return;
          }
          setServiceError({
            hit: true,
            cooldownUntil: Date.now() + UPSTREAM_MANUAL_RETRY_DELAY_MS,
            message: currentInput,
          });
          return;
        }

        // 400: composer validation errors. The server drops an invalid
        // religionSubType silently only for history; an invalid *live* value
        // bounces as 400 — drop the subtype and retry once with plain Guide.
        if (response.status === 400) {
          const errData: any = await parsedError();
          if (
            requestBody.religionSubType &&
            /religionSubType/i.test(String(errData?.error || ""))
          ) {
            await executeSend(currentInput, { retry: true, skipReligion: true });
            return;
          }
          setComposerError(errData?.error || "Please adjust your message and try again.");
          return;
        }

        if (response.status === 403) {
          const errData: any = await parsedError();
          if (errData.code === 'persona_locked') {
            // Developers always have every persona — never show an upgrade prompt.
            Alert.alert(
              isDeveloper ? 'Persona unavailable' : 'Upgrade required',
              errData.error || (isDeveloper
                ? 'This persona is currently unavailable.'
                : 'This personality requires a paid plan.'),
              isDeveloper
                ? undefined
                : [{ text: 'Not now', style: 'cancel' }, {
                    text: 'Upgrade ✨',
                    onPress: () => navigation.navigate("Paywall"),
                  }],
            );
            return;
          }
          throw new Error(errData.error || "Backend request failed");
        }

        const data = result.body ?? {};

        if (response.status < 200 || response.status >= 300) {
          throw new Error(data.error || "Backend request failed");
        }

        const rawContent = data.reply || data.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error("Invalid AI response");
        }

        // Server decision wins: noHistory / storeHistory:false means the turn
        // must not persist anywhere, including our own DB.
        const noHistory = isStranger || data.noHistory === true || data.storeHistory === false;
        const echoedPersonality = data.personality || personality;

        {
          // The reply is ALWAYS rendered; only persistence is gated by
          // noHistory / storeHistory:false (Issue 5). A partial stream is
          // dropped first so the final text lands exactly once.
          if (noHistory) dropPartialStream();
          const aiReply: Message = {
            id: noHistory ? makeMessageId() : streamedId ?? makeMessageId(),
            text: normalizeNewlines(rawContent),
            sender: "ai",
            personality: echoedPersonality,
            religionSubType: religionSubType,
            isConversationMessage: true,
          };
          if (!noHistory && activeConversationId) {
            try {
              await conversationMessagesRef(uid, activeConversationId).doc(aiReply.id).set({
                text: aiReply.text,
                sender: aiReply.sender,
                content: aiReply.text,
                role: "assistant",
                personality: echoedPersonality,
                ...(personality === "Guide" && religionSubType ? { religionSubType } : {}),
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
          }
          setMessages((prev) => {
            if (streamedId && prev.some((m) => m.id === streamedId)) {
              return prev.map((m) => (m.id === streamedId ? aiReply : m));
            }
            if (prev.some((m) => m.id === aiReply.id)) return prev;
            return [...prev, aiReply];
          });
        }
        if (noHistory && userDocRef) {
          // Strip the already-persisted user turn — this persona never persists.
          try {
            await userDocRef.delete();
          } catch {}
          setMessages((prev) => withoutRetriedMessage(prev, currentInput));
        }

        upstreamAutoRetriesRef.current = 0;
        setServiceError(null);

        // The server is the source of truth for quota — refetch after every
        // delivered reply (refunds/downgrades can move it either way).
        await refreshPlan();
      } catch (error: any) {
        if (__DEV__) console.log("handleSend error:", error?.message);
        dropPartialStream();
        const text = error?.name === 'AbortError'
          ? "That took too long — please try again."
          : "Sorry, I couldn't respond right now. Please try again.";
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.sender === "ai" && last.text === text) return prev;
          return [
            ...prev,
            {
              id: makeMessageId(),
              text,
              sender: "ai",
            },
          ];
        });
      } finally {
        setLoading(false);
      }
    })();

    chatInFlight = task;
    try {
      await task;
    } finally {
      if (chatInFlight === task) {
        chatInFlight = null;
      }
      setLoading(false);
    }
  };

  const isOnline = useOnlineStatus(30_000);
  // A quota 429 may omit nextRefreshAt; fall back to the freshly fetched
  // server value so the refill countdown still reflects server truth.
  const limitRefreshAt =
    limitSignal.hit && limitSignal.kind === "quota"
      ? limitSignal.refreshAt ?? nextRefreshAt
      : limitSignal.refreshAt;
  const secondsLeft = useCountdown(limitSignal.hit ? limitRefreshAt : null);
  const serviceRetrySeconds = useCountdown(
    serviceError?.hit === true && typeof serviceError?.cooldownUntil === "number"
      ? serviceError.cooldownUntil
      : null
  );
  // 503 manual-retry hold (Issue 8): the retry CTA stays disabled until the
  // >= 15-30s delay elapses, so a dead upstream is never hammered.
  const serviceRetryHold = !quotaExempt && serviceError?.hit === true && serviceRetrySeconds > 0;

  // uiHints.hideQuotaInChat governs ambient quota display only; this banner
  // exists solely because the server refused the turn with quota_exhausted,
  // which §F requires us to explain (counts + percent + optional countdown).
  const quotaBannerActive = !quotaExempt && limitSignal.hit && limitSignal.kind === "quota";
  const cooldownBannerActive = !quotaExempt && limitSignal.hit && limitSignal.kind === "cooldown";

  const isSendDisabled =
    loading ||
    !isOnline ||
    isChatInFlight() ||
    input.trim().length > MAX_MESSAGE_LENGTH ||
    quotaBannerActive ||
    cooldownBannerActive;

  const sendButtonStyle = {
    backgroundColor: loading || isSendDisabled ? colors.borderStrong : theme.sendBtn,
  };

  const handleSend = () => {
    if (!isOnline) {
      Alert.alert("You're offline", "Please check your connection and try again.");
      return;
    }
    if (quotaBannerActive || cooldownBannerActive) return;
    if (serviceError?.hit) {
      // A stale 503 banner from a previous failed turn: this is a NEW
      // message, so drop the old banner instead of forcing Retry.
      setServiceError(null);
    }
    if (cooldownUntilRef.current > Date.now()) {
      // 429 never means "retry now" (golden rule 5) — re-surface the banner.
      if (!limitSignal.hit) {
        setLimitSignal({
          hit: true,
          kind: "cooldown",
          refreshAt: cooldownUntilRef.current,
          showRefillTimer: true,
          messagesUsed: 0,
          messagesTotal: 0,
          quotaPercent: null,
          code: null,
        });
      }
      return;
    }
    executeSend(input);
  };

  // Timed-limit expiry: when a refill window or abuse cooldown elapses,
  // drop the banner and refetch the server's quota truth.
  useEffect(() => {
    if (limitSignal.hit && limitRefreshAt != null && secondsLeft === 0) {
      setLimitSignal(CLEAR_LIMIT_SIGNAL);
      cooldownUntilRef.current = 0;
      refreshPlan().catch(() => {});
    }
  }, [limitSignal.hit, limitRefreshAt, secondsLeft, refreshPlan]);

  // The server lifted the quota cap (fresh isLimitReached from
  // /api/user/usage) — the local banner is no longer true; clear it.
  useEffect(() => {
    if (limitSignal.hit && limitSignal.kind === "quota" && !isLimitReached) {
      setLimitSignal(CLEAR_LIMIT_SIGNAL);
    }
  }, [limitSignal.hit, limitSignal.kind, isLimitReached]);

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
          {item.sender === "ai" && !isStranger && (
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
          <Text style={[styles.headerSub, { color: theme.headerSub }]}>{headerSub}</Text>
        </View>

        {!isStranger && (
          <TouchableOpacity
            onPress={() => navigation.navigate("ConversationHistory", { filterPersonality: personality })}
            style={styles.historyBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.historyBtnIcon}>📋</Text>
          </TouchableOpacity>
        )}
      </View>

      {isStranger && (
        <View style={styles.strangerBanner}>
          <Text style={styles.strangerBannerText}>
            🎭 You're talking to an anonymous stranger. No history is kept for Stranger chats.
          </Text>
        </View>
      )}

      {!isOnline && (
        <View style={[styles.offlineBanner, { borderColor: theme.inputBorder }]}>
          <Text style={[styles.offlineIcon]}>📶</Text>
          <Text style={[styles.offlineText, { color: theme.typingColor }]}>
            You're offline. Messages will be sent when you reconnect.
          </Text>
        </View>
      )}

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
          <View style={[styles.limitBanner, styles.serviceErrorBanner]}>
            <View style={styles.limitBannerRow}>
              <Text style={styles.limitEmoji}>⚠️</Text>
              <View style={styles.limitBannerCopy}>
                <Text style={[styles.limitTitle, styles.serviceErrorTitle]}>
                  {serviceError.autoRetrying
                    ? "AI is briefly unavailable, retrying shortly…"
                    : "AI is briefly unavailable"}
                </Text>
                <Text style={styles.serviceErrorSub}>
                  Temporary error. Quota was NOT consumed.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.upgradeBtn,
                { backgroundColor: theme.sendBtn, opacity: serviceRetryHold ? 0.5 : 1 },
              ]}
              onPress={() => {
                const retryMsg = serviceError.message;
                setServiceError(null);
                if (retryMsg) executeSend(retryMsg, { retry: true });
              }}
              disabled={serviceRetryHold || loading}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: theme.headerText }]}>
                {serviceRetryHold ? "Retry soon" : "Retry ↺"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {quotaBannerActive ? (
          // Quota is a hard cap now (Issue 2): show server-provided counts,
          // and the refill countdown ONLY when the server says it is useful
          // (showRefillTimer === true, the 75% rule).
          <View style={[styles.limitBanner, { borderColor: theme.inputBorder }]}>
            <View style={styles.limitBannerRow}>
              <Text style={[styles.limitEmoji, { color: theme.typingColor }]}>💛</Text>
              <View style={styles.limitBannerCopy}>
                <Text style={[styles.limitTitle, { color: theme.typingColor }]}>
                  Message limit reached
                </Text>
                <Text style={[styles.limitCountdown, { color: theme.typingColor }]}>
                  {limitSignal.messagesTotal > 0
                    ? `${limitSignal.messagesUsed}/${limitSignal.messagesTotal} messages used this window${
                        limitSignal.quotaPercent != null
                          ? ` (${Math.round(limitSignal.quotaPercent)}%)`
                          : ""
                      }.`
                    : "You have used all messages in this window."}
                </Text>
                {limitSignal.showRefillTimer && limitRefreshAt != null && (
                  <Text style={[styles.limitCountdown, { color: theme.typingColor }]}>
                    New messages in{" "}
                    <Text style={[styles.limitCountdownBold, { color: theme.typingColor }]}>
                      {formatCountdown(secondsLeft)}
                    </Text>
                  </Text>
                )}
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
        ) : cooldownBannerActive ? (
          // Abuse/IP throttles are share-network by design (Issue 6) — surface
          // "you're sending too fast" with the backed-off countdown.
          <View style={[styles.limitBanner, { borderColor: theme.inputBorder }]}>
            <View style={styles.limitBannerRow}>
              <Text style={[styles.limitEmoji, { color: theme.typingColor }]}>⏳</Text>
              <View style={styles.limitBannerCopy}>
                <Text style={[styles.limitTitle, { color: theme.typingColor }]}>
                  Too many requests
                </Text>
                <Text style={[styles.limitCountdown, { color: theme.typingColor }]}>
                  {limitSignal.code === "ip_rate_limited"
                    ? "You've hit the network limit for this network. Please hold on."
                    : "You're sending messages too quickly. Please hold on."}
                  {limitSignal.refreshAt != null
                    ? ` Retry in ${formatCountdown(secondsLeft)}.`
                    : ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: theme.sendBtn }]}
              onPress={() => setLimitSignal(CLEAR_LIMIT_SIGNAL)}
              activeOpacity={0.85}
            >
              <Text style={[styles.upgradeBtnText, { color: theme.headerText }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {composerError && (
          <Text style={styles.composerError}>{composerError}</Text>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { borderColor: theme.inputBorder }]}
            placeholder="What's on your mind?"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={(t) => {
              setInput(t.slice(0, MAX_MESSAGE_LENGTH));
              if (composerError) setComposerError(null);
            }}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
            multiline={false}
            maxLength={MAX_MESSAGE_LENGTH}
          />
          <TouchableOpacity
            style={[styles.sendButton, sendButtonStyle]}
            onPress={handleSend}
            disabled={isSendDisabled}
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
  composerError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.onPrimary,
    borderWidth: 1,
    gap: 8,
  },
  offlineIcon: { fontSize: 16 },
  offlineText: { fontSize: 12, fontWeight: "500" },
  strangerBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#ECEFF1",
    borderWidth: 1,
    borderColor: "#B0BEC5",
  },
  strangerBannerText: { fontSize: 12, color: "#37474F", fontWeight: "500", textAlign: "center" },
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
  serviceErrorBanner: { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
  serviceErrorTitle: { color: '#C53030' },
  serviceErrorSub: { fontSize: 12, color: '#9B2C2C' },
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
