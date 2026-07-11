import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { darkColors, lightColors, radius, ThemeColors } from "./mobile";

export type ThemeMode = "system" | "light" | "dark";
type Scheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  scheme: Scheme;
  isDark: boolean;
  colors: ThemeColors;
  radius: typeof radius;
  setMode: (mode: ThemeMode) => void;
};

const STORAGE_KEY = "speedz.theme.mode";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const osScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  // Restaure le choix persistant au démarrage.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === "light" || value === "dark" || value === "system") {
          setModeState(value);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  const scheme: Scheme = mode === "system" ? (osScheme === "dark" ? "dark" : "light") : mode;

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = scheme === "dark";
    return {
      mode,
      scheme,
      isDark,
      colors: isDark ? darkColors : lightColors,
      radius,
      setMode,
    };
  }, [mode, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook principal : renvoie le thème courant (couleurs, mode, setMode…). */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Repli sûr si un écran est monté hors provider (ex: tests) : thème clair.
    return {
      mode: "light",
      scheme: "light",
      isDark: false,
      colors: lightColors,
      radius,
      setMode: () => {},
    };
  }
  return ctx;
}

/** Raccourci quand seules les couleurs sont nécessaires. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
