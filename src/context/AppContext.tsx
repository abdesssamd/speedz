import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fallbackUserLocation, restaurants as fallbackRestaurants } from "../data/mockData";
import { t as translate } from "../i18n/mobile";
import { calculateServiceFee, getDeliveryQuote } from "../services/delivery";
import { api } from "../services/api";
import {
  CartItem,
  CheckoutDraft,
  InAppNotification,
  LoyaltyEntry,
  LocationState,
  MenuItem,
  Order,
  PaymentMethod,
  Promotion,
  Restaurant,
  SelectedOption,
  Language,
  UserProfile,
  CartSummary,
  NotificationPreferences,
  SavedAddress,
  RestaurantAccount,
  RestaurantBillingSummary,
  RestaurantIngredient,
  RestaurantTable,
  AuthMethod,
  Gender,
} from "../types";

type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "DIFFERENT_RESTAURANT"; restaurantName: string };

type AuthFlowState = {
  selectedMethod: AuthMethod | null;
  phoneNumber: string;
  challengeId: string | null;
  verificationCode: string | null;
  provider: string | null;
  isVerified: boolean;
};

type AppContextValue = {
  user: UserProfile;
  restaurants: Restaurant[];
  favorites: string[];
  cart: CartItem[];
  orders: Order[];
  pointsBalance: number;
  pointsHistory: LoyaltyEntry[];
  savedAddresses: SavedAddress[];
  notificationPreferences: NotificationPreferences;
  promotions: Promotion[];
  menuCategories: string[];
  promoCode: string;
  language: Language;
  isRTL: boolean;
  currentLocation: LocationState;
  notification: InAppNotification | null;
  cartRestaurant: Restaurant | null;
  favoriteRestaurants: Restaurant[];
  restaurantAccounts: RestaurantAccount[];
  currentRestaurantAccount: RestaurantAccount | null;
  currentRestaurant: Restaurant | null;
  authFlow: AuthFlowState;
  isAuthenticated: boolean;
  refreshRemoteData: () => Promise<void>;
  setLanguage: (language: Language) => void;
  setPromoCode: (code: string) => void;
  addSavedAddress: (input: { label: string; address: string; coordinates?: LocationState["coordinates"] }) => void;
  logout: () => Promise<void>;
  beginPhoneAuth: (method: AuthMethod, phoneNumber: string) => Promise<{ ok: boolean; code?: string; error?: string }>;
  verifyPhoneAuth: (code: string) => Promise<boolean>;
  completeRegistration: (input: {
    firstName: string;
    lastName: string;
    gender: Gender;
    email?: string;
    addresses: Array<{ label: string; address: string; coordinates?: LocationState["coordinates"] }>;
  }) => Promise<boolean>;
  updateNotificationPreference: (key: keyof NotificationPreferences, value: boolean) => void;
  applyPromoCode: (code: string) => Promise<boolean>;
  toggleFavorite: (restaurantId: string) => Promise<void>;
  addToCart: (
    restaurant: Restaurant,
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    specialInstructions?: string,
    forceReplaceCart?: boolean
  ) => AddToCartResult;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  removeCartItem: (cartItemId: string) => void;
  clearCart: () => void;
  requestLocation: () => Promise<void>;
  createCheckoutDraft: (input: Partial<CheckoutDraft>) => CheckoutDraft;
  getCartSummary: () => CartSummary;
  placeOrder: (draft: CheckoutDraft) => Promise<{ order: Order | null; error?: string }>;
  addRestaurantMenuItem: (input: {
    name: string;
    description: string;
    category: string;
    price: number;
    ingredientIds: string[];
  }) => void;
  updateRestaurantMenuItem: (menuItemId: string, updates: Partial<Pick<MenuItem, "name" | "description" | "category" | "price" | "ingredientIds">>) => void;
  toggleRestaurantMenuItemAvailability: (menuItemId: string) => void;
  updateRestaurantIngredientStatus: (ingredientId: string, status: RestaurantIngredient["stockStatus"]) => void;
  addRestaurantTable: (input: { label: string; seats: number }) => void;
  dismissNotification: () => void;
  pushNotification: (notification: Omit<InAppNotification, "id">) => void;
  t: (key: Parameters<typeof translate>[1]) => string;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);
const AUTH_TOKEN_STORAGE_KEY = "fooddelyvry_mobile_token";
const BYPASS_MOBILE_AUTH_FOR_DEV = true;

function createCartItemId(item: MenuItem, selectedOptions: SelectedOption[], specialInstructions?: string) {
  const signature = selectedOptions
    .map((option) => `${option.groupId}:${option.choiceId}`)
    .sort()
    .join("|");

  return `${item.id}::${signature}::${specialInstructions?.trim() ?? ""}`;
}

