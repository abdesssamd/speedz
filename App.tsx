import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "./src/context/AppContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { api } from "./src/services/api";

type ForceUpdateState = {
  forceUpdate: boolean;
  minimumVersion: string;
  latestVersion: string;
  storeUrl: string | null;
  message?: string | null;
} | null;

const brandLogo = require("./assets/logo.png");

function getCurrentAppVersion() {
  return Constants.expoConfig?.version || "1.0.0";
}

function getAndroidPackageName() {
  return (
    Constants.expoConfig?.android?.package ||
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME ||
    ""
  );
}

export default function App() {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(Platform.OS === "android");
  const [forceUpdateState, setForceUpdateState] = useState<ForceUpdateState>(null);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    let isMounted = true;

    api
      .getMobileConfig({
        platform: Platform.OS,
        version: getCurrentAppVersion(),
        packageName: getAndroidPackageName(),
      })
      .then((config) => {
        if (!isMounted) {
          return;
        }
        setForceUpdateState(config.forceUpdate ? config : null);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setForceUpdateState(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingUpdate(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenStore = async () => {
    const packageName = getAndroidPackageName();
    const marketUrl = packageName ? `market://details?id=${packageName}` : null;
    if (marketUrl) {
      try {
        await Linking.openURL(marketUrl);
        return;
      } catch {
        // Fallback to the HTTPS Play Store URL when the market scheme is unavailable.
      }
    }

    if (forceUpdateState?.storeUrl) {
      await Linking.openURL(forceUpdateState.storeUrl);
    }
  };

  const showForceUpdate = Platform.OS === "android" && forceUpdateState?.forceUpdate;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="dark" />
        {isCheckingUpdate ? (
          <SafeAreaView style={styles.updateScreen}>
            <View style={styles.updateCard}>
              <Image source={brandLogo} style={styles.updateLogo} resizeMode="contain" />
              <ActivityIndicator size="large" color="#F97316" />
              <Text style={styles.updateTitle}>Verification de la version</Text>
              <Text style={styles.updateText}>Nous controlons si une mise a jour Android obligatoire est disponible.</Text>
            </View>
          </SafeAreaView>
        ) : showForceUpdate ? (
          <SafeAreaView style={styles.updateScreen}>
            <View style={styles.updateCard}>
              <Image source={brandLogo} style={styles.updateLogo} resizeMode="contain" />
              <Text style={styles.updateBadge}>Force Update</Text>
              <Text style={styles.updateTitle}>Mise a jour obligatoire</Text>
              <Text style={styles.updateText}>
                {forceUpdateState?.message ||
                  `Une version plus recente est disponible sur le Play Store. Version minimum: ${forceUpdateState?.minimumVersion}.`}
              </Text>
              <Text style={styles.updateMeta}>Version installee: {getCurrentAppVersion()}</Text>
              <Text style={styles.updateMeta}>Version requise: {forceUpdateState?.latestVersion}</Text>
              <Text onPress={() => void handleOpenStore()} style={styles.updateButton}>
                Mettre a jour maintenant
              </Text>
            </View>
          </SafeAreaView>
        ) : (
          <AppNavigator />
        )}
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  updateScreen: {
    flex: 1,
    backgroundColor: "#FFF8F2",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  updateCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#F2E8DD",
  },
  updateLogo: {
    width: 128,
    height: 128,
  },
  updateBadge: {
    backgroundColor: "#FFF1E8",
    color: "#C2410C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "800",
    overflow: "hidden",
  },
  updateTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  updateText: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  updateMeta: {
    color: "#9A3412",
    fontWeight: "700",
  },
  updateButton: {
    width: "100%",
    textAlign: "center",
    backgroundColor: "#F97316",
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    paddingVertical: 16,
    borderRadius: 18,
    overflow: "hidden",
  },
});
