import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { AnimatedCard } from "../components/AnimatedCard";
import { EmptyState } from "../components/EmptyState";
import { LiveDeliveryMap } from "../components/LiveDeliveryMap";
import { OrderStatusTimeline } from "../components/OrderStatusTimeline";
import { ScalePressable } from "../components/ScalePressable";
import { useApp } from "../context/AppContext";
import { formatCurrency, formatDateTime } from "../services/format";

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
            title="Aucun compte restaurant"
            message="Ajoutez un restaurant valide avec des informations proprietaire pour ouvrir cet espace."
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
        title: "Informations manquantes",
        message: "Remplissez le nom, la description, la categorie et le prix du nouveau plat.",
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

  const submitTable = () => {
    const seats = Number(tableSeats);
    if (!tableLabel.trim() || !seats) {
      pushNotification({
        title: "Informations manquantes",
        message: "Ajoutez un nom de table et le nombre de places.",
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
          <Text style={[styles.heroEyebrow, { textAlign: isRTL ? "right" : "left" }]}>Compte restaurant</Text>
          <Text style={[styles.heroTitle, { textAlign: isRTL ? "right" : "left" }]}>{currentRestaurant.name}</Text>
          <Text style={[styles.heroSubtitle, { textAlign: isRTL ? "right" : "left" }]}>
            Modifiez le menu, suivez les commandes, les frais dus et les QR codes de votre salle.
          </Text>
        </AnimatedCard>

        <View style={styles.statsRow}>
          <AnimatedCard style={styles.statCard}>
            <Text style={styles.statValue}>{currentRestaurant.menu.length}</Text>
            <Text style={styles.statLabel}>Plats au menu</Text>
          </AnimatedCard>
          <AnimatedCard style={[styles.statCard, styles.statCardAlert]}>
            <Text style={[styles.statValue, styles.statValueLight]}>{unavailableCount}</Text>
            <Text style={[styles.statLabel, styles.statLabelLight]}>Indisponibles auto</Text>
          </AnimatedCard>
          <AnimatedCard style={styles.statCard}>
            <Text style={styles.statValue}>{restaurantOrders.length}</Text>
            <Text style={styles.statLabel}>Commandes</Text>
          </AnimatedCard>
        </View>

        <AnimatedCard style={styles.billingCard}>
          <Text style={styles.sectionTitle}>Facturation</Text>
          <Text style={styles.billingAmount}>{formatCurrency(currentRestaurantAccount.billing.amountDue)}</Text>
          <Text style={styles.billingMeta}>{currentRestaurantAccount.billing.planLabel}</Text>
          <Text style={styles.billingMeta}>{currentRestaurantAccount.billing.periodLabel}</Text>
          <Text style={styles.billingMeta}>
            {currentRestaurantAccount.billing.ordersCount} commande(s) prises en compte
          </Text>
          <Text style={styles.billingHint}>
            Prochaine echeance estimee: {formatCurrency(currentRestaurantAccount.billing.projectedNextDue)}
          </Text>
        </AnimatedCard>

        <AnimatedCard style={styles.qrCard}>
          <Text style={styles.sectionTitle}>QR code restaurant</Text>
          <View style={styles.qrRow}>
            <View style={styles.qrBox}>
              <QRCode value={currentRestaurantAccount.menuQrValue} size={124} />
            </View>
            <View style={styles.qrDetails}>
              <Text style={styles.qrTitle}>Menu client</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.menuQrValue}</Text>
              <Text style={styles.qrTitle}>Contact</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.contactName}</Text>
              <Text style={styles.qrText}>{currentRestaurantAccount.contactEmail}</Text>
            </View>
          </View>
        </AnimatedCard>

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Ajouter un plat</Text>
          <TextInput
            value={draftName}
            onChangeText={setDraftName}
            placeholder="Nom du plat"
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <TextInput
            value={draftDescription}
            onChangeText={setDraftDescription}
            placeholder="Description"
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <View style={styles.inlineInputs}>
            <TextInput
              value={draftCategory}
              onChangeText={setDraftCategory}
              placeholder="Categorie"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={draftPrice}
              onChangeText={setDraftPrice}
              placeholder="Prix"
              keyboardType="decimal-pad"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>
          <TextInput
            value={draftIngredients}
            onChangeText={setDraftIngredients}
            placeholder="Ingredients separes par des virgules"
            style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
          />
          <ScalePressable containerStyle={styles.primaryButton} onPress={submitMenuItem}>
            <Text style={styles.primaryButtonText}>Publier le plat</Text>
          </ScalePressable>
        </AnimatedCard>

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Menu et disponibilite</Text>
        {currentRestaurant.menu.map((item, index) => (
          <AnimatedCard key={item.id} delay={Math.min(index * 60, 220)} style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <View style={styles.menuHeaderContent}>
                <Text style={styles.menuTitle}>{item.name}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
                <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.statusBadge, item.isAvailable === false ? styles.statusOff : styles.statusOn]}>
                  {item.isAvailable === false ? "Indispo" : "Disponible"}
                </Text>
              </View>
              <ScalePressable
                containerStyle={styles.secondaryButton}
                onPress={() => toggleRestaurantMenuItemAvailability(item.id)}
              >
                <Text style={styles.secondaryButtonText}>Basculer</Text>
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
                <Text style={styles.chipButtonText}>Edition rapide</Text>
              </ScalePressable>
            </View>
            {!!item.ingredientIds?.length && (
              <Text style={styles.ingredientsLine}>Ingredients: {item.ingredientIds.join(", ")}</Text>
            )}
          </AnimatedCard>
        ))}

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Stocks ingredients</Text>
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
                <Text style={styles.stockButtonText}>Disponible</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={[styles.stockButton, styles.stockButtonWarn]}
                onPress={() => updateRestaurantIngredientStatus(ingredient.id, "LOW_STOCK")}
              >
                <Text style={styles.stockButtonText}>Faible</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={[styles.stockButton, styles.stockButtonBad]}
                onPress={() => updateRestaurantIngredientStatus(ingredient.id, "OUT_OF_STOCK")}
              >
                <Text style={styles.stockButtonText}>Rupture</Text>
              </ScalePressable>
            </View>
          </AnimatedCard>
        ))}

        <Text style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>Commandes restaurant</Text>
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
                  title="Livreur en direct"
                  subtitle={`${order.courier.name} est visible en direct pour l'equipe restaurant.`}
                />
              ) : null}
            </AnimatedCard>
          ))
        ) : (
          <EmptyState
            title="Aucune commande"
            message="Les commandes du restaurant apparaitront ici pour le suivi interne."
          />
        )}

        <AnimatedCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>QR codes des tables</Text>
          <View style={styles.inlineInputs}>
            <TextInput
              value={tableLabel}
              onChangeText={setTableLabel}
              placeholder="Ex: Terrasse 1"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
            <TextInput
              value={tableSeats}
              onChangeText={setTableSeats}
              placeholder="Places"
              keyboardType="number-pad"
              style={[styles.input, styles.inlineInput, { textAlign: isRTL ? "right" : "left" }]}
            />
          </View>
          <ScalePressable containerStyle={styles.primaryButton} onPress={submitTable}>
            <Text style={styles.primaryButtonText}>Generer un QR de table</Text>
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
  safe: { flex: 1, backgroundColor: "#FFF9F1" },
  emptyWrap: { flex: 1, padding: 24, justifyContent: "center" },
  content: { padding: 18, gap: 16, paddingBottom: 44 },
  hero: { borderRadius: 30, padding: 22, gap: 8 },
  heroEyebrow: { color: "#FEF3C7", fontWeight: "800", textTransform: "uppercase", fontSize: 12 },
  heroTitle: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  heroSubtitle: { color: "#FFF7ED", lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 6,
  },
  statCardAlert: { backgroundColor: "#7C2D12", borderColor: "#7C2D12" },
  statValue: { color: "#111827", fontSize: 26, fontWeight: "800" },
  statValueLight: { color: "#FFFFFF" },
  statLabel: { color: "#64748B", fontWeight: "700" },
  statLabelLight: { color: "#FED7AA" },
  sectionTitle: { color: "#111827", fontSize: 22, fontWeight: "800" },
  billingCard: {
    backgroundColor: "#111827",
    borderRadius: 24,
    padding: 18,
    gap: 5,
  },
  billingAmount: { color: "#FFFFFF", fontSize: 34, fontWeight: "900" },
  billingMeta: { color: "#D1D5DB", lineHeight: 20 },
  billingHint: { color: "#FDBA74", fontWeight: "700", marginTop: 4 },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 18,
    gap: 14,
  },
  qrRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  qrBox: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12 },
  qrDetails: { flex: 1, gap: 6 },
  qrTitle: { color: "#111827", fontWeight: "800" },
  qrText: { color: "#475569", lineHeight: 18 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 18,
    gap: 12,
  },
  input: {
    backgroundColor: "#FFF9F1",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#111827",
  },
  inlineInputs: { flexDirection: "row", gap: 10 },
  inlineInput: { flex: 1 },
  primaryButton: { backgroundColor: "#EA580C", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 12,
  },
  menuHeader: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  menuHeaderContent: { flex: 1, gap: 6 },
  menuTitle: { color: "#111827", fontSize: 18, fontWeight: "800" },
  menuDescription: { color: "#475569", lineHeight: 20 },
  menuPrice: { color: "#15803D", fontWeight: "800" },
  statusBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontWeight: "800", fontSize: 12 },
  statusOn: { backgroundColor: "#DCFCE7", color: "#166534" },
  statusOff: { backgroundColor: "#FEE2E2", color: "#991B1B" },
  secondaryButton: { alignSelf: "flex-start", backgroundColor: "#111827", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  secondaryButtonText: { color: "#FFFFFF", fontWeight: "800" },
  quickActions: { flexDirection: "row", gap: 10 },
  chipButton: { backgroundColor: "#FFF4E8", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10 },
  chipButtonText: { color: "#C2410C", fontWeight: "800", fontSize: 12 },
  ingredientsLine: { color: "#64748B", lineHeight: 19 },
  stockCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 12,
  },
  stockTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" },
  stockTitle: { color: "#111827", fontWeight: "800", fontSize: 16 },
  stockMeta: { color: "#64748B" },
  stockState: { color: "#C2410C", fontWeight: "800", fontSize: 12 },
  stockActions: { flexDirection: "row", gap: 8 },
  stockButton: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  stockButtonGood: { backgroundColor: "#15803D" },
  stockButtonWarn: { backgroundColor: "#D97706" },
  stockButtonBad: { backgroundColor: "#B91C1C" },
  stockButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    padding: 16,
    gap: 5,
  },
  orderTop: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  orderTitle: { color: "#111827", fontWeight: "800" },
  orderAmount: { color: "#15803D", fontWeight: "800" },
  orderMeta: { color: "#475569", lineHeight: 20 },
  tableRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1ECE5",
  },
  tableQr: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 8 },
  tableInfo: { flex: 1, gap: 4 },
  tableLabel: { color: "#111827", fontWeight: "800" },
  tableMeta: { color: "#64748B", lineHeight: 18, fontSize: 12 },
});