function calculateCartItemUnitPrice(cartItem: CartItem) {
  const optionsTotal = cartItem.selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
  return cartItem.basePrice + optionsTotal;
}

function buildRestaurantBilling(restaurant: Restaurant, orders: Order[]): RestaurantBillingSummary {
  const restaurantOrders = orders.filter((order) => order.restaurantId === restaurant.id);
  const deliveredOrders = restaurantOrders.filter((order) => order.status === "Delivered");

  if (restaurant.billingPlanType === "FIXED_PER_ORDER") {
    const fixedFee = restaurant.billingFixedFee ?? 0;
    return {
      restaurantId: restaurant.id,
      planLabel: "Frais fixe par commande",
      periodLabel: "Mois en cours",
      amountDue: Number((restaurantOrders.length * fixedFee).toFixed(2)),
      ordersCount: restaurantOrders.length,
      projectedNextDue: fixedFee,
    };
  }

  if (restaurant.billingPlanType === "MONTHLY_SUBSCRIPTION") {
    const monthlyFee = restaurant.monthlySubscriptionFee ?? 0;
    return {
      restaurantId: restaurant.id,
      planLabel: "Abonnement mensuel",
      periodLabel: "Mars 2026",
      amountDue: monthlyFee,
      ordersCount: restaurantOrders.length,
      projectedNextDue: monthlyFee,
    };
  }

  const percentage = restaurant.billingPercentage ?? 0;
  const commissionBase = deliveredOrders.reduce((sum, order) => sum + order.subtotal, 0);
  const commission = Number((commissionBase * (percentage / 100)).toFixed(2));

  return {
    restaurantId: restaurant.id,
    planLabel: `Commission ${percentage}%`,
    periodLabel: "Commandes livrees du mois",
    amountDue: commission,
    ordersCount: deliveredOrders.length,
    projectedNextDue: Number((((restaurantOrders[0]?.subtotal ?? 0) * percentage) / 100).toFixed(2)),
  };
}

function createRestaurantTables(restaurant: Restaurant): RestaurantTable[] {
  return Array.from({ length: 6 }, (_, index) => ({
    id: `${restaurant.id}-table-${index + 1}`,
    restaurantId: restaurant.id,
    label: `Table ${index + 1}`,
    seats: index < 2 ? 2 : 4,
    qrValue: `fooddelyvry://restaurant/${restaurant.id}/table/${index + 1}`,
  }));
}

function createRestaurantIngredients(restaurant: Restaurant): RestaurantIngredient[] {
  const labels: Record<string, string> = {
    beef: "Steak boeuf",
    bun: "Pain burger",
    cheddar: "Cheddar",
    pickles: "Pickles",
    "smoke-sauce": "Sauce smoke",
    chicken: "Poulet croustillant",
    iceberg: "Salade iceberg",
    "spicy-mayo": "Spicy mayo",
  };

  const ingredientIds = Array.from(new Set(restaurant.menu.flatMap((item) => item.ingredientIds ?? [])));

  return ingredientIds.map((ingredientId, index) => ({
    id: ingredientId,
    restaurantId: restaurant.id,
    name: labels[ingredientId] ?? ingredientId,
    stockStatus: index === 1 ? "LOW_STOCK" : "IN_STOCK",
    quantityLabel: index === 1 ? "Stock faible" : "Disponible",
  }));
}

function syncMenuAvailability(menu: MenuItem[], ingredients: RestaurantIngredient[]) {
  const outOfStockIngredients = new Set(
    ingredients.filter((ingredient) => ingredient.stockStatus === "OUT_OF_STOCK").map((ingredient) => ingredient.id)
  );

  return menu.map((item) => {
    const hasMissingIngredient = (item.ingredientIds ?? []).some((ingredientId) => outOfStockIngredients.has(ingredientId));
    return {
      ...item,
      isAvailable: !hasMissingIngredient,
    };
  });
}

function createRestaurantAccounts(restaurants: Restaurant[], orders: Order[]) {
  const eligibleRestaurants = restaurants.filter((restaurant) => restaurant.ownerName || restaurant.ownerEmail || restaurant.ownerPhone);
  const sourceRestaurants = eligibleRestaurants.length ? eligibleRestaurants : restaurants.slice(0, 1);

  return sourceRestaurants.map((restaurant) => {
    const ingredients = createRestaurantIngredients(restaurant);
    return {
      restaurantId: restaurant.id,
      contactName: restaurant.ownerName ?? "Gerant du restaurant",
      contactEmail: restaurant.ownerEmail ?? "restaurant@fooddelyvry.app",
      status: "ACTIVE" as const,
      qrValue: restaurant.qrCodeUrl ?? `fooddelyvry://restaurant/${restaurant.id}`,
      menuQrValue: restaurant.qrCodeUrl ?? `fooddelyvry://restaurant/${restaurant.id}/menu`,
      billing: buildRestaurantBilling(restaurant, orders),
      ingredients,
      tables: createRestaurantTables(restaurant),
    };
  });
}

