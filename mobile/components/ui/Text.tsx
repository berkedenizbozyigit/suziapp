import { Text as RNText, type TextProps } from 'react-native';

import { colors, type as typeScale, type TypeVariant } from '../../theme/tokens';

type Props = TextProps & {
  /** Type role from the scale (display | title | body | label | …). */
  variant?: TypeVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

/**
 * The only Text the app uses. Picks a typographic role from the scale so callers
 * never touch font families or sizes directly — change the scale, change the app.
 */
export function Text({ variant = 'body', color = colors.text, align, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[typeScale[variant], { color }, align ? { textAlign: align } : null, style]}
    />
  );
}
