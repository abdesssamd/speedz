import { Language } from "../types";

export function formatCurrency(value: number) {
  return `${value.toFixed(2)} DA`;
}

export function formatDateTime(value: string, language: Language = "fr") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
