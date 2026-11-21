import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { apiFetch } from '../api/client';
import { useToken } from '../context/TokenContext';

// TEMPORARY diagnostic. Delete this file and its <PlanDebug /> line when done.
const BUILD_MARK = 'plan-debug-1';

export default function PlanDebug() {
  const token = useToken();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('(tap "Run check")');

  const runCheck = async () => {
    setBusy(true);
    const lines: string[] = [];
    const user = auth().currentUser;
    lines.push(`uid: ${user ? user.uid.slice(0, 8) : 'NO USER'}`);
    for (const path of ['/api/user/usage', '/api/user/plan']) {
      const started = Date.now();
      try {
        const res = await apiFetch(path);
        const text = await res.text();
        lines.push(`${path} -> ${res.status} in ${Date.now() - started}ms`);
        lines.push(text.slice(0, 500));
      } catch (e: any) {
        lines.push(`${path} FAILED in ${Date.now() - started}ms: ${String(e?.message ?? e)}`);
      }
    }
    setResult(lines.join('\n'));
    setBusy(false);
  };

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <TouchableOpacity style={styles.tag} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.tagText}>DEBUG</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.panel}>
          <Text style={styles.text} selectable>
            {BUILD_MARK}
            {'\n'}
            {`context: plan=${token.plan} trialAvailable=${token.trialAvailable} trialUsed=${token.trialUsed} dev=${token.isDeveloper} loading=${token.loading} refreshFailed=${token.refreshFailed}`}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={runCheck} disabled={busy}>
            <Text style={styles.btnText}>{busy ? 'Running...' : 'Run check'}</Text>
          </TouchableOpacity>
          <ScrollView style={styles.scroll}>
            <Text style={styles.text} selectable>
              {result}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 40,
    left: 8,
    right: 8,
    zIndex: 9999,
    elevation: 20,
    alignItems: 'flex-end',
  },
  tag: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: { color: '#0f0', fontSize: 11, fontWeight: '700' },
  panel: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 380,
  },
  text: { color: '#0f0', fontSize: 11 },
  btn: {
    backgroundColor: '#d96b00',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 8,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  scroll: { maxHeight: 220 },
});