import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import { reportOffline, reportOnline } from "./connectivity";
import {
  AuthMethod,
  CartItem,
  CartSummary,
  CheckoutDraft,
  CourierDashboard,
  CourierSession,
  Gender,
  LoyaltyEntry,
  Order,
  PartnerApplicationInput,
  PartnerApplicationResponse,
  Promotion,
  Restaurant,
  SavedAddress,
  UserProfile
} from "../types";

type BootstrapResponse = {
  user: UserProfile;
  savedAddresses?: SavedAddress[];
  notificationPreferences?: {
    orderUpdates: boolean;
    promotions: boolean;
    loyalty: boolean;
  };
  restaurants: Restaurant[];
  favorites: string[];
  orders: Order[];
  pointsBalance: number;
  pointsHistory: LoyaltyEntry[];
  promotions?: Promotion[];
  menuCategories?: Array<{ id: string; name: string; sortOrder: number; isActive: boolean }>;
};

export type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  placement: "SPLASH" | "HOME_BANNER";
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  restaurantId: string | null;
  createdAt: string;
};

type MobileConfigResponse = {
  forceUpdate: boolean;
  minimumVersion: string;
  latestVersion: string;
  storeUrl: string | null;
  message?: string | null;
};

function getDevServerHost() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }

  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    null;

  if (expoHost) {
    return expoHost.split(":")[0];
  }

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  const matchedHost = scriptURL.match(/https?:\/\/([^/:]+)/i)?.[1];
  return matchedHost ?? null;
}

