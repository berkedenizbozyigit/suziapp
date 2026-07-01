import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '../components/ui';
import { formatPrice } from '../lib/format';
import { fetchProducts } from '../lib/queries';
import type { RootStackParamList } from '../navigation/types';
import { colors, radii, shadow, space } from '../theme/tokens';
import type { Product } from '../types/db';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Status = 'loading' | 'error' | 'ready';

/** Window Shop — a no-query browse feed of the latest in-stock pieces. Tapping a
 *  card drops you into the swipe deck seeded to find more like it. */
export function WindowShopScreen() {
  const navigation = useNavigation<Nav>();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    else setStatus('loading');
    setErrorMsg(null);
    try {
      setProducts(await fetchProducts(''));
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Couldn't load the feed.");
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  const openSimilar = (p: Product) => {
    const seed = (p.category ?? p.title ?? '').trim();
    if (seed) navigation.navigate('Swipe', { query: seed });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="title">Window Shop</Text>
        <Text variant="bodySm" color={colors.textMuted}>
          Just browsing — tap anything to find more like it.
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
          <Button label="Try again" onPress={() => void load('initial')} />
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text variant="titleSm">Nothing to show yet</Text>
          <Text variant="bodySm" color={colors.textMuted} align="center">
            New pieces will appear here as the catalog fills up.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} tintColor={colors.red} />
          }
        >
          {products.map((p) => (
            <Pressable
              key={p.id}
              style={styles.card}
              onPress={() => openSimilar(p)}
              accessibilityRole="button"
              accessibilityLabel={`${p.brand ? p.brand + ' ' : ''}${p.title}`}
            >
              <View style={styles.imageWrap}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingHorizontal: space.xxl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: space.xl,
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
  },
  card: { width: '48%', gap: 2 },
  imageWrap: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.n100,
    marginBottom: space.xs,
    ...shadow.soft,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
