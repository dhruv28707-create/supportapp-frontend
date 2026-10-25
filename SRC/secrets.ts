/**
 * Public client configuration.
 *
 * This file contains no private secrets and is safe to commit. OAuth client
 * IDs are public identifiers. Payment orders are created by the backend, which
 * returns the Razorpay key_id required by checkout, so the app never needs a
 * Razorpay key at build time.
 *
 * Values can be overridden by build-time environment variables when the
 * bundler injects `process.env`.
 *
 * Env vars:
 *   GOOGLE_WEB_CLIENT_ID — Google OAuth web client ID (public)
 *   GOOGLE_IOS_CLIENT_ID — Google OAuth iOS client ID (public, iOS only)
 */

declare global {
  interface NodeProcessEnv {
    GOOGLE_WEB_CLIENT_ID: string;
    GOOGLE_IOS_CLIENT_ID: string;
  }
}

function envOrDefault(name: keyof NodeProcessEnv, fallback: string): string {
  const env = typeof process !== 'undefined' ? (process as any)?.env : undefined;
  const value = env?.[name];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
}

export const GOOGLE_WEB_CLIENT_ID: string = envOrDefault(
  'GOOGLE_WEB_CLIENT_ID',
  // Web-application client (oauth_client client_type 3) from
  // android/app/google-services.json. This ID is public (not a secret) and is
  // required by GoogleSignin.configure({ webClientId }).
  '1076175086950-p5lcqmr3pr8qsliolbk5e33gfsks5f79.apps.googleusercontent.com'
);

export const GOOGLE_IOS_CLIENT_ID: string = envOrDefault(
  'GOOGLE_IOS_CLIENT_ID',
  // iOS OAuth client from the Firebase console (GoogleService-Info.plist
  // CLIENT_ID). Set this to enable Google Sign-In on iOS.
  ''
);
