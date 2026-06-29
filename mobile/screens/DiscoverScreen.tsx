import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SwipeDeck } from '../components/SwipeDeck';
import { fetchProducts, saveProduct } from '../lib/queries';
import type { Product } from '../types/db';

type Status = 'loading' | 'error' | 'ready';

export function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  // Transient, non-blocking feedback for the last swipe action.
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setStatus('loading');
    setErrorMsg(null);
    setExhausted(false);
    setNote(null);
    try {
      const items = await fetchProducts(q);
      setProducts(items);
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Ürünler yüklenemedi.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load('');
  }, [load]);

  const handleSwipeRight = useCallback(async (product: Product) => {
    try {
      await saveProduct(product);
      setNote(`Kaydedildi · ${product.title}`);
    } catch (e) {
      setNote(`Kaydedilemedi · ${e instanceof Error ? e.message : 'bilinmeyen hata'}`);
    }
  }, []);

  const handleSwipeLeft = useCallback((product: Product) => {
    setNote(`Atlandı · ${product.title}`);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Ne arıyorsun?"
          placeholderTextColor="#9a9aa2"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void load(query)}
          returnKeyType="search"
          autoCorrect={false}
        />
        <Pressable
          style={styles.searchButton}
          onPress={() => void load(query)}
          accessibilityRole="button"
        >
          <Text style={styles.searchButtonText}>Ara</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1a1a1f" />
          </View>
        ) : status === 'error' ? (
          <View style={styles.center}>
            <Text style={styles.stateTitle}>Bir şeyler ters gitti</Text>
            <Text style={styles.stateBody}>{errorMsg}</Text>
            <Pressable style={styles.retryButton} onPress={() => void load(query)}>
              <Text style={styles.retryText}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.stateTitle}>Sonuç yok</Text>
            <Text style={styles.stateBody}>Farklı bir arama deneyebilirsin.</Text>
          </View>
        ) : exhausted ? (
          <View style={styles.center}>
            <Text style={styles.stateTitle}>Hepsini gördün 🎉</Text>
            <Text style={styles.stateBody}>Yeni ürünler için tekrar ara.</Text>
            <Pressable style={styles.retryButton} onPress={() => void load(query)}>
              <Text style={styles.retryText}>Yenile</Text>
            </Pressable>
          </View>
        ) : (
          <SwipeDeck
            products={products}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            onExhausted={() => setExhausted(true)}
          />
        )}
      </View>

      {note ? (
        <View style={styles.noteBar} pointerEvents="none">
          <Text style={styles.noteText} numberOfLines={1}>
            {note}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f7f7fa',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1f',
    borderWidth: 1,
    borderColor: '#e6e6ec',
  },
  searchButton: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1a1a1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
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
  noteBar: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(26,26,31,0.92)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    maxWidth: '90%',
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
