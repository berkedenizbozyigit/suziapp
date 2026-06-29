import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatPrice } from '../lib/format';
import { fetchSavedItems, groupByFolder, type SavedEntry, type SavedSection } from '../lib/queries';

type Status = 'loading' | 'error' | 'ready';

export function SavedScreen() {
  const [sections, setSections] = useState<SavedSection[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setStatus('loading');
    else setRefreshing(true);
    setErrorMsg(null);
    try {
      const items = await fetchSavedItems();
      setSections(groupByFolder(items));
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Kayıtlar yüklenemedi.');
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  // Refresh whenever the tab regains focus, so newly swiped items show up.
  useFocusEffect(
    useCallback(() => {
      void load('refresh');
    }, [load])
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <ActivityIndicator size="large" color="#1a1a1f" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.safe, styles.center]} edges={['top']}>
        <Text style={styles.stateTitle}>Bir şeyler ters gitti</Text>
        <Text style={styles.stateBody}>{errorMsg}</Text>
        <Pressable style={styles.retryButton} onPress={() => void load('initial')}>
          <Text style={styles.retryText}>Tekrar dene</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList<SavedEntry, SavedSection>
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load('refresh')} />
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>
            {section.title} · {section.data.length}
          </Text>
        )}
        renderItem={({ item }) => <SavedRow entry={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.stateTitle}>Henüz kayıt yok</Text>
            <Text style={styles.stateBody}>
              Discover'da sağa kaydırarak beğendiklerini buraya ekle.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SavedRow({ entry }: { entry: SavedEntry }) {
  const product = entry.products;
  return (
    <View style={styles.row}>
      {product?.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.rowInfo}>
        {product?.brand ? <Text style={styles.rowBrand}>{product.brand}</Text> : null}
        <Text style={styles.rowTitle} numberOfLines={2}>
          {product?.title ?? 'Ürün bulunamadı'}
        </Text>
        <Text style={styles.rowPrice}>
          {formatPrice(product?.price ?? null, product?.currency ?? null)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f7fa',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8a8a93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#f7f7fa',
    paddingVertical: 8,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ececf1',
  },
  thumb: {
    width: 64,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f2f2f5',
  },
  thumbPlaceholder: {
    backgroundColor: '#e6e6ec',
  },
  rowInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  rowBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a93',
    textTransform: 'uppercase',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1f',
  },
  rowPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1f',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1f',
  },
  stateBody: {
    fontSize: 15,
    color: '#6b6b73',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a1f',
  },
  retryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
