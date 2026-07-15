import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { Courier } from "./types";

const TOKEN_KEY = "speedz.courier.token";

type Coordinates = { latitude: number; longitude: number };

type CourierContextValue = {
  hydrated: boolean;
  token: string | null;
  courier: Courier | null;
  location: Coordinates | null;
  login: (phone: string) => Promise<Courier>;
  logout: () => Promise<void>;
  setCourier: (courier: Courier) => void;
  refreshLocation: () => Promise<Coordinates | null>;
};

const CourierContext = createContext<CourierContextValue | null>(null);

export function useCourier() {
  const ctx = useContext(CourierContext);
  if (!ctx) throw new Error("useCourier must be used within CourierProvider");
  return ctx;
}

// Enregistre le token Expo Push du device auprès du backend (best-effort).
async function registerForPush() {
  try {
    if (!Device.isDevice) return;
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Courses",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      await api.registerPushToken(tokenData.data);
    }
  } catch {
    // best-effort : ne bloque jamais la connexion
  }
}

export function CourierProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [courier, setCourierState] = useState<Courier | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);

  const refreshLocation = useCallback(async (): Promise<Coordinates | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;
      const position = await Location.getCurrentPositionAsync({});
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setLocation(coords);
      return coords;
    } catch {
      return null;
    }
  }, []);

  // Restaure une session enregistrée au démarrage.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_KEY);
        if (saved) {
          setToken(saved);
          api.setCourierToken(saved);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Partage périodique de la position tant qu'une session est active.
  useEffect(() => {
    if (!token) {
      locationWatcher.current?.remove();
      locationWatcher.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      locationWatcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 120, timeInterval: 30000 },
        (position) => {
          const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
          setLocation(coords);
          api.updateLocation(coords).catch(() => undefined);
        }
      );
    })();
    return () => {
      cancelled = true;
      locationWatcher.current?.remove();
      locationWatcher.current = null;
    };
  }, [token]);

  const login = useCallback(async (phone: string): Promise<Courier> => {
    const session = await api.authenticate(phone);
    api.setCourierToken(session.token);
    setToken(session.token);
    setCourierState(session.courier);
    await AsyncStorage.setItem(TOKEN_KEY, session.token);
    registerForPush();
    refreshLocation();
    return session.courier;
  }, [refreshLocation]);

  const logout = useCallback(async () => {
    api.setCourierToken(null);
    setToken(null);
    setCourierState(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }, []);

  const setCourier = useCallback((next: Courier) => setCourierState(next), []);

  return (
    <CourierContext.Provider
      value={{ hydrated, token, courier, location, login, logout, setCourier, refreshLocation }}
    >
      {children}
    </CourierContext.Provider>
  );
}
