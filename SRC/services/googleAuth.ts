import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import database from "@react-native-firebase/database";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { DEVELOPER_TIER, isDeveloperEmail } from "../config/developerAccounts";

const GOOGLE_WEB_CLIENT_ID = "1076175086950-ebju39jr4e98afp07gq009u20jaqq6bd.apps.googleusercontent.com";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

const splitDisplayName = (displayName?: string | null) => {
  const parts = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "Friend",
    lastName: parts.slice(1).join(" "),
  };
};

export const ensureUserProfile = async (user: FirebaseAuthTypes.User) => {
  const isDeveloper = isDeveloperEmail(user.email);
  const userRef = firestore().collection("users").doc(user.uid);
  const userDoc = await userRef.get();
  const name = splitDisplayName(user.displayName);

  if (userDoc.exists()) {
    await userRef.set(
      {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        ...(isDeveloper
          ? {
              role: DEVELOPER_TIER,
              tier: DEVELOPER_TIER,
              isDeveloper: true,
              premium: true,
            }
          : {}),
      },
      { merge: true }
    );
  } else {
    await userRef.set({
      firstName: name.firstName,
      lastName: name.lastName,
      gender: "Prefer not to say",
      language: "English",
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emergencyContact: null,
      createdAt: firestore.FieldValue.serverTimestamp(),
      tier: isDeveloper ? DEVELOPER_TIER : "free",
      role: isDeveloper ? DEVELOPER_TIER : "user",
      isDeveloper,
      premium: isDeveloper,
      expiresAt: null,
      razorpayOrderId: null,
    });
  }

  await firestore().collection("sessions").doc(user.uid).set(
    {
      messagesUsed: 0,
      messageUsageDate: new Date().toISOString().slice(0, 10),
      sessionStartedAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  if (isDeveloper) {
    await database().ref(`users/${user.uid}`).update({
      role: DEVELOPER_TIER,
      premium: true,
      isDeveloper: true,
      email: user.email,
    });
  }
};

export const signInWithGoogle = async () => {
  if (GOOGLE_WEB_CLIENT_ID === "1076175086950-ebju39jr4e98afp07gq009u20jaqq6bd.apps.googleusercontent.com") {
    throw new Error("Google sign-in needs your Firebase Web client ID in SRC/services/googleAuth.ts.");
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;

  const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
  if (!idToken) {
    throw new Error("Google did not return an ID token. Check your Firebase OAuth client setup.");
  }

  const credential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(credential);
  await ensureUserProfile(userCredential.user);
  return userCredential;
};

export const isGoogleSignInCancel = (error: any) =>
  error?.code === statusCodes.SIGN_IN_CANCELLED;
