// ============================================================================
// Suzi design system — single source of truth for color, type, spacing, radii.
// Extracted from the prototype (index.html CSS vars + the 5 app mockups).
// Every screen/component reads from here; never hardcode a hex or font elsewhere.
// ============================================================================

export const colors = {
  // Brand
  ink: '#0E0E0E', // near-black, primary text + icons
  red: '#B01E1E', // primary action, logo, active tab, hearts
  redDark: '#8E1818',
  redSoft: 'rgba(176,30,30,0.06)', // tinted red surfaces (e.g. folder-add chip)
  cream: '#FEFEEC', // warm brand background (landing / onboarding)
  paper: '#FFFFFF', // app screen background
  blue: '#CEE7F2', // user chat bubble
  blueInk: '#1A4D5C', // text on the blue bubble

  // Neutral scale (Tailwind-ish, matches the prototype's grays)
  n50: '#FAFAFA',
  n100: '#F4F4F4',
  n200: '#E5E5E5',
  n400: '#A3A3A3',
  n600: '#525252',
  n900: '#171717',

  // Semantic aliases
  text: '#0E0E0E',
  textMuted: '#525252',
  textFaint: '#A3A3A3',
  surface: '#F4F4F4', // search bar, suzi chat bubble, list rows
  surfaceAlt: '#FAFAFA',
  border: '#E5E5E5',
  white: '#FFFFFF',
} as const;

// Font family names exactly as exported by @expo-google-fonts/* (verified).
export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

// Type scale — each variant pairs a family with size/line-height so callers just
// pick a role. Serif = editorial titles; sans = everything else.
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38 }, // "What are we hunting today?"
  title: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 32 }, // screen titles
  titleSm: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26 }, // card titles
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22 },
  bodySm: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.sansSemibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8 }, // "SUZI'S PICKS"
  button: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20 },
  price: { fontFamily: fonts.sansBold, fontSize: 14, lineHeight: 18 },
} as const;

export type TypeVariant = keyof typeof type;

// 4-pt spacing scale.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

// One reusable soft card shadow (iOS shadow* + Android elevation).
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
