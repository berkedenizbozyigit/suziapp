import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '../../theme/tokens';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  /** Appended after the label, e.g. "→" on "Start swiping". */
  trailing?: string;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The Suzi button. Primary = red pill (the dominant CTA in every mockup). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  trailing,
  loading = false,
  disabled = false,
  full = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const v = VARIANT[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg },
        full && styles.full,
        (pressed || isDisabled) && styles.dim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text variant="button" color={v.fg}>
          {label}
          {trailing ? `  ${trailing}` : ''}
        </Text>
      )}
    </Pressable>
  );
}

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.red, fg: colors.white },
  secondary: { bg: colors.white, fg: colors.ink, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.ink },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: { height: 48, paddingHorizontal: space.xxl },
  lg: { height: 58, paddingHorizontal: space.xxxl },
  full: { alignSelf: 'stretch' },
  dim: { opacity: 0.6 },
});
