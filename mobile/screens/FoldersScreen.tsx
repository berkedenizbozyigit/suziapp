import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../components/ui';
import { listFolderCards, type FolderCard } from '../lib/folders';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadow, space } from '../theme/tokens';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Status = 'loading' | 'error' | 'ready';

/** Picks tab — the user's folders, each a saved search ("conversation"). Folders
 *  are created automatically the first time you save from a search (see
 *  SwipeScreen), so this screen is read-only: browse + open. */
export function FoldersScreen() {
  const navigation = useNavigation<Nav>();
  const [cards, setCards] = useState<FolderCard[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await listFolderCards();
      setCards(next);
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't load your folders.");
      setStatus('error');
    }
  }, []);

  // Refetch on focus so folders/counts update after swiping in the deck.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Picks</Text>
        <Text variant="bodySm" color={colors.textMuted}>
          Every search becomes a folder — pick up where you left off.
        </Text>
      </View>

      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.red} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Text variant="titleSm">Something went wrong</Text>
          <Text variant="bodySm" color={colors.textMuted} align="center">
            {errorMsg}
          </Text>
          <Button label="Try again" onPress={() => void load()} />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text variant="titleSm">No folders yet</Text>
          <Text variant="bodySm" color={colors.textMuted} align="center">
            Search on Discover and swipe right — your picks land here as a folder.
          </Text>
          <Button label="Start searching" onPress={() => navigation.navigate('Tabs')} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {cards.map((card) => (
            <Pressable
              key={card.id ?? '__all__'}
              style={styles.card}
              onPress={() =>
                navigation.navigate('FolderDetail', {
                  folderId: card.id,
                  folderName: card.name,
                  queryText: card.queryText,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`${card.name}, ${card.count} items`}
            >
              <View style={styles.cover}>
                {card.coverImage ? (
                  <Image source={{ uri: card.coverImage }} style={styles.coverImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.coverImg, styles.coverPlaceholder]}>
                    <Ionicons name="folder-outline" size={28} color={colors.textFaint} />
                  </View>
                )}
              </View>
              <Text variant="titleSm" numberOfLines={2} style={styles.cardName}>
                {card.name}
              </Text>
              <Text variant="bodySm" color={colors.textFaint}>
                {card.count} items
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md, gap: space.xs },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.xl,
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  card: { width: '48%', gap: space.xs },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.n100,
    ...shadow.soft,
  },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardName: { marginTop: space.xs },
});
