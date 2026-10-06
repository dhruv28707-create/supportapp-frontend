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

const DEFAULT_TIMEOUT_MS = 30_000;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const user = auth().currentUser;
  if (!user) {
    throw new ApiError(401, 'Not authenticated');
  }

  return doFetch(false);

  async function doFetch(forceRefresh: boolean): Promise<Response> {
    if (!user) {
      throw new ApiError(401, 'Not authenticated');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const idToken = await user.getIdToken(forceRefresh);
      const response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.status === 401) {
        if (!forceRefresh) {
          return doFetch(true);
        }
        await auth().signOut();
        throw new ApiError(401, 'Session expired. Please log in again.');
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function checkHealth(): Promise<{
  ok: boolean;
  status?: string;
  firebase?: 'connected' | 'disconnected';
  degraded?: boolean;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const res = await fetch(`${BACKEND_URL}/api/health`, {
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      const firebase = data.firebase === 'connected' || data.firebase === 'disconnected' ? data.firebase : undefined;
      if (res.ok) {
        return { ok: true, status: data.status || 'ok', firebase, degraded: firebase === 'disconnected' };
      }
      return { ok: false, status: data.status, firebase, degraded: true };
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return { ok: false, degraded: true };
  }
}

