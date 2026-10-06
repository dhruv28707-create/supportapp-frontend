import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToken } from '../context/TokenContext';
import { startUltimateTrial, TrialApiError } from '../services/safeSpaceApi';
import { colors } from '../theme';

const DISMISS_KEY = 'safespace:trial-banner-dismissed';

const DAY_MS = 24 * 60 * 60 * 1000;

export function trialDaysLeft(trialEndsAt: number | string | null): number {
  if (trialEndsAt === null || trialEndsAt === undefined || trialEndsAt === '') return 0;
  const ms = typeof trialEndsAt === 'number' ? trialEndsAt : new Date(trialEndsAt).getTime();
  if (isNaN(ms)) return 0;
  return Math.max(0, Math.ceil((ms - Date.now()) / DAY_MS));
}

export default function TrialBanner({ compact = false }: { compact?: boolean }) {
  const { isTrial, trialEndsAt, trialAvailable, refreshPlan } = useToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooling, setCooling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISMISS_KEY)
      .then((v) => {
        if (v === '1') setDismissed(true);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISS_KEY, '1').catch(() => {});
  };

  const onStartTrial = async () => {
    if (busy || cooling) return;
    setBusy(true);
    setError(null);
    try {
      await startUltimateTrial();
      await refreshPlan();
    } catch (e: any) {
      const code = e instanceof TrialApiError ? e.code : undefined;
      const status = e instanceof TrialApiError ? e.status : undefined;
      if (
        code === 'trial_already_used' ||
        code === 'already_subscribed' ||
        code === 'trial_not_eligible'
      ) {
        await refreshPlan().catch(() => {});
      } else if (status === 429) {
        setCooling(true);
        setError('Too many attempts. Please try again in a bit.');
        setTimeout(() => setCooling(false), 30000);
      } else {
        setError(e?.message || 'Could not start trial');
      }
    } finally {
      setBusy(false);
    }
  };

  if (isTrial) {
    const left = trialDaysLeft(trialEndsAt);
    return (
      <View style={[styles.banner, compact && styles.bannerCompact]}>
        <Text style={styles.bannerTitle}>Ultimate trial</Text>
        <Text style={styles.bannerSub}>
          {left} day{left === 1 ? '' : 's'} left — enjoy every persona.
        </Text>
      </View>
    );
  }

  if (trialAvailable && !dismissed) {
    return (
      <View style={styles.cta}>
        <Text style={styles.ctaTitle}>Try Ultimate free for 5 days</Text>
        <Text style={styles.ctaSub}>All 13 personas and 200 messages every 2 hours. No payment required.</Text>
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity style={styles.ctaBtn} onPress={onStartTrial} disabled={busy || cooling} activeOpacity={0.85}>
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.ctaBtnText}>Start my free 5-day trial</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} disabled={busy} activeOpacity={0.7}>
          <Text style={styles.link}>Not now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.primaryDarker,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    width: '100%',
  },
  bannerCompact: { padding: 10, marginBottom: 8 },
  bannerTitle: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
  bannerSub: { color: colors.onPrimaryMuted, fontSize: 12, marginTop: 2 },
  cta: {
    backgroundColor: colors.onPrimary,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  ctaSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 12 },
  error: { fontSize: 13, color: colors.danger, marginBottom: 8, textAlign: 'center' },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  ctaBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
  link: { color: colors.textMuted, fontSize: 13, marginTop: 10, fontWeight: '600' },
});
