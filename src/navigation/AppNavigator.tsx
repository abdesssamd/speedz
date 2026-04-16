import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Text, View } from "react-native";
import { AppNotification } from "../components/AppNotification";
import { useApp } from "../context/AppContext";
import { AuthOnboardingScreen } from "../screens/AuthOnboardingScreen";
import { AddressesScreen } from "../screens/AddressesScreen";
import { CartScreen } from "../screens/CartScreen";
import { CheckoutScreen } from "../screens/CheckoutScreen";
import { ConfirmOrderScreen } from "../screens/ConfirmOrderScreen";
import { CourierHubScreen } from "../screens/CourierHubScreen";
import { HelpScreen } from "../screens/HelpScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { LanguageScreen } from "../screens/LanguageScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { PartnerApplicationScreen } from "../screens/PartnerApplicationScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RestaurantScreen } from "../screens/RestaurantScreen";
import { RestaurantHubScreen } from "../screens/RestaurantHubScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { CheckoutDraft } from "../types";

export type RootStackParamList = {
  AuthOnboarding: undefined;
  MainTabs: undefined;
  Restaurant: { restaurantId: string };
  Checkout: undefined;
  ConfirmOrder: { draft: CheckoutDraft };
  PartnerApplication: { type?: "RESTAURANT" | "COURIER" } | undefined;
  CourierHub: undefined;
  RestaurantHub: undefined;
  Addresses: undefined;
  Notifications: undefined;
  Language: undefined;
  Invite: undefined;
  Help: undefined;
};

export type TabParamList = {
  Home: undefined;
  Explore: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();

function TabsNavigator() {
  const { cart, t } = useApp();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#EA580C",
        tabBarInactiveTintColor: "#7C6F64",
        tabBarStyle: {
          height: 78,
          borderTopWidth: 0,
          backgroundColor: "#FFFDF9",
          paddingBottom: 12,
          paddingTop: 10,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: "absolute",
          shadowColor: "#0F172A",
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontWeight: "800",
          fontSize: 11,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: "sparkles",
            Explore: "search",
            Cart: "bag-handle",
            Orders: "receipt",
            Profile: "person-circle",
          };

          const isActive = color === "#EA580C";
          return (
            <View
              style={{
                backgroundColor: isActive ? "#FFF1E8" : "transparent",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
              }}
            >
              <Ionicons name={iconMap[route.name as keyof TabParamList]} size={size} color={color} />
            </View>
          );
        },
        tabBarBadge: route.name === "Cart" && cartCount ? cartCount : undefined,
        tabBarBadgeStyle: {
          backgroundColor: "#111827",
          color: "#FFFFFF",
          fontWeight: "800",
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: t("tab_home") }} />
      <Tabs.Screen name="Explore" component={SearchScreen} options={{ title: t("tab_restaurants") }} />
      <Tabs.Screen name="Cart" component={CartScreen} options={{ title: t("tab_cart") }} />
      <Tabs.Screen name="Orders" component={OrdersScreen} options={{ title: t("tab_orders") }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: t("tab_profile") }} />
    </Tabs.Navigator>
  );
}

export function AppNavigator() {
  const { t, isRTL, isAuthenticated } = useApp();

  return (
    <NavigationContainer>
      <AppNotification />
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: "#FFF9F1" },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#FFF9F1" },
          headerTitle: ({ children }) => (
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", writingDirection: isRTL ? "rtl" : "ltr" }}>
              {children}
            </Text>
          ),
        }}
      >
        {!isAuthenticated ? <Stack.Screen name="AuthOnboarding" component={AuthOnboardingScreen} options={{ headerShown: false }} /> : null}
        <Stack.Screen name="MainTabs" component={TabsNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="Restaurant" component={RestaurantScreen} options={{ title: t("nav_restaurant") }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: t("nav_checkout") }} />
        <Stack.Screen
          name="ConfirmOrder"
          component={ConfirmOrderScreen}
          options={{ title: t("nav_confirm") }}
        />
        <Stack.Screen
          name="PartnerApplication"
          component={PartnerApplicationScreen}
          options={{ title: t("nav_partner_application") }}
        />
        <Stack.Screen name="CourierHub" component={CourierHubScreen} options={{ title: t("courier_hub") }} />
        <Stack.Screen name="RestaurantHub" component={RestaurantHubScreen} options={{ title: t("restaurant_hub") }} />
        <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: t("nav_addresses") }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t("nav_notifications") }} />
        <Stack.Screen name="Language" component={LanguageScreen} options={{ title: t("nav_language") }} />
        <Stack.Screen name="Invite" component={InviteScreen} options={{ title: t("nav_invite") }} />
        <Stack.Screen name="Help" component={HelpScreen} options={{ title: t("nav_help") }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
