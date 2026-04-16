import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import {
  AuthMethod,
  CartItem,
  CartSummary,
  CheckoutDraft,
  CourierDashboard,
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

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const devServerHost = getDevServerHost();
  if (devServerHost && !["localhost", "127.0.0.1"].includes(devServerHost)) {
    return `http://${devServerHost}:4100`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4100";
  }

  return "http://localhost:4100";
}

const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = API_BASE_URL.replace(/^http/i, "ws");
let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "Erreur reseau");
  }

  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  setAuthToken: setApiAuthToken,
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
  getCourierJobs(input: { courierId: string; lat?: number; lng?: number }) {
    const params = new URLSearchParams({ courierId: input.courierId });
    if (input.lat !== undefined) params.set("lat", String(input.lat));
    if (input.lng !== undefined) params.set("lng", String(input.lng));
    return request<CourierDashboard>(`/api/courier/jobs?${params.toString()}`);
  },
  acceptCourierJob(orderId: string, courierId: string) {
    return request<{ job: Order & { customerName?: string; customerPhone?: string; destinationAddress?: string } }>(
      `/api/courier/jobs/${orderId}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ courierId }),
      }
    );
  },
  updateCourierLocation(input: { courierId: string; latitude: number; longitude: number }) {
    return request<{ ok: boolean }>("/api/courier/location", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
