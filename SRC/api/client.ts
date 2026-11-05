import auth from '@react-native-firebase/auth';
import appCheck from '@react-native-firebase/app-check';
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

/**
 * App Check guardrails (§C).
 *
 * activate() picks the platform default providers: PlayIntegrity in release
 * builds / Debug provider in debuggable builds on Android, DeviceCheck on
 * iOS. Every failure path is swallowed — App Check is not enforced
 * missing-token server-side yet, so the header is best-effort and must never
 * break a request. A FRESH token is generated per request so a later
 * APP_CHECK_CONSUME (single-use) rollout never rejects us.
 */
let appCheckActivated = false;

async function getAppCheckToken(): Promise<string | null> {
  try {
    if (!appCheckActivated) {
      // The namespaced activate() takes a firebase-js-sdk compat string but
      // ignores it and installs the platform defaults (PlayIntegrity /
      // Debug on Android, DeviceCheck on iOS).
      await appCheck().activate('default', true);
      appCheckActivated = true;
    }
    const { token } = await appCheck().getToken(true);
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
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
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const idToken = await user.getIdToken(forceRefresh);
      // Identity is the Firebase ID token ONLY (golden rule 1); App Check is
      // best-effort. Bodies stay uncompressed, small JSON — never send
      // Content-Encoding or referenced-derived proxy headers.
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const appCheckToken = await getAppCheckToken();
      if (appCheckToken) {
        headers['x-firebase-appcheck'] = appCheckToken;
      }
      Object.assign(headers, options.headers as Record<string, string> | undefined);
      headers.Authorization = `Bearer ${idToken}`;
      const response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers,
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

export interface ChatApiResult {
  status: number;
  body: any;
}

const CHAT_STREAM_IDLE_TIMEOUT_MS = 45_000;

/**
 * POST /api/chat with streaming (§F).
 *
 * Sends `Accept: text/event-stream` and renders `{token}` events as they
 * arrive; the terminating `done` event supplies the FINAL text. A mid-stream
 * `{error, code}` is surfaced as a 503 so the caller applies Issue 8's
 * cooldown rules. If the backend answers with plain JSON the same call
 * degrades to the documented non-stream contract.
 *
 * Identity and App Check handling matches apiFetch (fresh App Check token,
 * one forced ID-token refresh on 401, then a real sign-out). Bodies stay
 * uncompressed and no proxy headers are ever set.
 */
export async function sendChatMessage(
  payload: Record<string, unknown>,
  onToken?: (token: string) => void,
): Promise<ChatApiResult> {
  const user = auth().currentUser;
  if (!user) throw new ApiError(401, 'Not authenticated');

  return attempt(false);

  async function attempt(forceRefresh: boolean): Promise<ChatApiResult> {
    if (!user) throw new ApiError(401, 'Not authenticated');
    const idToken = await user.getIdToken(forceRefresh);
    const appCheckToken = await getAppCheckToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (appCheckToken) headers['x-firebase-appcheck'] = appCheckToken;
    headers.Authorization = `Bearer ${idToken}`;

    const result = await postStream(`${BACKEND_URL}/api/chat`, JSON.stringify(payload), headers, onToken);
    if (result.status === 401) {
      if (!forceRefresh) return attempt(true);
      await auth().signOut();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
    return result;
  }
}

function postStream(
  url: string,
  body: string,
  headers: Record<string, string>,
  onToken?: (token: string) => void,
): Promise<ChatApiResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let consumed = 0;
    let buffer = '';
    let dataLines: string[] = [];
    let accumulated = '';
    let donePayload: any = null;
    let streamError: any = null;
    let sawSse = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };
    const bumpIdle = () => {
      clearIdle();
      idleTimer = setTimeout(() => {
        try {
          xhr.abort();
        } catch {}
      }, CHAT_STREAM_IDLE_TIMEOUT_MS);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearIdle();
      fn();
    };

    const dispatch = (payload: string) => {
      if (payload === '[DONE]') return;
      let parsed: any;
      try {
        parsed = JSON.parse(payload);
      } catch {
        return;
      }
      if (parsed?.error) {
        streamError = parsed;
        return;
      }
      if (typeof parsed?.token === 'string') {
        accumulated += parsed.token;
        onToken?.(parsed.token);
        return;
      }
      if (parsed?.done === true) {
        donePayload = parsed;
      }
    };

    const consume = () => {
      const text = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      if (text.length <= consumed) return;
      const chunk = text.slice(consumed);
      consumed = text.length;
      if (!sawSse && !/^\s*(data:|:|\r?\n)/.test(chunk)) {
        // Plain JSON (non-stream) reply — wait for readyState 4.
        return;
      }
      sawSse = true;
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line === '') {
          if (dataLines.length > 0) dispatch(dataLines.join('\n'));
          dataLines = [];
          continue;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
    };

    const handleProgress = () => {
      if (settled) return;
      bumpIdle();
      consume();
    };

    xhr.onprogress = handleProgress;
    xhr.onreadystatechange = () => {
      if (settled) return;
      if (xhr.readyState === 3) {
        handleProgress();
        return;
      }
      if (xhr.readyState !== 4) return;
      handleProgress();
      if (dataLines.length > 0) {
        dispatch(dataLines.join('\n'));
        dataLines = [];
      }

      const status = xhr.status;
      const fullText = typeof xhr.responseText === 'string' ? xhr.responseText : '';
      if (status === 0) {
        finish(() => reject(new Error('Network request failed')));
        return;
      }
      if (status < 200 || status >= 300) {
        let parsedBody: any;
        try {
          parsedBody = fullText ? JSON.parse(fullText) : {};
        } catch {
          parsedBody = {};
        }
        finish(() => resolve({ status, body: parsedBody }));
        return;
      }
      if (sawSse) {
        if (streamError) {
          // Mid-stream failure: quota was not charged for a delivered reply.
          finish(() => resolve({ status: 503, body: streamError }));
          return;
        }
        const reply = typeof donePayload?.reply === 'string' ? donePayload.reply : accumulated;
        finish(() => resolve({ status: 200, body: donePayload ? { ...donePayload, reply } : { reply } }));
        return;
      }
      let parsedBody: any;
      try {
        parsedBody = fullText ? JSON.parse(fullText) : {};
      } catch {
        parsedBody = {};
      }
      finish(() => resolve({ status, body: parsedBody }));
    };
    xhr.onerror = () => finish(() => reject(new Error('Network request failed')));
    xhr.ontimeout = () => finish(() => reject(new Error('Network request failed')));

    try {
      xhr.open('POST', url);
      Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      bumpIdle();
      xhr.send(body);
    } catch (e) {
      finish(() => reject(e as Error));
    }
  });
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