function mergeUserProfile(current: UserProfile, incoming: UserProfile) {
  if (!current.onboardingCompleted) {
    return {
      ...incoming,
      firstName: current.firstName ?? incoming.firstName,
      lastName: current.lastName ?? incoming.lastName,
      gender: current.gender ?? incoming.gender ?? "UNSPECIFIED",
      authMethod: current.authMethod ?? incoming.authMethod,
      isPhoneVerified: current.isPhoneVerified ?? incoming.isPhoneVerified,
      onboardingCompleted: current.onboardingCompleted ?? incoming.onboardingCompleted,
    };
  }

  return {
    ...incoming,
    firstName: current.firstName,
    lastName: current.lastName,
    name: current.name,
    email: current.email || incoming.email,
    phone: current.phone || incoming.phone,
    defaultAddress: current.defaultAddress || incoming.defaultAddress,
    gender: current.gender ?? "UNSPECIFIED",
    authMethod: current.authMethod ?? incoming.authMethod,
    isPhoneVerified: current.isPhoneVerified ?? true,
    onboardingCompleted: true,
  };
}

type RealtimeEnvelope = {
  type: string;
  payload?: {
    order?: Order;
    courier?: {
      id: string;
      currentLat?: number | null;
      currentLng?: number | null;
      status?: string;
      activeOrders?: number;
      deliveredOrders?: number;
    };
    activeOrders?: Order[];
  };
};

