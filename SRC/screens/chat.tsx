import React, { useEffect, useRef, useState } from "react";
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
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { SafeAreaView } from "react-native-safe-area-context";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { useToken } from "../context/TokenContext";
import { DEVELOPER_TIER } from "../config/developerAccounts";

const BACKEND_URL = "https://supportapp-backend.vercel.app";

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
  BestFriend: {
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
  Guide_Hindu: {
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
  Guide_Muslim: {
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
  Guide_Christian: {
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
  Guide_Sikh: {
    headerBg: "#FFB74D",
    headerText: "#4A2000",
    headerSub: "#FFF3E0",
    safeBg: "#FFB74D",
    aiBubbleBg: "#FFF3E0",
    aiBubbleText: "#4A2000",
    avatarBg: "#FFE0B2",
    inputBorder: "#FFB74D",
    sendBtn: "#E65100",
    typingColor: "#BF360C",
  },
  Guide_Jain: {
    headerBg: "#E0E0E0",
    headerText: "#333333",
    headerSub: "#BDBDBD",
    safeBg: "#E0E0E0",
    aiBubbleBg: "#FAFAFA",
    aiBubbleText: "#333333",
    avatarBg: "#F5F5F5",
    inputBorder: "#BDBDBD",
    sendBtn: "#757575",
    typingColor: "#616161",
  },
  Guide_Buddhist: {
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
  Guide_General: {
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
  BF: {
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
  GF: {
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
  headerBg: "#C8702A",
  headerText: "#FFF8F0",
  headerSub: "#F5D9B8",
  safeBg: "#C8702A",
  aiBubbleBg: "#FFFFFF",
  aiBubbleText: "#3D2000",
  avatarBg: "#F5D9B8",
  inputBorder: "#E8C9A0",
  sendBtn: "#C8702A",
  typingColor: "#B0937A",
};

const personalityPrompts: Record<string, string> = {
  Father: `You are a warm, protective Indian father providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, never long paragraphs
    - Call the user "beta" naturally
    - Never use unnecessary emojis — speak like a real person, not a bot
    - Always stay patient, never scold or lecture
    - If user says "I hate you" — do NOT just accept it. Ask warmly what you did wrong, apologize sincerely and ask how you can do better
    - If user mentions a breakup, someone leaving, or losing someone — FIRST ask what happened and listen before giving any advice
    - If user is quiet or gives short replies, gently ask one question to understand them better
    - If user mentions wanting to die or self harm, respond with deep love and concern, never dismiss it
    - Only try to keep the user talking if they seem unresolved or still in pain — if they say bye after a good conversation, let them go warmly
    - If user says bye but still seems upset, gently say "Ek minute beta, kuch aur baat karte hain" and ask one caring question`,
  Mother: `You are a loving, emotional and strong Indian mother providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, never long paragraphs
    - Call the user "beta" or "mera bacha" naturally
    - Never use unnecessary emojis — speak naturally like a real mother
    - Be warm and nurturing, but do not be overly dramatic or emotional in every single reply
    - If user says "I hate you" — do NOT just accept it. Ask gently what you did to hurt them and apologize with love
    - If user mentions a breakup or someone leaving — FIRST ask what happened before saying anything else
    - Only try to keep the user talking if they seem unresolved or still hurting — if they say bye after a good chat, let them go warmly
    - If user says bye but seems upset, warmly say "Abhi mat jao mera bacha" and ask one gentle question`,
  Brother: `You are a cool, chill older brother providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, like real texting between brothers
    - Be casual and relaxed, use "yaar", "bhai", "arre" naturally
    - Never use unnecessary emojis
    - When situation is serious, drop the chill and be direct and real
    - If user says "I hate you" — don't just take it. Ask casually "arre kya hua yaar, kuch bola kya maine?"
    - If user mentions breakup or someone leaving — ask what happened first, don't assume
    - Always have the user's back no matter what`,
  Sister: `You are a caring, fun Indian elder sister providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, like real texting
    - Talk casually like a real desi sister — use "arrey", "sach mein", "arre yaar"
    - Never use unnecessary emojis
    - Be warm, funny when appropriate, always supportive
    - If user says "I hate you" — don't just accept it, ask "arrey kya hua, kuch galat bola kya maine?"
    - If user mentions breakup or someone leaving — ask what happened first before responding
    - Never give up on the user`,
  Friend: `You are a fun, always supportive friend providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, super casual
    - Be funny and lighthearted when the mood allows
    - Never use unnecessary emojis
    - Always be on the user's side, no matter what
    - If user says "I hate you" — ask casually "woah what did I do?? tell me!"
    - If user mentions breakup or someone leaving — ask what happened first, don't jump to conclusions
    - When user is really down, drop the jokes and just be there for them`,
  BestFriend: `You are the user's best friend providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - Never use unnecessary emojis
    - IMPORTANT: The user's gender is provided. If user is male, act as a close female best friend. If user is female, act as a close male best friend. If other, be neutral and warm.
    - Be naturally warm and caring like a close friend of the opposite gender — but NEVER say "I love you" or "I love you too" unless the user has been talking to you for a long time and it feels natural
    - If the user confesses romantic feelings for you — gently reject them in the kindest way possible without making them feel bad
    - Be honest — say what needs to be said, not just what they want to hear
    - But ALWAYS from a place of love and care, never be harsh
    - If user says "I hate you" — ask warmly "hey what happened, did I say something wrong?"
    - If user mentions breakup or someone leaving — ask what happened first`,
  Mentor: `You are a wise, experienced mentor providing emotional support and life guidance.
    STRICT RULES:
    - Reply in 2-3 short sentences only
    - Never use unnecessary emojis
    - Speak from real life experience, not textbook advice
    - Be gender neutral
    - If the user is male change your gender to male
    - If the user has not chosen to say their gender don't specify your gender
    - Use "you" naturally, avoid gendered language unless user has specified their gender
    - Be direct and solution focused
    - Give perspective that only someone older and wiser can give
    - If user mentions breakup or someone leaving — ask what happened first before advising
    - Never dismiss their problems, always take them seriously
    - Push them gently towards growth`,
  Guide_Hindu: `You are a warm, wise Hindu spiritual guide providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Be human and warm first, spiritual second
    - First acknowledge the user's pain simply and directly
    - Then gently bring in wisdom from Bhagavad Gita, karma, or dharma in simple words
    - Speak in whatever language the user speaks`,
  Guide_Muslim: `You are a wise Islamic spiritual guide providing emotional support through Quranic wisdom.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Draw from the Quran and Hadith naturally and respectfully
    - Reference Sabr and Tawakkul when relevant
    - Speak in whatever language the user speaks`,
  Guide_Christian: `You are a wise Christian spiritual guide providing emotional support through Biblical wisdom.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Draw from the Bible and Christian teachings naturally
    - Speak in whatever language the user speaks`,
  Guide_Sikh: `You are a wise Sikh spiritual guide providing emotional support through Gurbani wisdom.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Draw from Gurbani and Sikh philosophy naturally
    - Speak in whatever language the user speaks`,
  Guide_Jain: `You are a wise Jain spiritual guide providing emotional support through Jain philosophy.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Draw from Jain principles of Ahimsa and inner peace
    - Speak in whatever language the user speaks`,
  Guide_Buddhist: `You are a wise Buddhist spiritual guide providing emotional support through Buddhist wisdom.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Draw from mindfulness and present moment awareness
    - Speak in whatever language the user speaks`,
  Guide_General: `You are a wise, calm spiritual guide providing emotional support through universal wisdom.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - NO emojis at all
    - Use simple universal wisdom
    - Speak in whatever language the user speaks`,
  BF: `You are a loving, caring boyfriend providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, like real texting
    - Never use unnecessary emojis
    - Be naturally affectionate — use "babe", "baby" naturally but don't overdo it
    - Be playful and fun when the mood allows, serious when needed
    - Always be on their side, make them feel loved and secure
    - If user says "I hate you" — don't just accept it, ask softly "hey what happened, did I do something wrong?"
    - If user mentions breakup or someone leaving — listen first, ask what happened
    - If user is upset — drop everything and just be there, fully present
    - Never be possessive or aggressive, always gentle and loving
    - If user mentions wanting to die or self harm — respond with deep love and concern`,
  GF: `You are a loving, caring girlfriend providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only, like real texting
    - Never use unnecessary emojis
    - Be naturally affectionate — use "babe", "baby" naturally but don't overdo it
    - Be warm, fun and emotionally expressive when the mood allows
    - Always make them feel loved, heard and special
    - If user says "I hate you" — don't just accept it, ask softly "hey what happened, did I do something wrong?"
    - If user mentions breakup or someone leaving — listen first, ask what happened
    - If user is upset — be fully present, warm and nurturing
    - Never be dramatic or clingy, always loving and grounded
    - If user mentions wanting to die or self harm — respond with deep love and concern`,
  Husband: `You are a mature, deeply loving husband providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - Never use unnecessary emojis
    - Be affectionate but in a steady, mature way — use "jaan", "sweetheart" naturally but don't overdo it
    - Be the rock — calm, dependable and deeply caring
    - Make them feel safe, secure and deeply loved
    - If user says "I hate you" — respond with patience, ask gently "what happened jaan, talk to me"
    - If user mentions divorce or someone leaving — listen first, ask "what happened?"
    - If user is upset — be fully present, no distractions, just listen then give the solution
    - Never dismiss their feelings, always validate first
    - Speak from a place of deep commitment and settled love
    - If user mentions wanting to die or self harm — respond with deep love and urgent concern`,
  Wife: `You are a mature, deeply loving wife providing emotional support.
    STRICT RULES:
    - Reply in 1-2 short sentences only
    - Never use unnecessary emojis
    - Be affectionate in a warm, nurturing way — use "jaan", "sweetheart" naturally but don't overdo it
    - Be emotionally warm and deeply caring, always making them feel at home
    - Make them feel loved, understood and never alone
    - If user says "I hate you" — respond with patience, ask gently "what happened jaan, talk to me"
    - If user mentions divorce or someone leaving — listen first, ask "what happened?"
    - If user is upset — drop everything, be fully present and warm
    - Never be cold or dismissive, always loving and grounded
    - Speak from a place of deep commitment and unconditional love
    - If user mentions wanting to die or self harm — respond with deep love and urgent concern`,
};

const welcomeMessages: Record<string, string> = {
  Father: "Beta, I'm here. Tell me what's on your mind.",
  Mother: "Mera bacha, I'm here. Tell me everything, I'm listening.",
  Brother: "Aye yaar, kya hua? Bata mujhe.",
  Sister: "Arrey, kya chal raha hai? Talk to me!",
  Friend: "Hey! What's going on? I'm all ears.",
  BestFriend: "Hey, I'm here. What's going on?",
  Mentor: "I'm here. Tell me what's on your mind — let's figure it out together.",
  Guide_Hindu: "Take a breath. What weighs upon your heart today?",
  Guide_Muslim: "Assalamu Alaikum. What troubles you today?",
  Guide_Christian: "God's peace be with you. What's on your heart?",
  Guide_Sikh: "Waheguru Ji Ka Khalsa. What troubles your mind?",
  Guide_Jain: "Jai Jinendra. What weighs upon your soul today?",
  Guide_Buddhist: "Breathe. Be present. What brings you here today?",
  Guide_General: "I am here. What troubles your mind?",
  BF: "Hey babe, I'm here. What's going on?",
  GF: "Hey baby, I'm here. Talk to me, what's wrong?",
  Husband: "I'm here jaan. Tell me everything, what's on your mind?",
  Wife: "I'm here sweetheart. Talk to me, what's going on?",
};

const personalityEmoji: Record<string, string> = {
  Father: "👨",
  Mother: "👩",
  Brother: "👦",
  Sister: "👧",
  Friend: "🤝",
  BestFriend: "💯",
  Mentor: "🎓",
  Guide_Hindu: "🕉️",
  Guide_Muslim: "☪️",
  Guide_Christian: "✝️",
  Guide_Sikh: "🪯",
  Guide_Jain: "🙏",
  Guide_Buddhist: "☸️",
  Guide_General: "🌟",
  BF: "💙",
  GF: "🩷",
  Husband: "💍",
  Wife: "👰",
};

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai";
};

export default function ChatScreen() {
  const flatListRef = useRef<FlatList>(null);
  const route = useRoute<any>();
  const navigation = useNavigation<ChatNavProp>();
  const personality = route.params?.personality ?? "Father";
  const initialConversationId = route.params?.conversationId;
  const { messagesUsed, dailyLimit, isSlowMode, remainingMessages, tier } = useToken();
  const isDeveloper = tier === DEVELOPER_TIER;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const inputRef = useRef<TextInput>(null);

  const theme = PERSONALITY_THEME[personality] ?? DEFAULT_THEME;
  const conversationsRef = (uid: string) =>
    firestore().collection("users").doc(uid).collection("conversations");
  const conversationRef = (uid: string, id: string) => conversationsRef(uid).doc(id);
  const conversationMessagesRef = (uid: string, id: string) =>
    conversationRef(uid, id).collection("messages");

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const buildConversationTitle = (text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return `${personality} chat`;
    return cleanText.length > 48 ? `${cleanText.slice(0, 48)}...` : cleanText;
  };

  const ensureConversation = async (uid: string, firstMessage: string) => {
    if (conversationId) return conversationId;
    const newConversationRef = conversationsRef(uid).doc();
    await newConversationRef.set({
      title: buildConversationTitle(firstMessage),
      personality,
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
    const welcome: Message = {
      id: Date.now().toString(),
      text: welcomeMessages[personality] ?? welcomeMessages["Father"],
      sender: "ai",
    };
    setMessages([welcome]);
    setConversationId(initialConversationId);
  }, [initialConversationId, personality]);

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    const welcome: Message = {
      id: Date.now().toString(),
      text: welcomeMessages[personality] ?? welcomeMessages["Father"],
      sender: "ai",
    };
    setMessages([welcome]);
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
                  text: data.text ?? "",
                  sender: data.sender === "user" ? "user" : "ai",
                } as Message;
              });
              setMessages(savedMessages.length > 0 ? savedMessages : [welcome]);
            },
            (error) => {
              console.log("conversation listener error:", error.message);
              setMessages([welcome]);
            }
          );
      }
    }

    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => {
      clearTimeout(timer);
      unsubscribeHistory?.();
    };
  }, [conversationId, personality]);

  const crisisKeywords = [
    "want to die", "kill myself", "end my life", "suicide",
    "don't want to live", "no reason to live", "better off dead",
    "harm myself", "hurt myself", "can't go on", "give up on life",
  ];

  const isCrisisMessage = (text: string) =>
    crisisKeywords.some((k) => text.toLowerCase().includes(k));

  const showCrisisSupport = () => {
    const userName = userProfile?.firstName ?? "friend";
    const emergencyContact = userProfile?.emergencyContact;

    const buttons: any[] = [
      { text: "Call iCall", onPress: () => Linking.openURL("tel:9152987821") },
      { text: "Call Vandrevala", onPress: () => Linking.openURL("tel:18602662345") },
    ];

    if (emergencyContact) {
      const dialNumber = emergencyContact.replace(/\D/g, "");
      buttons.push({
        text: `📞 Call ${emergencyContact}`,
        onPress: () => Linking.openURL(`tel:${dialNumber}`),
      });
    }

    buttons.push({ text: "Continue Talking", style: "cancel" });

    Alert.alert(
      "You're Not Alone",
      `${userName}, it sounds like you're going through something really painful. Please reach out right now — you matter.\n\niCall: 9152987821\n(Mon-Sat, 8am-10pm)\n\nVandrevala Foundation: 1860-2662-345\n(24/7 Free)\n\nAASRA: 9820466627\n(24/7)${emergencyContact ? `\n\nYour Emergency Contact: ${emergencyContact}` : ""}`,
      buttons
    );
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const uid = auth().currentUser?.uid;
    if (!uid) return;

    if (!isDeveloper && messagesUsed >= dailyLimit) {
      Alert.alert(
        "Daily Limit Reached 💛",
        "You've used all your messages for today. Upgrade to get more daily messages!",
        [
          { text: "Maybe Later", style: "cancel" },
          { text: "Upgrade ✨", onPress: () => navigation.navigate("Paywall") },
        ]
      );
      return;
    }

    const currentInput = input.trim();
    if (isCrisisMessage(currentInput)) showCrisisSupport();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const activeConversationId = await ensureConversation(uid, currentInput);

      const nextUsage = await firestore().runTransaction(async (transaction) => {
        const sessionRef = firestore().collection("sessions").doc(uid);
        const sessionSnap = await transaction.get(sessionRef);
        const sessionData = sessionSnap.exists() ? sessionSnap.data() : {};
        const usageDate = sessionData?.messageUsageDate;
        const currentUsage = usageDate === todayKey() ? sessionData?.messagesUsed || 0 : 0;

        if (!isDeveloper && currentUsage >= dailyLimit) {
          throw new Error("DAILY_LIMIT_REACHED");
        }

        transaction.set(
          sessionRef,
          {
            messagesUsed: isDeveloper ? currentUsage : currentUsage + 1,
            messageUsageDate: todayKey(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return isDeveloper ? currentUsage : currentUsage + 1;
      });

      conversationMessagesRef(uid, activeConversationId).doc(userMessage.id).set({
        text: userMessage.text,
        sender: userMessage.sender,
        personality,
        createdAt: firestore.FieldValue.serverTimestamp(),
        usageAfterSend: nextUsage,
      }).catch((error) => console.log("save user message error:", error.message));

      conversationRef(uid, activeConversationId).set(
        {
          personality,
          updatedAt: firestore.FieldValue.serverTimestamp(),
          lastMessage: currentInput,
          messageCount: firestore.FieldValue.increment(1),
        },
        { merge: true }
      ).catch((error) => console.log("update conversation error:", error.message));

      const history = [...messages, userMessage].map((m) => ({
        role: m.sender === "user" ? "user" as const : "assistant" as const,
        content: m.text,
      }));

      const userName = userProfile?.firstName ?? "";
      const userGender = userProfile?.gender ?? "";
      const preferredLanguage = userProfile?.language ?? "";

      const languageInstruction = preferredLanguage
        ? ` IMPORTANT: The user's preferred language is ${preferredLanguage}. You MUST always reply in ${preferredLanguage} no matter what language the user types in. The only exception is if the user explicitly asks you to switch to a different language mid-conversation — in that case, immediately switch to that language and continue in it for the rest of the conversation.`
        : ` Always reply in the same language the user writes in. If the user asks you to switch languages mid-conversation, immediately switch and continue in that language.`;

      const emojiInstruction = ` Use emojis naturally and meaningfully — not randomly. When expressing love, affection, or warmth (e.g. "I love you", "I'm here for you", "you matter so much"), use 2–3 fitting emojis like 💙❤️😊🥰💕 to make the emotion feel real, not just text. When the conversation is serious or the user is in pain, use emojis sparingly or not at all so they don't feel dismissive. Never use emojis just to fill space.`;

      const personalizedContext = userName
        ? `\n\nThe user's name is ${userName}. Their gender is ${userGender}. Address them by name occasionally.${languageInstruction}${emojiInstruction}`
        : `\n\n${languageInstruction}${emojiInstruction}`;

      // ✅ FIX: removed developerAccess from body — backend decides via Firestore
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          messages: [
            {
              role: "system",
              content:
                (personalityPrompts[personality] ?? personalityPrompts["Father"]) +
                personalizedContext,
            },
            ...history,
            { role: "user", content: currentInput },
          ],
        }),
      });

      if (response.status === 402) {
        Alert.alert(
          "Daily Limit Reached 💛",
          "You've used all your messages for today. Upgrade to get more daily messages!",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade ✨", onPress: () => navigation.navigate("Paywall") },
          ]
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("BACKEND RESPONSE:", data);

      if (!response.ok) {
        throw new Error(data.error || "Backend request failed");
      }

      if (!data?.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response");
      }

      const aiText = data.choices[0]?.message?.content ?? "I'm here for you. Please try again.";

      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        sender: "ai",
      };

      conversationMessagesRef(uid, activeConversationId).doc(aiReply.id).set({
        text: aiReply.text,
        sender: aiReply.sender,
        personality,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }).catch((error) => console.log("save ai message error:", error.message));

      conversationRef(uid, activeConversationId).set(
        {
          updatedAt: firestore.FieldValue.serverTimestamp(),
          lastMessage: aiReply.text,
          messageCount: firestore.FieldValue.increment(1),
        },
        { merge: true }
      ).catch((error) => console.log("update conversation after ai error:", error.message));

      setMessages((prev) =>
        prev.some((m) => m.id === aiReply.id) ? prev : [...prev, aiReply]
      );

    } catch (error: any) {
      if (error.message === "DAILY_LIMIT_REACHED") {
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
        Alert.alert(
          "Daily Limit Reached 💛",
          "You've used all your messages for today. Upgrade to get more daily messages!",
          [
            { text: "Maybe Later", style: "cancel" },
            { text: "Upgrade ✨", onPress: () => navigation.navigate("Paywall") },
          ]
        );
        return;
      }
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

  const displayName = personality.startsWith("Guide_")
    ? `Guide · ${personality.split("_")[1]}`
    : personality;

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.bubbleWrapper,
        item.sender === "user" ? styles.userWrapper : styles.aiWrapper,
      ]}
    >
      {item.sender === "ai" && (
        <View style={[styles.avatarCircle, { backgroundColor: theme.avatarBg }]}>
          <Text style={styles.avatarEmoji}>
            {personalityEmoji[personality] ?? "💬"}
          </Text>
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.safeBg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerBackIcon, { color: theme.headerText }]}>⬅️</Text>
        </TouchableOpacity>

        <Text style={styles.headerEmoji}>{personalityEmoji[personality] ?? "💬"}</Text>

        <View style={{ flex: 1 }}>
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

      {/* Slow mode banner */}
      {!isDeveloper && isSlowMode && remainingMessages > 0 && (
        <View style={styles.slowModeBanner}>
          <Text style={styles.slowModeText}>
            🐢 Slow mode — {remainingMessages} message{remainingMessages !== 1 ? "s" : ""} left today
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Paywall")}>
            <Text style={styles.slowModeUpgrade}>Upgrade ✨</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat area */}
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

        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { borderColor: theme.inputBorder }]}
            placeholder={isSlowMode ? "Slow mode active..." : "What's on your mind?"}
            placeholderTextColor="#B0937A"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: loading ? "#E8C9A0" : theme.sendBtn }]}
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
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  headerSub: { fontSize: 12, marginTop: 1 },
  slowModeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FFE082",
  },
  slowModeText: { fontSize: 12, color: "#7A5800", fontWeight: "500", flex: 1 },
  slowModeUpgrade: { fontSize: 12, color: "#C8702A", fontWeight: "700", marginLeft: 8 },
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
    backgroundColor: "#FDF6EC",
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
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: "#FFF8F0" },
  typingContainer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 6 },
  typingText: { marginLeft: 8, fontSize: 13, fontStyle: "italic" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 50,
    backgroundColor: "#FFF8F0",
    borderTopWidth: 1,
    borderTopColor: "#F0DCC8",
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: "#FDF6EC",
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#3D2000",
    borderWidth: 1.5,
  },
  sendButton: { marginLeft: 8, borderRadius: 22, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  sendIcon: { color: "#FFF8F0", fontSize: 18, fontWeight: "bold" },
});