// Production backend. Used as the ultimate fallback so a release build never
// points at a dev-only loopback address (which causes "Network request failed").
const PRODUCTION_API_URL = "https://speedz.microtechdz13.com";

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  // In a release build there is no Metro dev server, so the only safe target
  // is the hosted production backend.
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  const devServerHost = getDevServerHost();
  if (devServerHost && !["localhost", "127.0.0.1"].includes(devServerHost)) {
    return `http://${devServerHost}:4000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }

  return "http://localhost:4000";
}

const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = API_BASE_URL.replace(/^http/i, "ws");
let authToken: string | null = null;
let courierToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function setCourierAuthToken(token: string | null) {
  courierToken = token;
}

const REQUEST_TIMEOUT_MS = 20000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    // Un échec du fetch (ou un timeout) signifie que le serveur est injoignable.
    reportOffline();
    // Distinguish an aborted (timed-out) request from a genuine connectivity failure.
    if ((error as Error)?.name === "AbortError") {
      throw new Error("La connexion a expiré. Vérifiez votre connexion internet et réessayez.");
    }
    throw new Error(
      "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez."
    );
  } finally {
    clearTimeout(timeout);
  }

  // La requête a atteint le serveur (même en cas d'erreur HTTP) : on est en ligne.
  reportOnline();

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string; error?: { message?: string } }
      | null;
    throw new Error(errorBody?.error?.message ?? errorBody?.message ?? "Erreur réseau");
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  setAuthToken: setApiAuthToken,
  setCourierToken: setCourierAuthToken,
  bootstrap() {
    return request<BootstrapResponse>("/api/bootstrap");
  },
  requestPhoneCode(input: { phone: string; method: AuthMethod }) {
    return request<{
      challengeId: string;
      method: AuthMethod;
      expiresAt: string;
      provider: string;
      userExists: boolean;
      demoCode?: string;
    }>("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  requestEmailCode(input: { email: string; fullName: string }) {
    return request<{
      challengeId: string;
      expiresAt: string;
      provider: string;
      userExists: boolean;
      demoCode?: string;
    }>("/api/auth/request-email-code", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verifyPhoneCode(input: { challengeId: string; code: string }) {
    return request<{
      verified: boolean;
      challengeId: string;
      userExists: boolean;
      isProfileComplete: boolean;
      phone?: string;
      token?: string;
      user?: UserProfile;
      savedAddresses?: SavedAddress[];
      notificationPreferences?: {
        orderUpdates: boolean;
        promotions: boolean;
        loyalty: boolean;
      };
    }>("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verifyEmailCode(input: { challengeId: string; code: string; email: string; fullName: string; phone: string }) {
    return request<{
      token: string;
      user: UserProfile;
      savedAddresses?: SavedAddress[];
      notificationPreferences?: {
        orderUpdates: boolean;
        promotions: boolean;
        loyalty: boolean;
      };
    }>("/api/auth/verify-email-code", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  registerProfile(input: {
    challengeId: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    email?: string;
    addresses: Array<{ label: string; address: string; coordinates?: { latitude: number; longitude: number } }>;
  }) {
    return request<{
      token: string;
      user: UserProfile;
      savedAddresses: SavedAddress[];
      notificationPreferences?: {
        orderUpdates: boolean;
        promotions: boolean;
        loyalty: boolean;
      };
    }>("/api/auth/register-profile", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getMe() {
    return request<{
      user: UserProfile;
      savedAddresses: SavedAddress[];
      notificationPreferences?: {
        orderUpdates: boolean;
        promotions: boolean;
        loyalty: boolean;
      };
    }>("/api/auth/me");
  },
  getMobileConfig(input: { platform: string; version: string; packageName?: string }) {
    const params = new URLSearchParams({
      platform: input.platform,
      version: input.version,
    });
    if (input.packageName) {
      params.set("packageName", input.packageName);
    }
    return request<MobileConfigResponse>(`/api/mobile-config?${params.toString()}`);
  },
  registerPushToken(token: string) {
    return request<{ ok: boolean }>("/api/notifications/register-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  updateNotificationPreferences(input: { orderUpdates?: boolean; promotions?: boolean; loyalty?: boolean }) {
    return request<{
      notificationPreferences: {
        orderUpdates: boolean;
        promotions: boolean;
        loyalty: boolean;
      };
    }>("/api/auth/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  toggleFavorite(restaurantId: string) {
    return request<{ favorites: string[]; isFavorite: boolean; changedRestaurant: Restaurant }>(
      "/api/favorites/toggle",
      {
        method: "POST",
        body: JSON.stringify({ restaurantId }),
      }
    );
  },
  createOrder(input: {
    restaurantId: string;
    cart: CartItem[];
    draft: CheckoutDraft;
    userCoordinates: { latitude: number; longitude: number };
    promoCode?: string;
    orderChannel?: "DELIVERY" | "QR_ONSITE";
    tableLabel?: string;
  }) {
    return request<{
      order: Order;
      orders: Order[];
      pointsBalance: number;
      pointsHistory: LoyaltyEntry[];
    }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  quoteCart(input: {
    restaurantId: string;
    cart: CartItem[];
    userCoordinates: { latitude: number; longitude: number };
    promoCode?: string;
    orderChannel?: "DELIVERY" | "QR_ONSITE";
  }) {
    return request<CartSummary>("/api/cart/quote", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getAds(placement?: "SPLASH" | "HOME_BANNER") {
    const suffix = placement ? `?placement=${placement}` : "";
    return request<Ad[]>(`/api/ads${suffix}`);
  },
  getPromotions(restaurantId?: string) {
    const suffix = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : "";
    return request<Promotion[]>(`/api/promotions${suffix}`);
  },
  submitPartnerApplication(input: PartnerApplicationInput): Promise<PartnerApplicationResponse> {
    return request<PartnerApplicationResponse>("/api/applications", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  authenticateCourier(phone: string) {
    return request<CourierSession>("/api/courier/auth", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }).then((payload) => {
      setCourierAuthToken(payload.token);
      return payload;
    });
  },
  logoutCourier() {
    setCourierAuthToken(null);
  },
  getCourierJobs(input: { lat?: number; lng?: number }) {
    const params = new URLSearchParams();
    if (input.lat !== undefined) params.set("lat", String(input.lat));
    if (input.lng !== undefined) params.set("lng", String(input.lng));
    return request<CourierDashboard>(`/api/courier/jobs?${params.toString()}`, {
      headers: courierToken ? { Authorization: `Bearer ${courierToken}` } : {},
    });
  },
  acceptCourierJob(orderId: string) {
    return request<{ job: Order & { customerName?: string; customerPhone?: string; destinationAddress?: string } }>(
      `/api/courier/jobs/${orderId}/accept`,
      {
        method: "POST",
        headers: courierToken ? { Authorization: `Bearer ${courierToken}` } : {},
      }
    );
  },
  updateCourierLocation(input: { latitude: number; longitude: number }) {
    return request<{ ok: boolean }>("/api/courier/location", {
      method: "POST",
      headers: courierToken ? { Authorization: `Bearer ${courierToken}` } : {},
      body: JSON.stringify(input),
    });
  },
};
