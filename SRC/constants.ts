import { RAZORPAY_KEY_ID as RAZORPAY_KEY_ID_SECRET, GOOGLE_WEB_CLIENT_ID as GOOGLE_WEB_CLIENT_ID_SECRET } from './secrets';

export const BACKEND_URL = 'https://supportapp-backend.vercel.app';

// Re-exported from ./secrets (gitignored). Loaded from env vars at build time.
// Empty/placeholder values fail loudly at runtime instead of silently using a live key.
export const RAZORPAY_KEY_ID = RAZORPAY_KEY_ID_SECRET;
export const GOOGLE_WEB_CLIENT_ID = GOOGLE_WEB_CLIENT_ID_SECRET;

export const SUPPORT_EMAIL = 'emotionalsupapp1912@gmail.com';

export const CRISIS_HELPLINES = {
  iCall: { label: 'iCall', number: '9152987821', availability: 'Mon-Sat, 8am-10pm' },
  vandrevala: { label: 'Vandrevala Foundation', number: '18602662345', availability: '24/7 Free' },
  aasra: { label: 'AASRA', number: '9820466627', availability: '24/7' },
} as const;

export const PLANS = {
  free: { name: 'Free', messages: 20, refreshHours: 5 },
  pro: { name: 'Pro', messages: 80, refreshHours: 4 },
  ultimate: { name: 'Ultimate', messages: 200, refreshHours: 2 },
} as const;

export type PlanKey = keyof typeof PLANS;

export const REFRESH_INTERVAL_MS: Record<PlanKey, number> = {
  free: PLANS.free.refreshHours * 60 * 60 * 1000,
  pro: PLANS.pro.refreshHours * 60 * 60 * 1000,
  ultimate: PLANS.ultimate.refreshHours * 60 * 60 * 1000,
};

export const MESSAGE_LIMITS: Record<PlanKey, number> = {
  free: PLANS.free.messages,
  pro: PLANS.pro.messages,
  ultimate: PLANS.ultimate.messages,
};

export const VALID_PERSONALITIES = [
  'Father',
  'Mother',
  'Sister',
  'Brother',
  'Friend',
  'Best Friend',
  'Mentor',
  'Guide',
  'Husband',
  'Wife',
  'Boyfriend',
  'Girlfriend',
] as const;

export type Personality = typeof VALID_PERSONALITIES[number];

export const VALID_RELIGIONS = [
  'islamic',
  'hindu',
  'christian',
  'buddhist',
  'jewish',
  'spiritual',
  'secular',
] as const;

export type ReligionSubType = typeof VALID_RELIGIONS[number];

export const TIER_UNLOCKS: Record<PlanKey, string[]> = {
  free: ['Father', 'Mother', 'Brother', 'Sister'],
  pro: ['Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Best Friend', 'Mentor', 'Guide'],
  ultimate: ['Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Best Friend', 'Mentor', 'Guide', 'Boyfriend', 'Girlfriend', 'Husband', 'Wife'],
};

export const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: '#F0DCC8', text: '#7A4A1A', border: '#C8702A' },
  pro: { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
  ultimate: { bg: '#FDF6EC', text: '#C8702A', border: '#C8702A' },
};

export const APP_VERSION = '1.0.0';
