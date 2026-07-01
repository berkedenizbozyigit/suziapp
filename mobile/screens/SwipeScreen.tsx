import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../components/AuthProvider';
import { SwipeDeck, type SwipeDeckHandle } from '../components/SwipeDeck';
import { Button, Pill, Text } from '../components/ui';
import { SAVES_BEFORE_PROMPT } from '../lib/authGate';
import { getOrCreateFolderForQuery } from '../lib/folders';
import { saveProduct } from '../lib/queries';
import { searchDeck } from '../lib/search';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadow, space } from '../theme/tokens';
import type { Product } from '../types/db';

type Props = NativeStackScreenProps<RootStackParamList, 'Swipe'>;
type Status = 'loading' | 'ready' | 'empty' | 'exhausted' | 'error';

export function SwipeScreen({ route, navigation }: Props) {
  const { query, folderId, folderName, imageDataUri } = route.params ?? {};
  const deckRef = useRef<SwipeDeckHandle>(null);
  const { promptUpgrade } = useAuth();
  // Saves made this session — after a few, softly nudge anonymous users to keep them.
  const sessionSaves = useRef(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [reason, setReason] = useState<string | undefined>();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Session de-dupe: ids already swiped, so "look harder" doesn't repeat them.
  const swiped = useRef<Set<string>>(new Set());
  // The folder saves land in. If we arrived with a folder (continuing one), use
  // it. Otherwise it's resolved lazily on the first save: a text search becomes a
  // named "conversation" folder; an image-only search stays in "All saves".
  const activeFolderId = useRef<string | null>(folderId ?? null);
  const folderResolved = useRef<boolean>(folderId != null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    setReason(undefined);
    try {
      const { products: deck, reason } = await searchDeck({
        text: query,
        imageUrl: imageDataUri,
        folderId,
        excludeProductIds: [...swiped.current],
      });
      setProducts(deck);
      setReason(reason);
      setStatus(deck.length === 0 ? 'empty' : 'ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Search failed.');
      setStatus('error');
    }
  }, [query, folderId, imageDataUri]);

  // Resolve (once) which folder right-swipes save into. Auto-creates a folder for
  // a text search so every search naturally becomes a continuable conversation.
  const resolveFolder = useCallback(async (): Promise<string | null> => {
    if (folderResolved.current) return activeFolderId.current;
    folderResolved.current = true;
    if (query && query.trim()) {
      try {
        activeFolderId.current = await getOrCreateFolderForQuery(query, folderName ?? query);
      } catch {
        activeFolderId.current = null; // fall back to "All saves" if create fails
      }
    } else {
      activeFolderId.current = null; // image-only search → unfiled
    }
    return activeFolderId.current;
  }, [query, folderName]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-dismiss the swipe toast.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 1600);
    return () => clearTimeout(t);
  }, [note]);

  const flash = useCallback((msg: string) => setNote(msg), []);

  const handleSwipeRight = useCallback(
    async (product: Product) => {
      swiped.current.add(product.id);
      try {
        const fid = await resolveFolder();
        await saveProduct(product, fid);
        flash(`Saved · ${product.title}`);
        sessionSaves.current += 1;
        if (sessionSaves.current === SAVES_BEFORE_PROMPT) void promptUpgrade();
      } catch (e) {
        flash(`Couldn't save · ${e instanceof Error ? e.message : 'error'}`);
      }
    },
    [resolveFolder, flash, promptUpgrade],
  );

  const handleSwipeLeft = useCallback(
    (product: Product) => {
      swiped.current.add(product.id);
      flash(`Skipped · ${product.title}`);
    },
    [flash],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
          <Text variant="bodyMedium">Suzi</Text>
        </Pressable>
        <Pressable
          style={styles.filterBtn}
          onPress={() => flash('Filters coming soon')}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text variant="bodyMedium">Filters</Text>
        </Pressable>
      </View>

      {/* deck / states */}
      <View style={styles.body}>
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.red} />
            <Text variant="body" color={colors.textMuted}>
              Suzi is scanning for you…
            </Text>
          </View>
        ) : status === 'error' ? (
          <View style={styles.center}>
            <Text variant="titleSm">Something went wrong</Text>
            <Text variant="bodySm" color={colors.textMuted} align="center">
              {errorMsg}
            </Text>
            <Button label="Try again" onPress={() => void load()} />
          </View>
        ) : status === 'exhausted' ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle" size={40} color={colors.red} />
            <Text variant="titleSm">You've seen them all</Text>
            <Text variant="bodySm" color={colors.textMuted} align="center">
              Your likes are in Picks. Broaden the search for more.
            </Text>
            <Button label="Search wider" onPress={() => void load()} />
            <Button label="Go back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        ) : status === 'empty' ? (
          <View style={styles.center}>
            <Text variant="titleSm">
              {reason === 'provider_unavailable' ? 'Search is unavailable' : 'No matches'}
            </Text>
            <Text variant="bodySm" color={colors.textMuted} align="center">
              {reason === 'provider_unavailable'
                ? 'Try again in a moment.'
                : 'Try a different search.'}
            </Text>
            <Button label="Go back" variant="secondary" onPress={() => navigation.goBack()} />
          </View>
        ) : (
          <SwipeDeck
            ref={deckRef}
            products={products}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onExhausted={() => setStatus('exhausted')}
          />
        )}
      </View>

      {/* folder context + controls */}
      {status === 'ready' ? (
        <View style={styles.controls}>
          {folderName ? (
            <View style={styles.folderRow}>
              <Pill variant="red" label={folderName} trailing="→" />
            </View>
          ) : null}
          <View style={styles.buttons}>
            <Pressable
              style={[styles.circle, styles.skip]}
              onPress={() => deckRef.current?.swipeLeft()}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={30} color={colors.ink} />
            </Pressable>
            <Pressable
              style={[styles.circle, styles.save]}
              onPress={() => deckRef.current?.swipeRight()}
              accessibilityRole="button"
            >
              <Ionicons name="heart" size={32} color={colors.white} />
            </Pressable>
          </View>
        </View>
      ) : null}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 44,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  filterBtn: {
    height: 44,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
  },
  body: { flex: 1, paddingHorizontal: space.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  controls: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md },
  folderRow: { alignItems: 'flex-end' },
  buttons: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xxl, paddingBottom: space.sm },
  circle: { alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  skip: { width: 60, height: 60, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, ...shadow.soft },
  save: { width: 76, height: 76, backgroundColor: colors.red, ...shadow.card },
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
