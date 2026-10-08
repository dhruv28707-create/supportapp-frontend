import RazorpayCheckout from 'react-native-razorpay';
import { apiFetch, ApiError } from '../api/client';
import { BACKEND_URL } from '../constants';
import type { PlanInfo } from '../hooks/usePlan';

export type Plan = 'free' | 'pro' | 'ultimate';

export interface PlanState {
  plan: Plan;
  messagesRemaining: number;
  nextRefreshAt: number | string | null;
  isLimitReached: boolean;
  expiresAt: string | null;
  isTrial: boolean;
  trialEndsAt: number | string | null;
  trialUsed: boolean;
  trialAvailable: boolean;
  showRefillTimer: boolean;
  messagesUsed: number;
  messagesTotal: number;
  quotaPercent: number;
  refillInMs: number | null;
  refreshHours: number | null;
}

export interface PlanOption {
  id: string;
  plan: Plan;
  tier: string | null;
  label: string;
  description: string;
  currency: 'INR';
  amountPaise: number;
  amount: number;
  period: 'monthly' | 'yearly' | null;
  messageLimit: number;
  refreshHours: number;
  highlights: string[];
  recommended: boolean;
}

export interface RazorpayCheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class TrialApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.error || `Request failed (${status})`);
    this.name = 'TrialApiError';
    this.status = status;
    this.body = body;
  }
  /** Machine-readable code, e.g. 'trial_already_used', 'already_subscribed'. */
  get code(): string | undefined {
    return this.body?.code;
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new TrialApiError(res.status, data);
  return data as T;
}

function toPlanState(data: any): PlanState {
  const isTrial = data?.isTrial ?? false;
  const trialUsed = data?.trialUsed ?? false;
  const messagesRemaining = data?.messagesRemaining ?? 0;
  const messagesTotal = data?.messagesTotal ?? 0;
  const messagesUsed =
    data?.messagesUsed ?? (messagesTotal > 0 ? Math.max(0, messagesTotal - messagesRemaining) : 0);
  const quotaPercent =
    typeof data?.quotaPercent === 'number'
      ? data.quotaPercent
      : messagesTotal > 0
        ? Math.min(1, Math.max(0, messagesUsed / messagesTotal))
        : 0;
  return {
    plan: (data?.plan as Plan) || 'free',
    messagesRemaining,
    nextRefreshAt: data?.nextRefreshAt ?? null,
    isLimitReached: data?.isLimitReached ?? false,
    expiresAt: data?.expiresAt ?? null,
    isTrial,
    trialEndsAt: data?.trialEndsAt ?? null,
    trialUsed,
    trialAvailable: data?.trialAvailable ?? (!isTrial && !trialUsed),
    showRefillTimer: data?.showRefillTimer ?? false,
    messagesUsed,
    messagesTotal,
    quotaPercent,
    refillInMs: typeof data?.refillInMs === 'number' ? data.refillInMs : null,
    refreshHours: typeof data?.refreshHours === 'number' ? data.refreshHours : null,
  };
}

export interface UsageState extends PlanState {
  uiHints: {
    showQuotaInUsageOnly: boolean;
    hideQuotaInLobby: boolean;
    hideQuotaInChat: boolean;
  } | null;
}

function toUsageState(data: any): UsageState {
  const base = toPlanState(data);
  return {
    ...base,
    uiHints: data?.uiHints
      ? {
          showQuotaInUsageOnly: data.uiHints.showQuotaInUsageOnly ?? true,
          hideQuotaInLobby: data.uiHints.hideQuotaInLobby ?? true,
          hideQuotaInChat: data.uiHints.hideQuotaInChat ?? true,
        }
      : null,
  };
}

/** GET /api/user/plan */
export async function fetchPlan(): Promise<PlanState> {
  const res = await apiFetch('/api/user/plan');
  const data = await parseOrThrow<any>(res);
  return toPlanState(data);
}

/** GET /api/user/usage */
export async function fetchUsage(): Promise<UsageState> {
  const res = await apiFetch('/api/user/usage');
  const data = await parseOrThrow<any>(res);
  return toUsageState(data);
}

/** GET /api/plans */
export async function fetchPlans(): Promise<{ currency: string; options: PlanOption[] }> {
  try {
    const res = await apiFetch('/api/plans');
    return await parseOrThrow(res);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) throw e;
    const res = await fetch(`${BACKEND_URL}/api/plans`);
    return await parseOrThrow(res);
  }
}

