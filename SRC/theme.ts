/**
 * SafeSpace design system
 * --------------------------------------------------------------
 * Single source of truth for the visual language of the app.
 * Calm, warm and reassuring — built for an emotional-support product.
 *
 * Brand: a grounded terracotta/amber "primary" on a soft cream canvas,
 * paired with a near-cocoa ink for text. Used consistently across every
 * screen so the experience feels cohesive and intentional.
 */

export const colors = {
  /* Brand */
  primary: "#C8702A",
  primaryDark: "#A85A1E",
  primaryDarker: "#8A4A18",
  primarySoft: "#F0DCC8",
  primarySofter: "#F7EAD9",
  onPrimary: "#FFF8F0",
  onPrimaryMuted: "#F5D9B8",

  /* Surfaces (warm, low-contrast cream) */
  background: "#FDF6EC",
  surface: "#FFF8F0",
  surfaceAlt: "#FFF3E8",

  /* Text */
  text: "#3D2000",
  textMuted: "#B0937A",
  textSubtle: "#9E7C63",
  textFaint: "#C0A080",

  /* Lines */
  border: "#F0DCC8",
  borderStrong: "#E8D0B8",

  /* Semantic */
  danger: "#D32F2F",
  dangerDark: "#C53030",
  dangerBg: "#FFF0F0",
  dangerBorder: "#FFCDD2",
  success: "#2E7D32",
  overlay: "rgba(61,32,0,0.45)",
  scrim: "rgba(0,0,0,0.45)",
  onDark: "#FFFFFF",
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  sheet: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: "#7A4A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  press: {
    shadowColor: "#C8702A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const typography = {
  hero: 32,
  title: 24,
  heading: 22,
  subsection: 20,
  body: 15,
  label: 13,
  caption: 12,
} as const;

export const theme = { colors, radius, spacing, shadow, typography };
export default theme;
