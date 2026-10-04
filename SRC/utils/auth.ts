/** Shared auth helpers — keeps Login/Register error UX consistent. */

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Works across google-signin SDK versions (new `data.idToken` vs legacy top-level). */
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
  // Never surface raw Firebase internals like "(auth/...)".
  if (/auth\//.test(msg)) return fallback;
  return msg || fallback;
}
