import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatDateTime } from "../services/format";
import { alignStart, mobileTheme, rowDirection } from "../theme/mobile";

export function RestaurantHubScreen() {
  const {
    currentRestaurant,
    currentRestaurantAccount,
    orders,
    language,
    isRTL,
    addRestaurantMenuItem,
    updateRestaurantMenuItem,
    toggleRestaurantMenuItemAvailability,
    updateRestaurantIngredientStatus,
    addRestaurantTable,
    pushNotification,
    t,
  } = useApp();

  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftIngredients, setDraftIngredients] = useState("");
  const [tableLabel, setTableLabel] = useState("");
  const [tableSeats, setTableSeats] = useState("4");

  const restaurantOrders = useMemo(
    () => orders.filter((order) => order.restaurantId === currentRestaurant?.id),
    [currentRestaurant?.id, orders]
  );

  if (!currentRestaurant || !currentRestaurantAccount) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <EmptyState
            title={t("no_restaurant_account")}
            message={t("no_restaurant_account_msg")}
          />
        </View>
      </SafeAreaView>
    );
  }

  const unavailableCount = currentRestaurant.menu.filter((item) => item.isAvailable === false).length;

  const submitMenuItem = () => {
    const price = Number(draftPrice);
    if (!draftName.trim() || !draftDescription.trim() || !draftCategory.trim() || !price) {
      pushNotification({
        title: t("missing_information"),
        message: t("missing_dish_info"),
        tone: "error",
      });
      return;
    }

    addRestaurantMenuItem({
      name: draftName,
      description: draftDescription,
      category: draftCategory,
      price,
      ingredientIds: draftIngredients
        .split(",")
        .map((entry) => entry.trim().toLowerCase().replace(/\s+/g, "-"))
        .filter(Boolean),
    });

    setDraftName("");
    setDraftDescription("");
    setDraftCategory("");
    setDraftPrice("");
    setDraftIngredients("");
  };

  const shareMenuLink = async () => {
    const link = currentRestaurantAccount.menuQrValue;
    try {
      await Share.share({
        message: `📋 Menu ${currentRestaurant.name} — commandez en ligne : ${link}`,
        url: link,
        title: `Menu ${currentRestaurant.name}`,
      });
    } catch {
      pushNotification({
        title: t("missing_information"),
        message: link,
        tone: "error",
      });
    }
  };

  const submitTable = () => {
    const seats = Number(tableSeats);
    if (!tableLabel.trim() || !seats) {
      pushNotification({
        title: t("missing_information"),
        message: t("missing_table_info"),
        tone: "error",
      });
      return;
    }

    addRestaurantTable({ label: tableLabel, seats });
    setTableLabel("");
    setTableSeats("4");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedCard style={[styles.hero, { backgroundColor: currentRestaurant.heroColor }]}>
          <Text style={[styles.heroEyebrow, alignStart(isRTL)]}>{t("courier_heading")}</Text>
          <Text style={[styles.heroTitle, { textAlign: isRTL ? "right" : "left" }]}>{currentRestaurant.name}</Text>
          <Text style={[styles.heroSubtitle, alignStart(isRTL)]}>{t("restaurant_hub_subtitle")}</Text>
        </AnimatedCard>

        <View style={styles.statsRow}>
          <AnimatedCard style={styles.statCard}>
            <Text style={styles.statValue}>{currentRestaurant.menu.length}</Text>
            <Text style={styles.statLabel}>{t("menu_items_count")}</Text>
          </AnimatedCard>
          <AnimatedCard style={[styles.statCard, styles.statCardAlert]}>
            <Text style={[styles.statValue, styles.statValueLight]}>{unavailableCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelLight]}>{t("unavailable_auto")}</Text>
          </AnimatedCard>
          <AnimatedCard style={styles.statCard}>
            <Text style={styles.statValue}>{restaurantOrders.length}</Text>
            <Text style={styles.statLabel}>Commandes</Text>
          </AnimatedCard>
        </View>

        <AnimatedCard style={styles.billingCard}>
          <Text style={styles.sectionTitle}>{t("billing")}</Text>
          <Text style={styles.billingAmount}>{formatCurrency(currentRestaurantAccount.billing.amountDue)}</Text>
          <Text style={styles.billingMeta}>{currentRestaurantAccount.billing.planLabel}</Text>
          <Text style={styles.billingMeta}>{currentRestaurantAccount.billing.periodLabel}</Text>
          <Text style={styles.billingMeta}>
            {currentRestaurantAccount.billing.ordersCount} commande(s) prises en compte
          </Text>
          <Text style={styles.billingHint}>
            {t("next_due_estimate")}: {formatCurrency(currentRestaurantAccount.billing.projectedNextDue)}
          </Text>
        </AnimatedCard>

        <AnimatedCard style={styles.qrCard}>
          <Text style={styles.sectionTitle}>{t("restaurant_qr")}</Text>
          <View style={[styles.qrRow, rowDirection(isRTL)]}>
            <View style={styles.qrBox}>
              <QRCode value={currentRestaurantAccount.menuQrValue} size={124} />
            </View>
            <View style={styles.qrDetails}>
              <Text style={styles.qrTitle}>{t("customer_menu")}</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.menuQrValue}</Text>
              <Text style={styles.qrTitle}>{t("contact")}</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.contactName}</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.contactEmail}</Text>
            </View>
          </View>
          <ScalePressable containerStyle={styles.shareButton} onPress={shareMenuLink}>
            <Text style={styles.shareButtonText}>🔗 Partager le lien du menu</Text>
          </ScalePressable>
        </AnimatedCard>

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t("add_dish")}</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder={t("dish_name")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <TextInput
            value={draftDescription}
            onChangeText={setDraftDescription}
            placeholder={t("description")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <View style={styles.inlineInputs}>
            <TextInput
              value={draftCategory}
              onChangeText={setDraftCategory}
              placeholder={t("category")}
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={draftPrice}
              onChangeText={setDraftPrice}
              placeholder={t("price")}
              keyboardType="decimal-pad"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>
          <TextInput
            value={draftIngredients}
            onChangeText={setDraftIngredients}
            placeholder={t("ingredients_csv")}
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <ScalePressable containerStyle={styles.primaryButton} onPress={submitMenuItem}>
            <Text style={styles.primaryButtonText}>{t("publish_dish")}</Text>
          </ScalePressable>
        </AnimatedCard>

        <Text style={[styles.sectionTitle, alignStart(isRTL)]}>{t("menu_availability")}</Text>
        {currentRestaurant.menu.map((item, index) => (
          <AnimatedCard key={item.id} delay={Math.min(index * 60, 220)} style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderContent}>
                <Text style={styles.menuTitle}>{item.name}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
                <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.statusBadge, item.isAvailable === false ? styles.statusOff : styles.statusOn]}>
                  {item.isAvailable === false ? t("unavailable_short") : t("available")}
                </Text>
              </View>
              <ScalePressable
                containerStyle={styles.secondaryButton}
                onPress={() => toggleRestaurantMenuItemAvailability(item.id)}
              >
                <Text style={styles.secondaryButtonText}>{t("toggle")}</Text>
              </ScalePressable>
            </View>
            <View style={styles.quickActions}>
              <ScalePressable
                containerStyle={styles.chipButton}
                onPress={() =>
                  updateRestaurantMenuItem(item.id, {
                    price: Number((item.price + 0.5).toFixed(2)),
                  })
                }
              >
                <Text style={styles.chipButtonText}>+0.50 DA</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={styles.chipButton}
                onPress={() =>
                  updateRestaurantMenuItem(item.id, {
                    name: item.name.includes("Chef") ? item.name.replace(" - Chef", "") : `${item.name} - Chef`,
                  })
                }
              >
                <Text style={styles.chipButtonText}>{t("quick_edit")}</Text>
              </ScalePressable>
            </View>
            {!!item.ingredientIds?.length && (
              <Text style={styles.ingredientsLine}>{t("ingredients")}: {item.ingredientIds.join(", ")}</Text>
            )}
          </AnimatedCard>
        ))}

        <Text style={[styles.sectionTitle, alignStart(isRTL)]}>{t("ingredient_stock")}</Text>
        {currentRestaurantAccount.ingredients.map((ingredient, index) => (
          <AnimatedCard key={ingredient.id} delay={Math.min(index * 50, 200)} style={styles.stockCard}>
            <View style={styles.stockTop}>
              <View>
                <Text style={styles.stockTitle}>{ingredient.name}</Text>
                <Text style={styles.stockMeta}>{ingredient.quantityLabel}</Text>
              </View>
              <Text style={styles.stockState}>{ingredient.stockStatus.replaceAll("_", " ")}</Text>
            </View>
            <View style={styles.stockActions}>
              <ScalePressable
                containerStyle={[styles.stockButton, styles.stockButtonGood]}
                onPress={() => updateRestaurantIngredientStatus(ingredient.id, "IN_STOCK")}
              >
                <Text style={styles.stockButtonText}>{t("available")}</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={[styles.stockButton, styles.stockButtonWarn]}
                onPress={() => updateRestaurantIngredientStatus(ingredient.id, "LOW_STOCK")}
              >
                <Text style={styles.stockButtonText}>{t("low_stock")}</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={[styles.stockButton, styles.stockButtonBad]}
                onPress={() => updateRestaurantIngredientStatus(ingredient.id, "OUT_OF_STOCK")}
              >
                <Text style={styles.stockButtonText}>{t("out_of_stock")}</Text>
              </ScalePressable>
            </View>
          </AnimatedCard>
        ))}

        <Text style={[styles.sectionTitle, alignStart(isRTL)]}>{t("restaurant_orders")}</Text>
        {restaurantOrders.length ? (
          restaurantOrders.map((order, index) => (
            <AnimatedCard key={order.id} delay={Math.min(index * 60, 220)} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.orderTitle}>Commande {order.id}</Text>
                <Text style={styles.orderAmount}>{formatCurrency(order.total)}</Text>
              </View>
              <OrderStatusTimeline status={order.status} />
              <Text style={styles.orderMeta}>{order.status}</Text>
              <Text style={styles.orderMeta}>{order.address}</Text>
              <Text style={styles.orderMeta}>{formatDateTime(order.createdAt, language)}</Text>
              {order.courier?.currentLat !== null &&
              order.courier?.currentLat !== undefined &&
              order.courier?.currentLng !== null &&
              order.courier?.currentLng !== undefined ? (
                <LiveDeliveryMap
                  pickup={currentRestaurant.coordinates}
                  destination={currentRestaurant.coordinates}
                  courier={{
                    latitude: order.courier.currentLat,
                    longitude: order.courier.currentLng,
                  }}
                  title={t("live_courier_restaurant")}
                  subtitle={`${order.courier.name} ${t("live_courier_restaurant_subtitle")}`}
                />
              ) : null}
            </AnimatedCard>
          ))
        ) : (
          <EmptyState
            title={t("delivered_orders")}
            message={t("restaurant_order_empty")}
          />
        )}

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>{t("table_qr_codes")}</Text>
          <View style={[styles.inlineInputs, rowDirection(isRTL)]}>
            <TextInput
              value={tableLabel}
              onChangeText={setTableLabel}
              placeholder="Ex: Terrasse 1"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={tableSeats}
              onChangeText={setTableSeats}
              placeholder={t("seats")}
              keyboardType="number-pad"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>
          <ScalePressable containerStyle={styles.primaryButton} onPress={submitTable}>
            <Text style={styles.primaryButtonText}>{t("generate_table_qr")}</Text>
          </ScalePressable>

          {currentRestaurantAccount.tables.map((table) => (
            <View key={table.id} style={styles.tableRow}>
              <View style={styles.tableQr}>
                <QRCode value={table.qrValue} size={72} />
              </View>
              <View style={styles.tableInfo}>
                <Text style={styles.tableLabel}>{table.label}</Text>
                <Text style={styles.tableMeta}>{table.seats} places</Text>
                <Text style={styles.tableMeta}>{table.qrValue}</Text>
              </View>
            </View>
          ))}
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: mobileTheme.colors.brandSurface },
  emptyWrap: { flex: 1, padding: 20, justifyContent: "center" },
  content: { padding: 14, gap: 12, paddingBottom: 36 },
  hero: { borderRadius: 26, padding: 18, gap: 6 },
  heroEyebrow: { color: "#FEF3C7", fontWeight: "800", textTransform: "uppercase", fontSize: 11 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  heroSubtitle: { color: "#FFF7ED", lineHeight: 18, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 12,
    gap: 4,
  },
  statCardAlert: { backgroundColor: "#7C2D12", borderColor: "#7C2D12" },
  statValue: { color: "#111827", fontSize: 22, fontWeight: "800" },
  statValueLight: { color: "#FFFFFF" },
  statLabel: { color: "#64748B", fontWeight: "700", fontSize: 12 },
  statLabelLight: { color: "#FED7AA" },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  billingCard: {
    backgroundColor: "#111827",
    borderRadius: 22,
    padding: 14,
    gap: 4,
  },
  billingAmount: { color: "#FFFFFF", fontSize: 30, fontWeight: "900" },
  billingMeta: { color: "#D1D5DB", lineHeight: 18, fontSize: 12 },
  billingHint: { color: "#FDBA74", fontWeight: "700", marginTop: 2, fontSize: 12 },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 14,
    gap: 12,
  },
  shareButton: { backgroundColor: "#EA580C", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  shareButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  qrRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  qrBox: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 10 },
  qrDetails: { flex: 1, gap: 4 },
  qrTitle: { color: "#111827", fontWeight: "800", fontSize: 12 },
  qrText: { color: "#475569", lineHeight: 16, fontSize: 11 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 14,
    gap: 10,
  },
  input: {
    backgroundColor: "#FFF9F1",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#111827",
    fontSize: 13,
  },
  inlineInputs: { flexDirection: "row", gap: 8 },
  inlineInput: { flex: 1 },
  primaryButton: { backgroundColor: "#EA580C", borderRadius: 14, paddingVertical: 12, alignItems: "center", marginTop: 2 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 12,
    gap: 10,
  },
  menuHeader: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  menuHeaderContent: { flex: 1, gap: 4 },
  menuTitle: { color: "#111827", fontSize: 16, fontWeight: "800" },
  menuDescription: { color: "#475569", lineHeight: 18, fontSize: 12 },
  menuPrice: { color: "#15803D", fontWeight: "800", fontSize: 13 },
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontWeight: "800", fontSize: 11 },
  statusOn: { backgroundColor: "#DCFCE7", color: "#166534" },
  statusOff: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  secondaryButton: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 70 },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  quickActions: { flexDirection: "row", gap: 8 },
  chipButton: { backgroundColor: "#FFF4E8", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, flex: 1 },
  chipButtonText: { color: "#C2410C", fontWeight: "800", fontSize: 11, textAlign: "center" },
  ingredientsLine: { color: "#64748B", lineHeight: 18, fontSize: 12 },
  stockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 12,
    gap: 10,
  },
  stockTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  stockTitle: { color: "#111827", fontWeight: "800", fontSize: 14 },
  stockMeta: { color: "#64748B", fontSize: 11 },
  stockState: { color: "#C2410C", fontWeight: "800", fontSize: 10 },
  stockActions: { flexDirection: "row", gap: 6 },
  stockButton: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  stockButtonGood: { backgroundColor: "#15803D" },
  stockButtonWarn: { backgroundColor: "#D97706" },
  stockButtonBad: { backgroundColor: "#B91C1C" },
  stockButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 11 },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 12,
    gap: 4,
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderTitle: { color: "#111827", fontWeight: "800", fontSize: 14 },
  orderAmount: { color: "#15803D", fontWeight: "800", fontSize: 13 },
  orderMeta: { color: "#475569", lineHeight: 18, fontSize: 12 },
  tableRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1ECE5",
  },
  tableQr: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 6 },
  tableInfo: { flex: 1, gap: 3 },
  tableLabel: { color: "#111827", fontWeight: "800", fontSize: 13 },
  tableMeta: { color: "#64748B", lineHeight: 16, fontSize: 11 },
});
