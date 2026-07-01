import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../components/ui';
import { listFolderProducts } from '../lib/folders';
import { formatPrice } from '../lib/format';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadow, space } from '../theme/tokens';
import type { Product } from '../types/db';

type Props = NativeStackScreenProps<RootStackParamList, 'FolderDetail'>;
type Status = 'loading' | 'error' | 'ready';

/** A folder ("conversation") — its saved items plus "continue this search",
 *  which re-runs the folder's saved query_text back into the swipe deck so more
 *  matches flow into the same folder. */
export function FolderDetailScreen({ route, navigation }: Props) {
  const { folderId, folderName, queryText } = route.params;
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      setProducts(await listFolderProducts(folderId));
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't load this folder.");
      setStatus('error');
    }
  }, [folderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canContinue = Boolean(queryText && queryText.trim());

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
          <Text variant="bodyMedium">Picks</Text>
        </Pressable>
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
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text variant="title">{folderName}</Text>
          {canContinue ? (
            <Text variant="bodySm" color={colors.textMuted} style={styles.queryLine}>
              You searched: “{queryText}”
            </Text>
          ) : null}

          {canContinue ? (
            <View style={styles.continueRow}>
              <Button
                label="Continue this search"
                trailing="→"
                full
                onPress={() =>
                  navigation.navigate('Swipe', {
                    query: queryText ?? undefined,
                    folderId: folderId ?? undefined,
                    folderName,
                  })
                }
              />
            </View>
          ) : null}

          {products.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text variant="titleSm">Nothing here yet</Text>
              <Text variant="bodySm" color={colors.textMuted} align="center">
                {canContinue
                  ? 'Continue the search and your likes will land here.'
                  : 'Items you swipe right on Discover collect here.'}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {products.map((p) => (
                <View key={p.id} style={styles.item}>
                  <View style={styles.itemImageWrap}>
                    {p.image_url ? (
                      <Image source={{ uri: p.image_url }} style={styles.itemImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.itemImage, styles.itemPlaceholder]}>
                        <Text variant="bodySm" color={colors.textFaint}>
                          No image
                        </Text>
                      </View>
                    )}
                  </View>
                  {p.brand ? (
                    <Text variant="label" color={colors.textFaint} numberOfLines={1}>
                      {p.brand.toUpperCase()}
                    </Text>
                  ) : null}
                  <Text variant="bodySm" numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text variant="price">{formatPrice(p.price, p.currency)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: 44,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  content: { paddingHorizontal: space.xl, paddingBottom: space.xxxl, gap: space.xs },
  queryLine: { marginTop: space.xs },
  continueRow: { marginTop: space.md, marginBottom: space.lg },
  emptyBlock: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.xl,
    marginTop: space.sm,
  },
  item: { width: '48%', gap: 2 },
  itemImageWrap: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.n100,
    marginBottom: space.xs,
    ...shadow.soft,
  },
  itemImage: { width: '100%', height: '100%' },
  itemPlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
