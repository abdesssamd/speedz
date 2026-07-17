import Constants from "expo-constants";
import { NativeModules, Platform } from "react-native";
import { Ad, Courier, CourierDashboard, CourierJob, CourierSession } from "./types";

// Backend de production (fallback pour les builds release — voir eas.json env).
const PRODUCTION_API_URL = "https://speedz.microtechdz13.com";

function getDevServerHost(): string | null {
  // Sur le web, l'app est servie par Metro : on repart de l'hôte de la page.
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }

  const expoHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    null;
  if (expoHost) return String(expoHost).split(":")[0];

  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  return scriptURL.match(/https?:\/\/([^/:]+)/i)?.[1] ?? null;
}

function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  if (!__DEV__) return PRODUCTION_API_URL;

  // Port du backend SpeedZ en local (voir backend/.env : PORT=4100).
  const host = getDevServerHost();
  if (host && !["localhost", "127.0.0.1"].includes(host)) return `http://${host}:4100`;
  if (Platform.OS === "android") return "http://10.0.2.2:4100";
  return "http://localhost:4100";
}

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 20000;

let courierToken: string | null = null;
export function setCourierToken(token: string | null) {
  courierToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(courierToken ? { Authorization: `Bearer ${courierToken}` } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error("La connexion a expiré. Vérifiez votre connexion internet.");
    }
    throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion internet.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Erreur réseau");
  }
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_BASE_URL,
  setCourierToken,
  authenticate(phone: string, password: string) {
    return request<CourierSession>("/api/courier/auth", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
  },
  register(input: {
    applicantName: string;
    email: string;
    phone: string;
    city: string;
    vehicle: string;
    password: string;
    zone?: string;
    notes?: string;
  }) {
    return request<{ ok: boolean; applicationId: string }>("/api/applications", {
      method: "POST",
      body: JSON.stringify({
        type: "COURIER",
        applicantName: input.applicantName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        vehicle: input.vehicle,
        password: input.password,
        zone: input.zone || undefined,
        notes: input.notes || undefined,
      }),
    });
  },
  getJobs(input: { lat?: number; lng?: number }) {
    const params = new URLSearchParams();
    if (input.lat !== undefined) params.set("lat", String(input.lat));
    if (input.lng !== undefined) params.set("lng", String(input.lng));
    return request<CourierDashboard>(`/api/courier/jobs?${params.toString()}`);
  },
  acceptJob(orderId: string) {
    return request<{ job: CourierJob }>(`/api/courier/jobs/${orderId}/accept`, { method: "POST" });
  },
  confirmJob(orderId: string) {
    return request<{ job: CourierJob }>(`/api/courier/jobs/${orderId}/confirm`, { method: "POST" });
  },
  updateJobStatus(orderId: string, status: "OnTheWay" | "Delivered") {
    return request<{ job: CourierJob }>(`/api/courier/jobs/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },
  setAvailability(online: boolean) {
    return request<{ courier: Courier }>("/api/courier/availability", {
      method: "POST",
      body: JSON.stringify({ online }),
    });
  },
  registerPushToken(token: string) {
    return request<{ ok: boolean }>("/api/courier/push-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  updateLocation(input: { latitude: number; longitude: number }) {
    return request<{ ok: boolean }>("/api/courier/location", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  // Publicités destinées à l'app livreur (placements COURIER_*).
  getAds(placement: "COURIER_SPLASH" | "COURIER_BANNER") {
    return request<Ad[]>(`/api/ads?placement=${placement}`);
  },
};
