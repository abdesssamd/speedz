// Palette et espacements de l'app livreur SpeedZ (alignés sur l'orange de la marque).
export const theme = {
  colors: {
    primary: "#FF7622",
    primaryDark: "#E4600F",
    background: "#0F172A",
    surface: "#111C33",
    card: "#FFFFFF",
    cardMuted: "#F1F5F9",
    text: "#0F172A",
    textLight: "#FFFFFF",
    textMuted: "#64748B",
    border: "#E2E8F0",
    success: "#16A34A",
    danger: "#DC2626",
    warning: "#F59E0B",
    info: "#2563EB",
  },
  radius: { sm: 8, md: 14, lg: 22 },
  spacing: (n: number) => n * 8,
};

// Étiquettes FR des statuts de commande côté livreur.
export const STATUS_LABELS: Record<string, string> = {
  AwaitingCourier: "À prendre",
  Accepted: "Prise — à confirmer",
  Confirmed: "Confirmée",
  Preparing: "En préparation",
  OnTheWay: "En route",
  Delivered: "Livrée",
  Cancelled: "Annulée",
};
