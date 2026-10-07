export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function extractGoogleIdToken(userInfo: any): string | null {
  return (
    userInfo?.data?.idToken ??
    userInfo?.idToken ??
    null
  );
}

const FRIENDLY_AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'That email address looks invalid. Please check it and try again.',
  'auth/user-not-found': 'No account found with this email. Try creating one instead.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export function friendlyAuthError(error: any, fallback: string): string {
  if (!error) return fallback;
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code && FRIENDLY_AUTH_ERRORS[code]) return FRIENDLY_AUTH_ERRORS[code];
  const msg = typeof error?.message === 'string' ? error.message : '';
  // react-native-google-signin config failures (wrong webClientId, SHA-1 not
  // registered, stale google-services.json) surface as DEVELOPER_ERROR /
  // code 10. This is never a wrong-password case — tell the user plainly.
  if (code === 'DEVELOPER_ERROR' || /DEVELOPER_ERROR/i.test(msg) || code === '10') {
    return 'Google sign-in is misconfigured on this build (DEVELOPER_ERROR). Please update the app and try again. If it persists, contact support.';
  }
  if (/auth\//.test(msg)) return fallback;
  return msg || fallback;
}
