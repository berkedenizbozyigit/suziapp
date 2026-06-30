import { Image, StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme/tokens';
import type { Product } from '../types/db';
import { Text } from './ui';

/** Full-bleed product image card for the swipe deck (matches the mockup — clean
 *  image, details live on the "scroll for details" sheet, added later). */
export function SwipeCard({ product }: { product: Product }) {
  return (
    <View style={styles.card}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text variant="body" color={colors.textFaint}>
            No image
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.xl,
    backgroundColor: colors.n100,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
