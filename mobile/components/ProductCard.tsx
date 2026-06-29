import { Image, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '../lib/format';
import type { Product } from '../types/db';

type Props = {
  product: Product;
};

/**
 * Presentational product card: image, brand, title, price. No gesture/state
 * logic lives here — SwipeDeck owns motion, this just renders one item.
 */
export function ProductCard({ product }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No image</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.price}>{formatPrice(product.price, product.currency)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    // Subtle elevation so the top card reads as "above" the next one.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  imageWrap: {
    flex: 1,
    backgroundColor: '#f2f2f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#9a9aa2',
    fontSize: 15,
  },
  info: {
    padding: 18,
    gap: 4,
  },
  brand: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8a8a93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1f',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1f',
    marginTop: 2,
  },
});
