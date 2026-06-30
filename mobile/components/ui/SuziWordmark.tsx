import { Text as RNText } from 'react-native';

import { colors, fonts } from '../../theme/tokens';

type Props = { size?: number; color?: string };

/**
 * The "suzi" wordmark. First-pass: heavy lowercase sans in brand red. The
 * prototype uses Menorah Grotesk (embedded in index.html) — swap the fontFamily
 * here once that face is bundled; nothing else needs to change.
 */
export function SuziWordmark({ size = 28, color = colors.red }: Props) {
  return (
    <RNText
      accessibilityRole="header"
      allowFontScaling={false}
      style={{
        fontFamily: fonts.sansBold,
        fontSize: size,
        lineHeight: size * 1.05,
        color,
        letterSpacing: -1,
      }}
    >
      suzi
    </RNText>
  );
}
