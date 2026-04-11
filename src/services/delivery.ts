import { Coordinates, DeliveryQuote, DeliveryTier } from "../types";

export const DELIVERY_TIERS: DeliveryTier[] = [
  { label: "Livraison offerte", maxDistanceKm: 2, fee: 0 },
  { label: "Zone proche", maxDistanceKm: 5, fee: 2 },
  { label: "Zone standard", maxDistanceKm: 8, fee: 4.5 },
  { label: "Zone etendue", maxDistanceKm: Number.POSITIVE_INFINITY, fee: 7 },
];

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
  const tier = DELIVERY_TIERS.find((entry) => distanceKm <= entry.maxDistanceKm) ?? DELIVERY_TIERS[DELIVERY_TIERS.length - 1];
  const estimatedMinutes = Math.max(18, Math.round(12 + distanceKm * 4.5));

  return {
    distanceKm,
    fee: tier.fee,
    tierLabel: tier.label,
    estimatedMinutes,
    estimatedLabel: `${estimatedMinutes}-${estimatedMinutes + 8} min`,
  };
}

export function calculateServiceFee(subtotal: number) {
  return Number((subtotal * 0.08).toFixed(2));
}
