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

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Fetch helper for the backend API.
 *
 * - Attaches the Firebase ID token as the Bearer token on every request.
 * - ID tokens expire after ~1 hour — `getIdToken()` transparently refreshes
 *   them when they are stale, so every call goes out with a valid token.
 * - On a 401 response: forces a token refresh and retries once.
 * - If the retry also returns 401: signs the user out to force a re-login.
 * - Aborts hung requests after a timeout so they don't hang the UI.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth().currentUser;
  if (!user) {
    throw new ApiError(401, 'Not authenticated');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await doFetch(false, controller.signal);
  } finally {
    clearTimeout(timeout);
  }

  async function doFetch(
    forceRefresh: boolean,
    signal: AbortSignal,
  ): Promise<Response> {
    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const idToken = await user.getIdToken(forceRefresh);
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (response.status === 401) {
      // Token expired mid-flight — force a refresh and retry once.
      const refreshed = await doFetch(true, signal);
      if (refreshed.status === 401) {
        // Session is genuinely dead — force a re-login.
        await auth().signOut();
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
      return refreshed;
    }

    return response;
  }
}

/**
 * Health check endpoint (no auth).
 */
export async function checkHealth(): Promise<{ ok: boolean; status?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: true, status: data.status || 'ok' };
      }
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { ok: false };
  }
}