function upsertOrder(currentOrders: Order[], incomingOrder: Order) {
  const existing = currentOrders.find((entry) => entry.id === incomingOrder.id);
  const next = existing
    ? currentOrders.map((entry) => (entry.id === incomingOrder.id ? { ...entry, ...incomingOrder } : entry))
    : [incomingOrder, ...currentOrders];

  return [...next].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function syncOrdersWithCourier(currentOrders: Order[], courierPayload: NonNullable<RealtimeEnvelope["payload"]>["courier"]) {
  if (!courierPayload?.id) {
    return currentOrders;
  }

  return currentOrders.map((order) =>
    order.courier?.id === courierPayload.id
      ? {
          ...order,
          courier: {
            ...order.courier,
            currentLat: courierPayload.currentLat ?? order.courier.currentLat,
            currentLng: courierPayload.currentLng ?? order.courier.currentLng,
            status: courierPayload.status ?? order.courier.status,
          },
        }
      : order
  );
}

export function AppProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
    defaultAddress: "",
    gender: "UNSPECIFIED",
    authMethod: undefined,
    isPhoneVerified: false,
    onboardingCompleted: false,
  });
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<LoyaltyEntry[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>({
    orderUpdates: false,
    promotions: false,
    loyalty: false,
  });
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [remoteSummary, setRemoteSummary] = useState<CartSummary | null>(null);
  const [language, setLanguage] = useState<Language>("fr");
  const [currentLocation, setCurrentLocation] = useState<LocationState>(fallbackUserLocation);
  const [notification, setNotification] = useState<InAppNotification | null>(null);
  const [restaurantAccounts, setRestaurantAccounts] = useState<RestaurantAccount[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authFlow, setAuthFlow] = useState<AuthFlowState>({
    selectedMethod: null,
    phoneNumber: "",
    challengeId: null,
    verificationCode: null,
    provider: null,
    isVerified: false,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRTL = language === "ar";
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const isAuthenticated = BYPASS_MOBILE_AUTH_FOR_DEV || Boolean(authToken && user.onboardingCompleted && user.isPhoneVerified);

  const pushNotification = (entry: Omit<InAppNotification, "id">) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setNotification({ id: `${Date.now()}`, ...entry });
    timeoutRef.current = setTimeout(() => setNotification(null), 3200);
  };

  const dismissNotification = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setNotification(null);
  };

  const requestLocation = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setCurrentLocation(fallbackUserLocation);
        pushNotification({
          title: t("location_unavailable"),
          message: fallbackUserLocation.errorMessage ?? "Adresse de demonstration utilisee.",
          tone: "error",
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const reverseLookup = await Location.reverseGeocodeAsync(position.coords);
      const place = reverseLookup[0];
      const label = [place?.name, place?.street, place?.city].filter(Boolean).join(", ") || "Position actuelle";

      setCurrentLocation({
        granted: true,
        coordinates: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        label,
        source: "device",
      });
    } catch {
      setCurrentLocation(fallbackUserLocation);
      pushNotification({
        title: t("gps_error"),
        message: fallbackUserLocation.errorMessage ?? "Impossible de recuperer la localisation.",
        tone: "error",
      });
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        if (!cancelled && storedToken) {
          setAuthToken(storedToken);
          api.setAuthToken(storedToken);
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true);
        }
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshRemoteData = useCallback(async () => {
    const payload = await api.bootstrap();
    const nextRestaurants = payload.restaurants.map((restaurant) => ({
      ...restaurant,
      menu: syncMenuAvailability(restaurant.menu, createRestaurantIngredients(restaurant)),
    }));
    setUser((current) => mergeUserProfile(current, payload.user));
    setSavedAddresses(
      payload.savedAddresses?.length
        ? payload.savedAddresses
        : payload.user.defaultAddress
          ? [
              {
                id: "address-default",
                label: "Maison",
                address: payload.user.defaultAddress,
                isDefault: true,
              },
            ]
          : []
    );
    if (payload.notificationPreferences) {
      setNotificationPreferences(payload.notificationPreferences);
    }
    setRestaurants(nextRestaurants);
    setFavorites(payload.favorites);
    setOrders(payload.orders);
    setPointsBalance(payload.pointsBalance);
    setPointsHistory(payload.pointsHistory);
    setPromotions(payload.promotions ?? []);
    setMenuCategories(
      (payload.menuCategories?.length
        ? payload.menuCategories.map((category) => category.name)
        : Array.from(new Set(nextRestaurants.map((restaurant) => restaurant.category)))
      )
    );
    setRestaurantAccounts(createRestaurantAccounts(nextRestaurants, payload.orders));
  }, []);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!authReady || (!authToken && !BYPASS_MOBILE_AUTH_FOR_DEV)) {
      return;
    }

    let cancelled = false;

    const loadRemoteState = async () => {
      try {
        await refreshRemoteData();
      } catch {
        if (cancelled) {
          return;
        }

        const nextRestaurants = fallbackRestaurants.map((restaurant) => ({
          ...restaurant,
          menu: syncMenuAvailability(restaurant.menu, createRestaurantIngredients(restaurant)),
        }));
        setRestaurants(nextRestaurants);
        setFavorites([]);
        setOrders([]);
        setPointsBalance(0);
        setPointsHistory([]);
        setPromotions([]);
        setMenuCategories(Array.from(new Set(nextRestaurants.map((restaurant) => restaurant.category))));
        setRestaurantAccounts(createRestaurantAccounts(nextRestaurants, []));

        pushNotification({
          title: t("backend_offline"),
          message: t("backend_offline_msg"),
          tone: "info",
        });
      }
    };

    loadRemoteState();

    return () => {
      cancelled = true;
    };
  }, [authReady, authToken, refreshRemoteData]);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      const socket = new WebSocket(`${api.wsBaseUrl}/ws?role=mobile`);
      websocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as RealtimeEnvelope;

          if (message.payload?.order) {
            setOrders((current) => upsertOrder(current, message.payload!.order!));

            if (message.type === "order/created") {
              pushNotification({
                title: "Commande recue",
                message: `${message.payload.order.restaurantName} prepare votre commande en direct.`,
                tone: "success",
              });
            }

            if (message.type === "order/status-updated") {
              pushNotification({
                title: "Statut mis a jour",
                message: `${message.payload.order.restaurantName}: ${message.payload.order.status}`,
                tone: "info",
              });
            }
          }

          if (message.payload?.courier) {
            setOrders((current) => syncOrdersWithCourier(current, message.payload!.courier));
          }
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        websocketRef.current = null;
        if (disposed) {
          return;
        }

        reconnectTimeoutRef.current = setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      websocketRef.current?.close();
      websocketRef.current = null;
    };
  }, [authReady]);

  const cartRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === cart[0]?.restaurantId) ?? null,
    [cart, restaurants]
  );

  const favoriteRestaurants = useMemo(
    () => restaurants.filter((restaurant) => favorites.includes(restaurant.id)),
    [favorites, restaurants]
  );

  const currentRestaurantAccount = useMemo(() => restaurantAccounts[0] ?? null, [restaurantAccounts]);
  const currentRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === currentRestaurantAccount?.restaurantId) ?? null,
    [currentRestaurantAccount, restaurants]
  );

  useEffect(() => {
    setRestaurantAccounts((current) =>
      current.map((account) => {
        const restaurant = restaurants.find((entry) => entry.id === account.restaurantId);
        if (!restaurant) {
          return account;
        }

        return {
          ...account,
          billing: buildRestaurantBilling(restaurant, orders),
        };
      })
    );
  }, [orders, restaurants]);

  useEffect(() => {
    let cancelled = false;

    const loadPromotions = async () => {
      if (!cartRestaurant) {
        setRemoteSummary(null);
        return;
      }

      try {
        const [availablePromotions, summary] = await Promise.all([
          api.getPromotions(cartRestaurant.id),
          api.quoteCart({
            restaurantId: cartRestaurant.id,
            cart,
            userCoordinates: currentLocation.coordinates,
            promoCode: promoCode || undefined,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setPromotions(availablePromotions);
        setRemoteSummary(summary);
      } catch {
        if (!cancelled) {
          setRemoteSummary(null);
        }
      }
    };

    if (cart.length && cartRestaurant) {
      loadPromotions();
    } else {
      setRemoteSummary(null);
    }

    return () => {
      cancelled = true;
    };
  }, [cart, cartRestaurant, currentLocation.coordinates, promoCode]);

  const toggleFavorite = async (restaurantId: string) => {
    const restaurant = restaurants.find((entry) => entry.id === restaurantId);
    const isFavorite = favorites.includes(restaurantId);

    setFavorites((prev) => (isFavorite ? prev.filter((id) => id !== restaurantId) : [...prev, restaurantId]));

    try {
      const payload = await api.toggleFavorite(restaurantId);
      setFavorites(payload.favorites);
    } catch {
      setFavorites((prev) => (isFavorite ? [...prev, restaurantId] : prev.filter((id) => id !== restaurantId)));
      pushNotification({
        title: t("network_error"),
        message: t("favorite_sync_error"),
        tone: "error",
      });
      return;
    }

    pushNotification({
      title: isFavorite ? t("favorite_removed") : t("favorite_added"),
      message: restaurant
        ? `${restaurant.name} ${isFavorite ? "a ete retire de" : "rejoint"} votre liste.`
        : "Liste de favoris mise a jour.",
      tone: "success",
    });
  };

  const addToCart = (
    restaurant: Restaurant,
    item: MenuItem,
    selectedOptions: SelectedOption[],
    quantity: number,
    specialInstructions?: string,
    forceReplaceCart = false
  ): AddToCartResult => {
    if (!quantity) {
      return { ok: true };
    }

    const existingRestaurant = cartRestaurant;
    if (existingRestaurant && existingRestaurant.id !== restaurant.id && !forceReplaceCart) {
      return { ok: false, reason: "DIFFERENT_RESTAURANT", restaurantName: existingRestaurant.name };
    }

    const itemId = createCartItemId(item, selectedOptions, specialInstructions);

    setCart((prev) => {
      const baseCart = forceReplaceCart && existingRestaurant?.id !== restaurant.id ? [] : prev;
      const existing = baseCart.find((entry) => entry.id === itemId);

      if (existing) {
        return baseCart.map((entry) =>
          entry.id === itemId ? { ...entry, quantity: entry.quantity + quantity } : entry
        );
      }

      return [
        ...baseCart,
        {
          id: itemId,
          restaurantId: restaurant.id,
          menuItemId: item.id,
          name: item.name,
          image: item.image,
          quantity,
          basePrice: item.price,
          selectedOptions,
          specialInstructions: specialInstructions?.trim() || undefined,
        },
      ];
    });

    pushNotification({
      title: t("article_added"),
      message: `${item.name} ${t("article_added_msg")}`,
      tone: "success",
    });

    return { ok: true };
  };

  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== cartItemId));
      return;
    }

    setCart((prev) => prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item)));
  };

  const removeCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
    pushNotification({
      title: t("item_removed"),
      message: t("cart_updated"),
      tone: "info",
    });
  };

  const clearCart = () => setCart([]);

  const applyPromoCode = async (code: string) => {
    if (!cartRestaurant || !cart.length) {
      return false;
    }

    try {
      const summary = await api.quoteCart({
        restaurantId: cartRestaurant.id,
        cart,
        userCoordinates: currentLocation.coordinates,
        promoCode: code || undefined,
      });

      if (!summary.promotion) {
        pushNotification({
          title: t("invalid_promo"),
          message: t("invalid_promo_msg"),
          tone: "error",
        });
        return false;
      }

      setPromoCode(code);
      setRemoteSummary(summary);
      pushNotification({
        title: t("applied_promo"),
        message: `${summary.promotion.code} ${t("discount")}`,
        tone: "success",
      });
      return true;
    } catch {
      pushNotification({
        title: t("invalid_promo"),
        message: t("invalid_promo_msg"),
        tone: "error",
      });
      return false;
    }
  };

  const addSavedAddress = (input: { label: string; address: string; coordinates?: LocationState["coordinates"] }) => {
    const nextAddress: SavedAddress = {
      id: `address-${Date.now()}`,
      label: input.label.trim(),
      address: input.address.trim(),
      isDefault: savedAddresses.length === 0,
      coordinates: input.coordinates,
    };

    setSavedAddresses((prev) => [...prev, nextAddress]);

    if (savedAddresses.length === 0) {
      setUser((prev) => ({ ...prev, defaultAddress: nextAddress.address }));
    }

    pushNotification({
      title: t("save_success"),
      message: t("address_saved"),
      tone: "success",
    });
  };

  const logout = async () => {
    setAuthToken(null);
    api.setAuthToken(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setUser({
      firstName: "",
      lastName: "",
      name: "",
      email: "",
      phone: "",
      defaultAddress: "",
      gender: "UNSPECIFIED",
      authMethod: undefined,
      isPhoneVerified: false,
      onboardingCompleted: false,
    });
    setSavedAddresses([]);
    setFavorites([]);
    setOrders([]);
    setCart([]);
    setPointsBalance(0);
    setPointsHistory([]);
    setPromoCode("");
    setRemoteSummary(null);
    setAuthFlow({
      selectedMethod: null,
      phoneNumber: "",
      challengeId: null,
      verificationCode: null,
      provider: null,
      isVerified: false,
    });
  };

  const beginPhoneAuth = async (method: AuthMethod, phoneNumber: string) => {
    const normalizedPhone = phoneNumber.trim();
    if (!normalizedPhone) {
      return { ok: false, error: "Numero requis." };
    }

    try {
      const payload = await api.requestPhoneCode({ method, phone: normalizedPhone });
      setAuthFlow({
        selectedMethod: method,
        phoneNumber: normalizedPhone,
        challengeId: payload.challengeId,
        verificationCode: payload.demoCode ?? null,
        provider: payload.provider,
        isVerified: false,
      });
      pushNotification({
        title: method === "WHATSAPP" ? "Verification WhatsApp" : "Verification SMS",
        message:
          payload.demoCode
            ? `Code demo envoye: ${payload.demoCode}`
            : "Code envoye. Verifiez votre messagerie pour continuer.",
        tone: "info",
      });
      return { ok: true, code: payload.demoCode };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Verification impossible." };
    }
  };

  const verifyPhoneAuth = async (code: string) => {
    if (!authFlow.challengeId) {
      return false;
    }

    try {
      const payload = await api.verifyPhoneCode({ challengeId: authFlow.challengeId, code: code.trim() });
      setAuthFlow((current) => ({ ...current, isVerified: true }));

      if (payload.token && payload.user) {
        api.setAuthToken(payload.token);
        setAuthToken(payload.token);
        await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
        setUser(payload.user);
        setSavedAddresses(payload.savedAddresses ?? []);
        if (payload.notificationPreferences) {
          setNotificationPreferences(payload.notificationPreferences);
        }
      } else {
        setUser((current) => ({
          ...current,
          phone: payload.phone || authFlow.phoneNumber,
          authMethod: authFlow.selectedMethod ?? "WHATSAPP",
          isPhoneVerified: true,
        }));
      }

      pushNotification({
        title: "Numero confirme",
        message: "Votre numero a bien ete verifie.",
        tone: "success",
      });
      return true;
    } catch (error) {
      pushNotification({
        title: "Code incorrect",
        message: error instanceof Error ? error.message : "Le code de verification est invalide.",
        tone: "error",
      });
      return false;
    }
  };

  const completeRegistration = async (input: {
    firstName: string;
    lastName: string;
    gender: Gender;
    email?: string;
    addresses: Array<{ label: string; address: string; coordinates?: LocationState["coordinates"] }>;
  }) => {
    if (!authFlow.isVerified || !authFlow.challengeId) {
      return false;
    }

    const nextAddresses = input.addresses
      .filter((entry) => entry.label.trim() && entry.address.trim())
      .map((entry, index) => ({
        id: `address-${Date.now()}-${index}`,
        label: entry.label.trim(),
        address: entry.address.trim(),
        isDefault: index === 0,
        coordinates: entry.coordinates,
      }));

    if (!input.firstName.trim() || !input.lastName.trim() || !nextAddresses.length) {
      return false;
    }

    try {
      const payload = await api.registerProfile({
        challengeId: authFlow.challengeId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        gender: input.gender,
        email: input.email?.trim() || undefined,
        addresses: nextAddresses.map((entry) => ({
          label: entry.label,
          address: entry.address,
          coordinates: entry.coordinates,
        })),
      });
      api.setAuthToken(payload.token);
      setAuthToken(payload.token);
      await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
      setSavedAddresses(payload.savedAddresses);
      setUser(payload.user);
      if (payload.notificationPreferences) {
        setNotificationPreferences(payload.notificationPreferences);
      }
      pushNotification({
        title: "Profil complete",
        message: "Votre compte est pret. Vous pouvez maintenant commander.",
        tone: "success",
      });
      return true;
    } catch {
      return false;
    }
  };

  const updateNotificationPreference = (key: keyof NotificationPreferences, value: boolean) => {
    setNotificationPreferences((prev) => {
      const next = { ...prev, [key]: value };
      api
        .updateNotificationPreferences(next)
        .then((payload) => setNotificationPreferences(payload.notificationPreferences))
        .catch(() => {
          setNotificationPreferences(prev);
          pushNotification({
            title: t("network_error"),
            message: "Impossible de synchroniser vos preferences de notifications.",
            tone: "error",
          });
        });
      return next;
    });
  };

  const getCartSummary = () => {
    if (remoteSummary && cartRestaurant) {
      return remoteSummary;
    }

    const subtotal = Number(
      cart.reduce((sum, item) => sum + calculateCartItemUnitPrice(item) * item.quantity, 0).toFixed(2)
    );

    if (!cartRestaurant) {
      return {
        subtotal,
        deliveryFee: 0,
        serviceFee: 0,
        discountAmount: 0,
        total: subtotal,
        deliveryDistanceKm: 0,
        deliveryTierLabel: t("delivery"),
        pointsToEarn: 0,
        estimatedDeliveryLabel: "--",
        promotion: null,
      };
    }

    const delivery = getDeliveryQuote(currentLocation.coordinates, cartRestaurant.coordinates);
    const deliveryFee = notificationPreferences.promotions ? 0 : delivery.fee;
    const serviceFee = calculateServiceFee(subtotal);
    const total = Number((subtotal + deliveryFee + serviceFee).toFixed(2));
    const pointsToEarn = Math.round(subtotal * cartRestaurant.pointsPerEuro);

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      discountAmount: 0,
      total,
      deliveryDistanceKm: delivery.distanceKm,
      deliveryTierLabel: delivery.tierLabel,
      pointsToEarn,
      estimatedDeliveryLabel: delivery.estimatedLabel,
      promotion: null,
    };
  };

  const createCheckoutDraft = (input: Partial<CheckoutDraft>) => ({
    address: input.address?.trim() || user.defaultAddress,
    paymentMethod: "Cash" as PaymentMethod,
    notes: input.notes ?? "",
  });

  const placeOrder = async (draft: CheckoutDraft) => {
    if (!cart.length || !cartRestaurant) {
      return { order: null, error: "Votre panier est vide." };
    }

    if (!draft.address.trim()) {
      return { order: null, error: "Veuillez renseigner une adresse de livraison." };
    }

    try {
      const payload = await api.createOrder({
        restaurantId: cartRestaurant.id,
        cart,
        draft,
        userCoordinates: currentLocation.coordinates,
        promoCode: promoCode || undefined,
      });

      setOrders(payload.orders);
      setPointsBalance(payload.pointsBalance);
      setPointsHistory(payload.pointsHistory);
      setCart([]);
      setPromoCode("");
      setRemoteSummary(null);
      pushNotification({
        title: t("order_confirmed"),
        message: `${payload.order.pointsEarned} ${t("order_confirmed_points")}`,
        tone: "success",
      });

      return { order: payload.order };
    } catch {
      return { order: null, error: "Connexion backend requise pour envoyer la commande." };
    }
  };

  const addRestaurantMenuItem = (input: {
    name: string;
    description: string;
    category: string;
    price: number;
    ingredientIds: string[];
  }) => {
    if (!currentRestaurantAccount) {
      return;
    }

    const nextItem: MenuItem = {
      id: `menu-${Date.now()}`,
      restaurantId: currentRestaurantAccount.restaurantId,
      name: input.name.trim(),
      description: input.description.trim(),
      category: input.category.trim(),
      price: input.price,
      image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      ingredientIds: input.ingredientIds,
      isAvailable: true,
      options: [],
    };

    setRestaurants((prev) =>
      prev.map((restaurant) => {
        if (restaurant.id !== currentRestaurantAccount.restaurantId) {
          return restaurant;
        }

        return {
          ...restaurant,
          menu: syncMenuAvailability([...restaurant.menu, nextItem], currentRestaurantAccount.ingredients),
        };
      })
    );

    setRestaurantAccounts((prev) =>
      prev.map((account) => {
        if (account.restaurantId !== currentRestaurantAccount.restaurantId) {
          return account;
        }

        const existingIds = new Set(account.ingredients.map((ingredient) => ingredient.id));
        const appendedIngredients = input.ingredientIds
          .filter((ingredientId) => !existingIds.has(ingredientId))
          .map((ingredientId) => ({
            id: ingredientId,
            restaurantId: account.restaurantId,
            name: ingredientId,
            stockStatus: "IN_STOCK" as const,
            quantityLabel: "Disponible",
          }));

        return {
          ...account,
          ingredients: [...account.ingredients, ...appendedIngredients],
        };
      })
    );

    pushNotification({
      title: "Menu mis a jour",
      message: `${nextItem.name} est disponible dans le catalogue restaurant.`,
      tone: "success",
    });
  };

  const updateRestaurantMenuItem = (
    menuItemId: string,
    updates: Partial<Pick<MenuItem, "name" | "description" | "category" | "price" | "ingredientIds">>
  ) => {
    if (!currentRestaurantAccount) {
      return;
    }

    setRestaurants((prev) =>
      prev.map((restaurant) => {
        if (restaurant.id !== currentRestaurantAccount.restaurantId) {
          return restaurant;
        }

        const nextMenu = restaurant.menu.map((item) => (item.id === menuItemId ? { ...item, ...updates } : item));
        const account = restaurantAccounts.find((entry) => entry.restaurantId === restaurant.id);
        return {
          ...restaurant,
          menu: syncMenuAvailability(nextMenu, account?.ingredients ?? currentRestaurantAccount.ingredients),
        };
      })
    );

    pushNotification({
      title: "Plat modifie",
      message: "Les informations du menu ont ete mises a jour.",
      tone: "success",
    });
  };

  const toggleRestaurantMenuItemAvailability = (menuItemId: string) => {
    if (!currentRestaurantAccount) {
      return;
    }

    setRestaurants((prev) =>
      prev.map((restaurant) => {
        if (restaurant.id !== currentRestaurantAccount.restaurantId) {
          return restaurant;
        }

        return {
          ...restaurant,
          menu: restaurant.menu.map((item) =>
            item.id === menuItemId ? { ...item, isAvailable: !(item.isAvailable ?? true) } : item
          ),
        };
      })
    );
  };

  const updateRestaurantIngredientStatus = (
    ingredientId: string,
    status: RestaurantIngredient["stockStatus"]
  ) => {
    if (!currentRestaurantAccount) {
      return;
    }

    const quantityLabel =
      status === "OUT_OF_STOCK" ? "Rupture" : status === "LOW_STOCK" ? "Stock faible" : "Disponible";

    setRestaurantAccounts((prev) =>
      prev.map((account) =>
        account.restaurantId === currentRestaurantAccount.restaurantId
          ? {
              ...account,
              ingredients: account.ingredients.map((ingredient) =>
                ingredient.id === ingredientId ? { ...ingredient, stockStatus: status, quantityLabel } : ingredient
              ),
            }
          : account
      )
    );

    setRestaurants((prev) =>
      prev.map((restaurant) => {
        if (restaurant.id !== currentRestaurantAccount.restaurantId) {
          return restaurant;
        }

        const nextIngredients = currentRestaurantAccount.ingredients.map((ingredient) =>
          ingredient.id === ingredientId ? { ...ingredient, stockStatus: status, quantityLabel } : ingredient
        );

        return {
          ...restaurant,
          menu: syncMenuAvailability(restaurant.menu, nextIngredients),
        };
      })
    );
  };

  const addRestaurantTable = (input: { label: string; seats: number }) => {
    if (!currentRestaurantAccount) {
      return;
    }

    const nextTable: RestaurantTable = {
      id: `${currentRestaurantAccount.restaurantId}-table-${Date.now()}`,
      restaurantId: currentRestaurantAccount.restaurantId,
      label: input.label.trim(),
      seats: input.seats,
      qrValue: `fooddelyvry://restaurant/${currentRestaurantAccount.restaurantId}/table/${encodeURIComponent(input.label.trim())}`,
    };

    setRestaurantAccounts((prev) =>
      prev.map((account) =>
        account.restaurantId === currentRestaurantAccount.restaurantId
          ? { ...account, tables: [...account.tables, nextTable] }
          : account
      )
    );

    pushNotification({
      title: "Table ajoutee",
      message: `${nextTable.label} dispose maintenant de son QR code interne.`,
      tone: "success",
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        restaurants,
        favorites,
        cart,
        orders,
        pointsBalance,
        pointsHistory,
        savedAddresses,
        notificationPreferences,
        promotions,
        menuCategories,
        promoCode,
        language,
        isRTL,
        currentLocation,
        notification,
        cartRestaurant,
        favoriteRestaurants,
        restaurantAccounts,
        currentRestaurantAccount,
        currentRestaurant,
        authFlow,
        isAuthenticated,
        refreshRemoteData,
        setLanguage,
        setPromoCode,
        addSavedAddress,
        logout,
        beginPhoneAuth,
        verifyPhoneAuth,
        completeRegistration,
        updateNotificationPreference,
        applyPromoCode,
        toggleFavorite,
        addToCart,
        updateCartItemQuantity,
        removeCartItem,
        clearCart,
        requestLocation,
        createCheckoutDraft,
        getCartSummary,
        placeOrder,
        addRestaurantMenuItem,
        updateRestaurantMenuItem,
        toggleRestaurantMenuItemAvailability,
        updateRestaurantIngredientStatus,
        addRestaurantTable,
        dismissNotification,
        pushNotification,
        t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
