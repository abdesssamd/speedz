import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "./src/api";
import { CourierProvider, useCourier } from "./src/CourierContext";
import { ActiveScreen } from "./src/screens/ActiveScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { JobsScreen } from "./src/screens/JobsScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { theme } from "./src/theme";
import { CourierDashboard } from "./src/types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Tab = "jobs" | "active" | "profile";

function Dashboard() {
  const insets = useSafeAreaInsets();
  const { courier, setCourier, location, refreshLocation } = useCourier();
  const [dashboard, setDashboard] = useState<CourierDashboard | null>(null);
  const [tab, setTab] = useState<Tab>("jobs");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const coords = location ?? (await refreshLocation());
      const payload = await api.getJobs({ lat: coords?.latitude, lng: coords?.longitude });
      setDashboard(payload);
      setCourier(payload.courier);
    } catch {
      // conserve l'état précédent en cas d'échec réseau
    } finally {
      setInitialLoading(false);
    }
  }, [location, refreshLocation, setCourier]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Chargement initial + rafraîchissement périodique (filet en plus du push).
  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  // Rafraîchit dès qu'une notification de nouvelle course arrive.
  const responseRef = useRef<Notifications.Subscription | null>(null);
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => load());
    responseRef.current = Notifications.addNotificationResponseReceivedListener(() => {
      setTab("jobs");
      load();
    });
    return () => {
      received.remove();
      responseRef.current?.remove();
    };
  }, [load]);

  if (initialLoading && !dashboard) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const availableJobs = dashboard?.availableJobs ?? [];
  const activeJobs = dashboard?.activeJobs ?? [];
  const history = dashboard?.history ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.body}>
        {tab === "jobs" && (
          <JobsScreen jobs={availableJobs} refreshing={refreshing} onRefresh={refresh} onChanged={refresh} />
        )}
        {tab === "active" && (
          <ActiveScreen jobs={activeJobs} refreshing={refreshing} onRefresh={refresh} onChanged={refresh} />
        )}
        {tab === "profile" && (
          <ProfileScreen courier={courier} stats={dashboard?.stats} history={history} onChanged={refresh} />
        )}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabButton label="Courses" icon="🛵" active={tab === "jobs"} badge={availableJobs.length} onPress={() => setTab("jobs")} />
        <TabButton label="En cours" icon="📦" active={tab === "active"} badge={activeJobs.length} onPress={() => setTab("active")} />
        <TabButton label="Profil" icon="👤" active={tab === "profile"} onPress={() => setTab("profile")} />
      </View>
    </View>
  );
}

function TabButton({
  label,
  icon,
  active,
  badge,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <View>
        <Text style={styles.tabIcon}>{icon}</Text>
        {badge ? (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Root() {
  const { hydrated, token } = useCourier();
  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }
  return token ? <Dashboard /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.flex}>
        <CourierProvider>
          <Root />
        </CourierProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 10,
  },
  tabButton: { flex: 1, alignItems: "center", gap: 3 },
  tabIcon: { fontSize: 22, textAlign: "center" },
  tabLabel: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  tabLabelActive: { color: theme.colors.primary },
  tabBadge: {
    position: "absolute",
    top: -6,
    right: -12,
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
