export const lightColors = {
  brand: "#FF7622",
  brandStrong: "#F36E26",
  brandSoft: "#FFF3EC",
  brandSurface: "#FFF9F1",
  ink: "#181C2E",
  text: "#111827",
  textMuted: "#64748B",
  textSoft: "#898989",
  textFaint: "#C4C4C4",
  white: "#FFFFFF",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceMuted: "#FAFAFA",
  border: "#ECE7E1",
  borderSoft: "#EFEFEF",
  success: "#22C55E",
  successDark: "#15803D",
  successSoft: "#DCFCE7",
  info: "#3B82F6",
  infoSoft: "#EFF6FF",
  danger: "#EF4444",
  dangerDark: "#B91C1C",
  dangerSoft: "#FEF2F2",
  warningDark: "#D97706",
  overlay: "rgba(24,28,46,0.5)",
} as const;

/**
 * Palette sombre. Les clés sont identiques à `lightColors` pour que le même code
 * fonctionne dans les deux thèmes. La couleur de marque reste orange (identité),
 * les fonds passent en tons sombres et les textes s'inversent.
 */
export type ThemeColors = { [K in keyof typeof lightColors]: string };

export const darkColors: ThemeColors = {
  brand: "#FF8A3D",
  brandStrong: "#FF7622",
  brandSoft: "#2A2118",
  brandSurface: "#241C14",
  ink: "#F3F4F6",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  textSoft: "#8B8B90",
  textFaint: "#5B5B62",
  white: "#1C1C22",
  background: "#0F0F12",
  surface: "#1A1A20",
  surfaceMuted: "#232329",
  border: "#2E2E36",
  borderSoft: "#2A2A31",
  success: "#4ADE80",
  successDark: "#22C55E",
  successSoft: "#14301F",
  info: "#60A5FA",
  infoSoft: "#16233A",
  danger: "#F87171",
  dangerDark: "#EF4444",
  dangerSoft: "#3A1B1B",
  warningDark: "#F59E0B",
  overlay: "rgba(0,0,0,0.6)",
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Thème par défaut (clair) — conservé pour compatibilité avec les écrans qui
 * ne sont pas encore migrés vers `useTheme()`.
 */
export const mobileTheme = {
  colors: lightColors,
  radius,
} as const;

export function alignStart(isRTL: boolean) {
  return { textAlign: isRTL ? "right" : "left" } as const;
}

export function rowDirection(isRTL: boolean) {
  return { flexDirection: isRTL ? "row-reverse" : "row" } as const;
}