/** POST /api/trial/start */
export async function startUltimateTrial(): Promise<{
  success: true;
  isTrial: true;
  plan: 'ultimate';
  trialDays: number;
  startedAt: string;
  trialEndsAt: string;
  expiresAt: string;
}> {
  const res = await apiFetch('/api/trial/start', { method: 'POST', body: JSON.stringify({}) });
  return parseOrThrow(res);
}

/** POST /api/payment-order */
export function createPaymentOrder(tier: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}> {
  return apiFetch('/api/payment-order', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  }).then((res) =>
    parseOrThrow<{ orderId: string; amount: number; currency: string; keyId: string }>(res),
  );
}

/** POST /api/payment-verify */
export function verifyPayment(p: RazorpayCheckoutResult): Promise<{
  success: boolean;
  plan: Plan;
  expiresAt: string | null;
  alreadyVerified?: boolean;
}> {
  return apiFetch('/api/payment-verify', {
    method: 'POST',
    body: JSON.stringify(p),
  }).then((res) =>
    parseOrThrow<{
      success: boolean;
      plan: Plan;
      expiresAt: string | null;
      alreadyVerified?: boolean;
    }>(res),
  );
}

/** POST /api/payment-cancel */
export function cancelSubscription(): Promise<{ ok: boolean; message: string }> {
  return apiFetch('/api/payment-cancel', { method: 'POST', body: JSON.stringify({}) }).then((res) =>
    parseOrThrow<{ ok: boolean; message: string }>(res),
  );
}

/**
 * DELETE /api/account — server-side purge only.
 *
 * The purge can take 60s+, so callers must pass a long timeout (60-90s).
 * Returns the raw status + parsed body WITHOUT throwing so the caller can
 * branch exactly per backend contract:
 *   200 { success:true, firebaseAuthDeleted !== false } → deleted, safe to sign out
 *   500 { code:'auth_delete_failed' }                  → Auth record survived, stay signed in
 *   409 { code:'active_subscription' }                 → cancel first, then retry
 *   401 { code:'auth/user-not-found' }                 → already deleted, safe to sign out
 *
 * Do NOT call currentUser.delete() and do NOT delete Firestore docs
 * client-side (firestore.rules denies user doc delete for non-admins).
 * Never treat timeout/abort as success — let it throw to the caller.
 */
export const DELETE_ACCOUNT_TIMEOUT_MS = 75_000;

export interface DeleteAccountResponse {
  status: number;
  body: any;
}

export async function requestAccountDeletion(
  timeoutMs: number = DELETE_ACCOUNT_TIMEOUT_MS,
): Promise<DeleteAccountResponse> {
  try {
    const res = await apiFetch('/api/account', { method: 'DELETE' }, timeoutMs);
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (e: any) {
    // apiFetch throws ApiError(401) instead of returning the 401 response
    // (it refreshes the token once, then signs out locally). For the delete
    // flow that means "token no longer valid" — i.e. the Auth record is
    // already gone — so surface it as data, not a throw, letting the caller
    // take the already-deleted + sign-out path. Timeouts/aborts rethrow:
    // they must never look like success.
    if (e?.name === 'ApiError' && e?.status === 401) {
      return { status: 401, body: { code: 'auth/user-not-found', error: e?.message } };
    }
    throw e;
  }
}

/** Order -> Razorpay checkout -> verify. Returns the fresh plan. */
export async function buyPlan(
  tier: string,
  meta?: { name?: string; description?: string; email?: string; contact?: string; username?: string },
): Promise<PlanInfo> {
  const order = await createPaymentOrder(tier);
  const orderKey = order.keyId;
  if (!orderKey || !order.orderId) {
    throw new Error('Payment order is missing keyId/orderId. Please try again.');
  }
  const result = (await RazorpayCheckout.open({
    key: orderKey,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: meta?.name ?? 'SafeSpace',
    description: meta?.description ?? 'Subscription',
    prefill: { email: meta?.email || '', contact: meta?.contact || '', name: meta?.username || '' },
  })) as unknown as RazorpayCheckoutResult;
  await verifyPayment(result);
  return fetchPlan();
}
