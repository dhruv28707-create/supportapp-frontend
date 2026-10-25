import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export default function DeveloperBadge({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Text style={[styles.text, compact && styles.textCompact]}>DEVELOPER</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeCompact: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  text: {
    color: colors.onPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  textCompact: { fontSize: 9, letterSpacing: 0.6 },
});
