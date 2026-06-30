import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuziWordmark, Text } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radii, shadow, space } from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Curated "picks" — until real curated folders exist, these seed a real AI
// search (query) and carry a folder label into the deck. Images are seed-catalog
// photos used as 2×2 collages.
const img = (n: number) => `https://picsum.photos/seed/suzi-${n}/300/300`;
const PICKS: Array<{ id: string; title: string; subtitle: string; query: string; images: string[] }> = [
  { id: 'budget', title: "Hailey's Edit on a Budget", subtitle: '32 pieces · updated weekly', query: 'everyday casual basics affordable', images: [img(3), img(10), img(12), img(4)] },
  { id: 'euro', title: 'Euro Summer 2026', subtitle: '48 pieces · trending', query: 'linen summer dress sandals light', images: [img(3), img(5), img(7), img(11)] },
  { id: 'corporate', title: 'Corporate Queen', subtitle: '27 pieces · workwear', query: 'blazer tailored trousers shirt office', images: [img(1), img(5), img(2), img(8)] },
  { id: 'flat', title: 'Grown-Up Flat', subtitle: '21 pieces · home & living', query: 'minimal neutral wardrobe staples', images: [img(6), img(2), img(4), img(9)] },
];

export function DiscoverScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  const runSearch = (text: string) => {
    const q = text.trim();
    if (!q) return;
    navigation.navigate('Swipe', { query: q });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* top bar */}
        <View style={styles.topBar}>
          <SuziWordmark size={30} />
          <View style={styles.topRight}>
            <Pressable style={styles.iconBtn} accessibilityRole="button">
              <Ionicons name="notifications-outline" size={20} color={colors.ink} />
            </Pressable>
            <View style={styles.avatar}>
              <Ionicons name="person" size={18} color={colors.textMuted} />
            </View>
          </View>
        </View>

        <Text variant="display" style={styles.headline}>
          What are we hunting today?
        </Text>

        {/* search */}
        <View style={styles.search}>
          <Ionicons name="sparkles" size={18} color={colors.red} />
          <TextInput
            style={styles.input}
            placeholder="Tell Suzi what you need…"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => runSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          <Pressable style={styles.send} onPress={() => runSearch(query)} accessibilityRole="button">
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>

        <Text variant="label" color={colors.textMuted} style={styles.sectionLabel}>
          SUZI'S PICKS
        </Text>

        <View style={styles.grid}>
          {PICKS.map((pick) => (
            <Pressable
              key={pick.id}
              style={styles.pick}
              onPress={() => navigation.navigate('Swipe', { query: pick.query, folderName: pick.title })}
              accessibilityRole="button"
            >
              <View style={styles.collage}>
                {pick.images.slice(0, 4).map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.collageImg} />
                ))}
              </View>
              <Text variant="titleSm" numberOfLines={2} style={styles.pickTitle}>
                {pick.title}
              </Text>
              <Text variant="bodySm" color={colors.textFaint}>
                {pick.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.sm,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.n100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.n100,
    borderWidth: 2,
    borderColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { marginTop: space.lg, marginBottom: space.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    height: 56,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, height: '100%' },
  send: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { marginTop: space.xxl, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.xl },
  pick: { width: '48%', gap: space.xs },
  collage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.n100,
    marginBottom: space.xs,
    ...shadow.soft,
  },
  collageImg: { width: '50%', height: '50%' },
  pickTitle: { marginTop: space.xs },
});
