import {
  GOOGLE_WEB_CLIENT_ID as GOOGLE_WEB_CLIENT_ID_CONFIG,
  GOOGLE_IOS_CLIENT_ID as GOOGLE_IOS_CLIENT_ID_CONFIG,
} from './secrets';

export const BACKEND_URL = 'https://supportapp-backend.vercel.app';

export const GOOGLE_WEB_CLIENT_ID = GOOGLE_WEB_CLIENT_ID_CONFIG;
export const GOOGLE_IOS_CLIENT_ID = GOOGLE_IOS_CLIENT_ID_CONFIG;

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
  'Best Friend',
  'Mentor',
  'Guide',
  'Stranger',
] as const;

export type Personality = typeof VALID_PERSONALITIES[number];

/**
 * Personas the backend no longer accepts (it answers 400 for them). Old
 * saved conversations may still carry these names, so the app keeps them
 * readable but never sends them to the server. 'BF' / 'GF' are legacy
 * shorthands that older builds stored.
 */
const RETIRED_PERSONALITY_LABELS: Record<string, string> = {
  Friend: 'Friend',
  Husband: 'Husband',
  Wife: 'Wife',
  Boyfriend: 'Boyfriend',
  Girlfriend: 'Girlfriend',
  BF: 'Boyfriend',
  GF: 'Girlfriend',
};

/** Display name of a retired persona, or null if `value` is not retired. */
export function getRetiredPersonalityLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(RETIRED_PERSONALITY_LABELS, value)
    ? RETIRED_PERSONALITY_LABELS[value]
    : null;
}

export function isRetiredPersonality(value: unknown): boolean {
  return getRetiredPersonalityLabel(value) !== null;
}

export const STRANGER_PERSONALITY = 'Stranger' as const;

export function isStrangerPersonality(personality: string | null | undefined): boolean {
  return personality === STRANGER_PERSONALITY;
}

/** Free personas. Must match FREE_PERSONALITIES in the backend constants. */
export const FREE_PERSONALITIES: readonly string[] = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
];

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
  free: ['Father', 'Mother', 'Brother', 'Sister', 'Stranger'],
  pro: ['Father', 'Mother', 'Brother', 'Sister', 'Best Friend', 'Mentor',],
  ultimate: ['Father', 'Mother', 'Brother', 'Sister', 'Best Friend', 'Mentor', 'Guide', 'Stranger'],
};

export const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: '#F0DCC8', text: '#7A4A1A', border: '#C8702A' },
  pro: { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
  ultimate: { bg: '#FDF6EC', text: '#C8702A', border: '#C8702A' },
};

export const APP_VERSION = '1.0.0';