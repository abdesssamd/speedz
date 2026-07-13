import { Coordinates, DeliveryConfig, DeliveryQuote, DeliveryTier } from "../types";

export const DELIVERY_TIERS: DeliveryTier[] = [
  { label: "Livraison offerte", maxDistanceKm: 2, fee: 0 },
  { label: "Zone proche", maxDistanceKm: 5, fee: 2 },
  { label: "Zone standard", maxDistanceKm: 8, fee: 4.5 },
  { label: "Zone etendue", maxDistanceKm: Number.POSITIVE_INFINITY, fee: 7 },
];

// Config dynamique (paramétrée par l'admin), injectée au démarrage via setDeliveryConfig.
let activeDeliveryConfig: DeliveryConfig | null = null;

export function setDeliveryConfig(config: DeliveryConfig | null) {
  activeDeliveryConfig = config;
}

function computeFee(distanceKm: number): { fee: number; label: string } {
  const config = activeDeliveryConfig;
  if (config?.mode === "PER_KM" && config.perKm) {
    const { baseFee = 0, pricePerKm = 0, freeUnderKm = 0 } = config.perKm;
    if (distanceKm <= freeUnderKm) return { fee: 0, label: "Livraison offerte" };
    return { fee: Number((baseFee + distanceKm * pricePerKm).toFixed(2)), label: `${distanceKm} km` };
  }

  const zones = (config?.zones?.length ? config.zones : DELIVERY_TIERS)
    .slice()
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
  const zone = zones.find((entry) => distanceKm <= entry.maxDistanceKm) ?? zones[zones.length - 1];
  return { fee: Number(zone.fee) || 0, label: zone.label };
}

const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;

  return Number((2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

export function getDeliveryQuote(userCoordinates: Coordinates, restaurantCoordinates: Coordinates): DeliveryQuote {
  const distanceKm = calculateDistanceKm(userCoordinates, restaurantCoordinates);
  const { fee, label } = computeFee(distanceKm);
  const estimatedMinutes = Math.max(18, Math.round(12 + distanceKm * 4.5));

  return {
    distanceKm,
    fee,
    tierLabel: label,
    estimatedMinutes,
    estimatedLabel: `${estimatedMinutes}-${estimatedMinutes + 8} min`,
  };
}

export function calculateServiceFee(subtotal: number) {
  return Number((subtotal * 0.08).toFixed(2));
}
