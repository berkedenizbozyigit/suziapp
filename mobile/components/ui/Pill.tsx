import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadow, space } from '../../theme/tokens';
import { Text } from './Text';

type Variant = 'light' | 'red' | 'dark';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  leading?: string; // e.g. "←"
  trailing?: string; // e.g. "→"
  style?: StyleProp<ViewStyle>;
};

/** Small rounded chip used for back/Filters/folder-context pills in the deck. */
export function Pill({ label, onPress, variant = 'light', leading, trailing, style }: Props) {
  const v = VARIANT[variant];
  const Wrapper: typeof View | typeof Pressable = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.pill, { backgroundColor: v.bg }, variant === 'light' && shadow.soft, style]}
    >
      <Text variant="bodyMedium" color={v.fg}>
        {leading ? `${leading}  ` : ''}
        {label}
        {trailing ? `  ${trailing}` : ''}
      </Text>
    </Wrapper>
  );
}

const VARIANT: Record<Variant, { bg: string; fg: string }> = {
  light: { bg: colors.white, fg: colors.ink },
  red: { bg: colors.red, fg: colors.white },
  dark: { bg: 'rgba(14,14,14,0.55)', fg: colors.white },
};

const styles = StyleSheet.create({
  pill: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
