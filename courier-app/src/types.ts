export type Courier = {
  id: string;
  name: string;
  phone: string;
  code: string;
  vehicle: string;
  status: "AVAILABLE" | "ON_DELIVERY" | "OFFLINE";
  zoneLabel?: string | null;
  currentLat?: number | null;
  currentLng?: number | null;
  activeOrders?: number;
  deliveredOrders?: number;
};

export type CourierJob = {
  id: string;
  status: string;
  channel: string;
  restaurantName: string;
  pickupAddress: string;
  pickupCoordinates?: { latitude: number; longitude: number };
  destinationAddress: string;
  destinationCoordinates?: { latitude: number; longitude: number };
  deliveryDistanceKm: number;
  pickupDistanceKm: number | null;
  total: number;
  itemsCount: number;
  createdAt: string;
  compensation: { total: number; base: number; perKm: number };
  customer?: { name: string; phone: string; address: string } | null;
};

export type CourierStats = {
  status: Courier["status"];
  todayEarnings: number;
  todayDeliveries: number;
  totalDeliveries: number;
  totalEarnings: number;
};

export type CourierDashboard = {
  courier: Courier;
  stats?: CourierStats;
  availableJobs: CourierJob[];
  activeJobs: CourierJob[];
  history: CourierJob[];
};

export type CourierSession = {
  token: string;
  courier: Courier;
};
