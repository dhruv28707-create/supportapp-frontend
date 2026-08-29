import auth from '@react-native-firebase/auth';
import { BACKEND_URL } from '../constants';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Fetch helper for the backend API.
 *
 * - Attaches the Firebase ID token as the Bearer token on every request.
 * - ID tokens expire after ~1 hour — `getIdToken()` transparently refreshes
 *   them when they are stale, so every call goes out with a valid token.
 * - On a 401 response: silently re-auths (forces a token refresh) and retries
 *   the request once.
 * - If the retry also returns 401: signs the user out to force a re-login.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const user = auth().currentUser;
  if (!user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const doFetch = async (forceRefresh: boolean) => {
    const idToken = await user.getIdToken(forceRefresh);
    return fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${idToken}`,
      },
    });
  };

  let response = await doFetch(false);

  if (response.status === 401) {
    // Token expired mid-flight — silently refresh and retry once.
    response = await doFetch(true);
    if (response.status === 401) {
      // Session is genuinely dead — force a re-login.
      await auth().signOut();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  return response;
}

/**
 * Health check endpoint (no auth).
 */
export async function checkHealth(): Promise<{ ok: boolean; status?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, status: data.status || 'ok' };
    }
    return { ok: false };
  } catch (err) {
    return { ok: false };
  }
}

