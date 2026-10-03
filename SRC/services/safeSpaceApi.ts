// ---------------------------------------------------------------------------
// SAFESPACE backend client (React Native).
// Thin typed wrappers around SRC/api/client apiFetch, which already attaches
// the Firebase ID token and retries once on 401.
// Backend endpoints: GET /api/user/plan, GET /api/plans (public),
// POST /api/trial/start, POST /api/payment-order, POST /api/payment-verify,
// POST /api/payment-cancel.
// ---------------------------------------------------------------------------

import RazorpayCheckout from 'react-native-razorpay';
import { apiFetch } from '../api/client';
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
  return {
    plan: (data?.plan as Plan) || 'free',
    messagesRemaining: data?.messagesRemaining ?? 0,
    nextRefreshAt: data?.nextRefreshAt ?? null,
    isLimitReached: data?.isLimitReached ?? false,
    expiresAt: data?.expiresAt ?? null,
    isTrial,
    trialEndsAt: data?.trialEndsAt ?? null,
    trialUsed,
    trialAvailable: data?.trialAvailable ?? (!isTrial && !trialUsed),
  };
}

/** GET /api/user/plan — plan, quota, and trial state. */
export async function fetchPlan(): Promise<PlanState> {
  const res = await apiFetch('/api/user/plan');
  const data = await parseOrThrow<any>(res);
  return toPlanState(data);
}

/** GET /api/plans — public catalog (no auth needed, but apiFetch requires a user; falls back to plain fetch). */
export async function fetchPlans(): Promise<{ currency: string; options: PlanOption[] }> {
  try {
    const res = await apiFetch('/api/plans');
    return await parseOrThrow(res);
  } catch {
    // Public endpoint — retry without auth for logged-out users.
    const { BACKEND_URL } = require('../constants');
    const res = await fetch(`${BACKEND_URL}/api/plans`);
    return await parseOrThrow(res);
  }
}

/** POST /api/trial/start — start the 5-day Ultimate free trial. */
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

/** POST /api/payment-order — create a Razorpay order for a tier. */
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

/** POST /api/payment-verify — verify checkout and activate the plan. */
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

/** POST /api/payment-cancel — immediately cancel a paid plan or a trial. */
export function cancelSubscription(): Promise<{ ok: boolean; message: string }> {
  return apiFetch('/api/payment-cancel', { method: 'POST', body: JSON.stringify({}) }).then((res) =>
    parseOrThrow<{ ok: boolean; message: string }>(res),
  );
}

/** Full paid flow: order -> Razorpay checkout -> verify. Returns the fresh plan. */
export async function buyPlan(
  tier: string,
  meta?: { name?: string; description?: string; email?: string; contact?: string; username?: string },
): Promise<PlanInfo> {
  const order = await createPaymentOrder(tier);
  const result = (await RazorpayCheckout.open({
    key: (order as any).keyId || (order as any).key,
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
