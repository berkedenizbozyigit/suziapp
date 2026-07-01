import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../components/ui';
import { supabase } from '../lib/supabase';
import { colors, radii, space } from '../theme/tokens';

type Row = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

const ROWS: Row[] = [
  { key: 'sizes', label: 'My Sizes', icon: 'shirt-outline' },
  { key: 'style', label: 'Style Profile', icon: 'color-palette-outline' },
  { key: 'alerts', label: 'My Alerts', icon: 'notifications-outline' },
];

/** Profile — account shell per the mockup: identity, Suzi Premium+, and the
 *  settings rows. Rows are presentational until their features ship. */
export function ProfileScreen() {
  const [note, setNote] = useState<string | null>(null);

  // Anonymous auth: surface a short id so the account still feels real.
  const [shortId, setShortId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setShortId(data.user ? data.user.id.slice(0, 8) : null);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 1600);
    return () => clearTimeout(t);
  }, [note]);

  const flashNote = useCallback((msg: string) => setNote(msg), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.textMuted} />
          </View>
          <View style={styles.identityText}>
            <Text variant="titleSm">Guest</Text>
            <Text variant="bodySm" color={colors.textFaint}>
              {shortId ? `Swiping anonymously · ${shortId}` : 'Swiping anonymously'}
            </Text>
          </View>
        </View>

        {/* premium */}
        <View style={styles.premium}>
          <View style={styles.premiumTop}>
            <Ionicons name="sparkles" size={20} color={colors.red} />
            <Text variant="titleSm" color={colors.red}>
              Suzi Premium+
            </Text>
          </View>
          <Text variant="bodySm" color={colors.textMuted}>
            Unlimited swipes, price-drop alerts, and early access to drops.
          </Text>
          <Button label="Learn more" onPress={() => flashNote('Premium is coming soon')} />
        </View>

        {/* settings */}
        <View style={styles.rows}>
          {ROWS.map((row) => (
            <Pressable
              key={row.key}
              style={styles.row}
              onPress={() => flashNote(`${row.label} is coming soon`)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={row.icon} size={20} color={colors.ink} />
              </View>
              <Text variant="body" style={styles.rowLabel}>
                {row.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {note ? (
        <View style={styles.noteBar} pointerEvents="none">
          <Text variant="bodySm" color={colors.white} numberOfLines={1}>
            {note}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.xl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.n100,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { gap: 2 },
  premium: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.redSoft,
  },
  premiumTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rows: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: { width: 28, alignItems: 'center' },
  rowLabel: { flex: 1 },
  noteBar: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(14,14,14,0.92)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    maxWidth: '90%',
  },
});
