import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../components/ui';
import { colors, radii, shadow, space } from '../theme/tokens';

type TabKey = 'Discover' | 'Picks' | 'AskSuzi' | 'WindowShop' | 'Profile';

const ICON: Record<TabKey, keyof typeof Ionicons.glyphMap> = {
  Discover: 'apps-outline',
  Picks: 'folder-outline',
  AskSuzi: 'chatbubble',
  WindowShop: 'grid-outline',
  Profile: 'person-outline',
};

const LABEL: Record<TabKey, string> = {
  Discover: 'Discover',
  Picks: 'Picks',
  AskSuzi: 'Ask Suzi',
  WindowShop: 'Window Shop',
  Profile: 'Profile',
};

/** Custom bottom tab bar — the center "Ask Suzi" tab is a raised red circle. */
export function SuziTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {state.routes.map((route, index) => {
        const key = route.name as TabKey;
        const focused = state.index === index;
        const isCenter = key === 'AskSuzi';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button">
              <View style={[styles.centerCircle, shadow.soft]}>
                <Ionicons name={ICON[key]} size={24} color={colors.white} />
              </View>
              <Text variant="label" color={focused ? colors.red : colors.textFaint} style={styles.centerLabel}>
                {LABEL[key]}
              </Text>
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.item} accessibilityRole="button">
            <Ionicons name={ICON[key]} size={22} color={focused ? colors.red : colors.ink} />
            <Text variant="label" color={focused ? colors.red : colors.textFaint} style={styles.label}>
              {LABEL[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0,
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18, // lift it above the bar
  },
  centerLabel: {
    fontSize: 11,
    letterSpacing: 0,
  },
});
