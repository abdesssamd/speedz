export const mobileTheme = {
  colors: {
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
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    pill: 999,
  },
} as const;

export function alignStart(isRTL: boolean) {
  return { textAlign: isRTL ? "right" : "left" } as const;
}

export function rowDirection(isRTL: boolean) {
  return { flexDirection: isRTL ? "row-reverse" : "row" } as const;
}
