import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
// In Reanimated 4 the thread-hop helpers live in react-native-worklets;
// scheduleOnRN replaces the deprecated runOnJS re-export.
import { scheduleOnRN } from 'react-native-worklets';

import { ProductCard } from './ProductCard';
import type { Product } from '../types/db';

type Props = {
  products: Product[];
  onSwipeRight: (product: Product) => void;
  onSwipeLeft: (product: Product) => void;
  /** Called once the user swipes past the last card. */
  onExhausted?: () => void;
};

// --- Swipe feel tuning -----------------------------------------------------
// A swipe commits if the card is dragged past this fraction of screen width,
// OR flicked faster than the velocity threshold (so a quick flick counts even
// if it didn't travel far). These two constants define the whole gesture feel.
const SWIPE_THRESHOLD_FRACTION = 0.28;
const FLICK_VELOCITY = 800;

/**
 * A Tinder-style card stack. The top card follows the finger and rotates
 * slightly; the next card sits underneath and scales up as the top card leaves.
 * Built on gesture-handler + reanimated (no third-party deck library) so it
 * stays compatible with this exact Expo SDK.
 */
export function SwipeDeck({ products, onSwipeRight, onSwipeLeft, onExhausted }: Props) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // A fresh result set (new search) resets the deck back to the top.
  useEffect(() => {
    setIndex(0);
    translateX.value = 0;
    translateY.value = 0;
  }, [products, translateX, translateY]);

  // Runs on the JS thread (via runOnJS) once a card has animated off-screen.
  const advance = useCallback(
    (direction: 'left' | 'right') => {
      const product = products[index];
      if (product) {
        if (direction === 'right') onSwipeRight(product);
        else onSwipeLeft(product);
      }
      // Recenter for the card that's about to become the top card.
      translateX.value = 0;
      translateY.value = 0;
      setIndex((i) => {
        const next = i + 1;
        if (next >= products.length) onExhausted?.();
        return next;
      });
    },
    [products, index, onSwipeRight, onSwipeLeft, onExhausted, translateX, translateY]
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const passedDistance = Math.abs(e.translationX) > width * SWIPE_THRESHOLD_FRACTION;
      const flicked = Math.abs(e.velocityX) > FLICK_VELOCITY;
      if (passedDistance || flicked) {
        const sign = flicked ? e.velocityX : e.translationX;
        const direction = sign > 0 ? 'right' : 'left';
        const target = direction === 'right' ? width * 1.5 : -width * 1.5;
        translateX.value = withTiming(target, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(advance, direction);
        });
      } else {
        // Not far/fast enough — snap back to center.
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const topStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-width, 0, width], [-8, 0, 8], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotate}deg` },
      ],
    };
  });

  const nextStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, width * 0.5],
      [0.94, 1],
      Extrapolation.CLAMP
    );
    return { transform: [{ scale }] };
  });

  const saveBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, width * 0.25], [0, 1], Extrapolation.CLAMP),
  }));
  const skipBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-width * 0.25, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const current = products[index];
  const next = products[index + 1];
  if (!current) return null; // parent renders the "all swiped" empty state

  return (
    <View style={styles.deck}>
      {next ? (
        <Animated.View style={[styles.cardLayer, nextStyle]} pointerEvents="none">
          <ProductCard product={next} />
        </Animated.View>
      ) : null}

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.cardLayer, topStyle]}>
          <ProductCard product={current} />
          <Animated.View
            style={[styles.badge, styles.saveBadge, saveBadgeStyle]}
            pointerEvents="none"
          >
            <Text style={styles.saveText}>SAVE</Text>
          </Animated.View>
          <Animated.View
            style={[styles.badge, styles.skipBadge, skipBadgeStyle]}
            pointerEvents="none"
          >
            <Text style={styles.skipText}>SKIP</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badge: {
    position: 'absolute',
    top: 24,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 3,
  },
  saveBadge: {
    left: 24,
    borderColor: '#2ecc71',
    transform: [{ rotateZ: '-12deg' }],
  },
  saveText: {
    color: '#2ecc71',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBadge: {
    right: 24,
    borderColor: '#e74c3c',
    transform: [{ rotateZ: '12deg' }],
  },
  skipText: {
    color: '#e74c3c',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
