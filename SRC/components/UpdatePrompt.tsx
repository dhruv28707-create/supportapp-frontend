import React, { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { checkForUpdate, UpdateStatus } from '../services/appUpdate';

const dismissKey = (latest: number) => `update_prompt_dismissed_${latest}`;

/**
 * "Please update the app" popup. Mounted once in App.tsx.
 *  - required: cannot be closed, only "Update now".
 *  - available: can be closed with "Later"; stays quiet for that release.
 */
export default function UpdatePrompt() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await checkForUpdate();
      if (cancelled || !result) return;
      if (!result.required) {
        const dismissed = await AsyncStorage.getItem(dismissKey(result.latestVersionCode)).catch(() => null);
        if (dismissed) return;
      }
      if (!cancelled) setStatus(result);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const openStore = () => {
    Linking.openURL(status.storeUrl).catch(() => {});
  };

  const later = () => {
    AsyncStorage.setItem(dismissKey(status.latestVersionCode), '1').catch(() => {});
    setStatus(null);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      // Android back button: ignored when the update is mandatory.
      onRequestClose={status.required ? () => {} : later}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>{status.required ? 'Update required' : 'Update available'}</Text>
          <Text style={styles.body}>
            {status.required
              ? 'This version is no longer supported. Please update to the latest version to keep chatting.'
              : 'A new version of the app is ready with improvements and fixes.'}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openStore} activeOpacity={0.85}>
            <Text style={styles.primaryText}>Update now</Text>
          </TouchableOpacity>
          {!status.required && (
            <TouchableOpacity style={styles.laterBtn} onPress={later} activeOpacity={0.7}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 36, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  body: { fontSize: 14, color: colors.text, opacity: 0.75, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  primaryBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' },
  laterBtn: { paddingVertical: 12, marginTop: 4 },
  laterText: { fontSize: 14, color: colors.text, opacity: 0.6, fontWeight: '600' },
});