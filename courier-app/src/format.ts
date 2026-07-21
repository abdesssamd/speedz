// Devise de l'application : dinar algérien, alignée sur l'app client (DA).
export function formatCurrency(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(2)} DA`;
}

export function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
