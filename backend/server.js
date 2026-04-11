require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { PrismaClient } = require("@prisma/client");
const { WebSocketServer } = require("ws");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const DEMO_USER_EMAIL = "nina.morel@demo.app";
const DEFAULT_QR_WEBAPP_URL = process.env.QR_WEBAPP_URL || `http://localhost:${PORT}`;
const APP_LOGIN_URL = process.env.APP_LOGIN_URL || "fooddelyvry://auth";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "";
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "fr";
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
const MOBILE_MIN_VERSION = process.env.MOBILE_MIN_VERSION || "1.0.0";
const MOBILE_LATEST_VERSION = process.env.MOBILE_LATEST_VERSION || MOBILE_MIN_VERSION;
const MOBILE_FORCE_UPDATE = String(process.env.MOBILE_FORCE_UPDATE || "false").toLowerCase() === "true";
const ANDROID_PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME || process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME || "";
const ANDROID_PLAY_STORE_URL =
  process.env.ANDROID_PLAY_STORE_URL ||
  (ANDROID_PACKAGE_NAME ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}` : "");

const DELIVERY_TIERS = [
  { label: "Livraison offerte", maxDistanceKm: 2, fee: 0 },
  { label: "Zone proche", maxDistanceKm: 5, fee: 2 },
  { label: "Zone standard", maxDistanceKm: 8, fee: 4.5 },
  { label: "Zone etendue", maxDistanceKm: Number.POSITIVE_INFINITY, fee: 7 }
];

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const partnerApplicationsFile = path.join(dataDir, "partner-applications.json");
if (!fs.existsSync(partnerApplicationsFile)) {
  fs.writeFileSync(partnerApplicationsFile, "[]", "utf8");
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadsDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const realtimeClients = new Set();
const wsServer = new WebSocketServer({ server, path: "/ws" });

function buildRealtimeEnvelope(type, payload) {
  return JSON.stringify({
    type,
    payload,
    sentAt: new Date().toISOString(),
  });
}

function broadcastRealtime(type, payload) {
  const message = buildRealtimeEnvelope(type, payload);
  realtimeClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

wsServer.on("connection", (socket, request) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  socket.clientRole = requestUrl.searchParams.get("role") || "unknown";
  realtimeClients.add(socket);

  socket.send(buildRealtimeEnvelope("realtime/ready", { role: socket.clientRole }));

  socket.on("message", (rawMessage) => {
    try {
      const message = JSON.parse(String(rawMessage));
      if (message?.type === "ping") {
        socket.send(buildRealtimeEnvelope("pong", { ts: Date.now() }));
      }
    } catch {
      return;
    }
  });

  socket.on("close", () => {
    realtimeClients.delete(socket);
  });
});

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function compareVersions(left, right) {
  const leftParts = String(left || "0")
    .split(".")
    .map((item) => Number.parseInt(item, 10) || 0);
  const rightParts = String(right || "0")
    .split(".")
    .map((item) => Number.parseInt(item, 10) || 0);
  const size = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < size; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function calculateDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;

  return Number((2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function getDeliveryQuote(userCoordinates, restaurantCoordinates) {
  const distanceKm = calculateDistanceKm(userCoordinates, restaurantCoordinates);
  const tier = DELIVERY_TIERS.find((entry) => distanceKm <= entry.maxDistanceKm) || DELIVERY_TIERS[DELIVERY_TIERS.length - 1];
  const estimatedMinutes = Math.max(18, Math.round(12 + distanceKm * 4.5));

  return {
    distanceKm,
    fee: tier.fee,
    tierLabel: tier.label,
    estimatedMinutes,
    estimatedLabel: `${estimatedMinutes}-${estimatedMinutes + 8} min`
  };
}

function calculateServiceFee(subtotal) {
  return Number((subtotal * 0.08).toFixed(2));
}

function calculatePromotionDiscount({ promotion, subtotal }) {
  if (!promotion || !promotion.isActive) {
    return 0;
  }

  const now = new Date();
  if (promotion.startsAt > now || promotion.endsAt < now || subtotal < promotion.minOrderTotal) {
    return 0;
  }

  if (promotion.type === "PERCENTAGE") {
    return Number(Math.min(subtotal, subtotal * (promotion.value / 100)).toFixed(2));
  }

  return Number(Math.min(subtotal, promotion.value).toFixed(2));
}

function calculateCartSubtotal(cart) {
  return Number(
    cart
      .reduce((sum, item) => {
        const optionsTotal = (item.selectedOptions || []).reduce((optionSum, option) => optionSum + option.priceDelta, 0);
        return sum + (item.basePrice + optionsTotal) * item.quantity;
      }, 0)
      .toFixed(2)
  );
}

function generateOpaqueToken(prefix) {
  return `${prefix}_${crypto.randomBytes(18).toString("hex")}`;
}

function normalizePhoneNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "");
}

function generateVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function generateCustomerEmailFromPhone(phone) {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, "");
  return `customer_${digits || Date.now()}@fooddelyvry.app`;
}

function hasWhatsAppCloudConfig() {
  return Boolean(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN && WHATSAPP_TEMPLATE_NAME);
}

function getBillingPlanSummary(input) {
  if (input.billingPlanType === "PERCENTAGE_PER_ORDER") {
    return `${Number(input.billingPercentage || 0)}% par commande`;
  }

  if (input.billingPlanType === "MONTHLY_SUBSCRIPTION") {
    return `${Number(input.monthlySubscriptionFee || 0).toFixed(2)} EUR / mois`;
  }

  return `${Number(input.billingFixedFee || 0).toFixed(2)} EUR par commande`;
}

function getRestaurantQrLandingUrl(qrCodeToken) {
  return `${DEFAULT_QR_WEBAPP_URL}/qr/${qrCodeToken}`;
}

function calculateCourierCompensation(order, courier) {
  const total = Number(((courier.payPerDelivery || 0) + (order.deliveryDistanceKm || 0) * (courier.payPerKm || 0)).toFixed(2));
  return {
    base: Number((courier.payPerDelivery || 0).toFixed(2)),
    perKm: Number((courier.payPerKm || 0).toFixed(2)),
    estimatedTotal: total,
  };
}

function serializeRestaurant(record) {
  return {
    id: record.id,
    name: record.name,
    ownerName: record.ownerName || null,
    ownerEmail: record.ownerEmail || null,
    ownerPhone: record.ownerPhone || null,
    category: record.category,
    shortDescription: record.shortDescription,
    address: record.address,
    openingHours: record.openingHours,
    deliveryTime: record.deliveryTime,
    rating: record.rating,
    reviewCount: record.reviewCount,
    image: record.image,
    heroColor: record.heroColor,
    coordinates: {
      latitude: record.latitude,
      longitude: record.longitude
    },
    tags: record.tags,
    pointsPerEuro: record.pointsPerEuro,
    isActive: record.isActive,
    validationStatus: record.validationStatus,
    billingPlanType: record.billingPlanType,
    billingFixedFee: record.billingFixedFee,
    billingPercentage: record.billingPercentage,
    monthlySubscriptionFee: record.monthlySubscriptionFee,
    apiToken: record.apiToken || null,
    qrCodeToken: record.qrCodeToken || null,
    qrCodeUrl: record.qrCodeToken ? getRestaurantQrLandingUrl(record.qrCodeToken) : null,
    validatedAt: record.validatedAt ? record.validatedAt.toISOString() : null,
    printerLastSeenAt: record.printerLastSeenAt ? record.printerLastSeenAt.toISOString() : null,
    menu: (record.menuItems || [])
      .filter((item) => !item.deletedAt)
      .map((item) => ({
      id: item.id,
      restaurantId: item.restaurantId,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      image: item.image,
      badge: item.badge || undefined,
      calories: item.calories || undefined,
      stock: item.stock,
      isAvailable: item.isAvailable,
      options: item.options || []
    }))
  };
}

function serializeOrder(record) {
  const status = record.status === "OnTheWay" ? "On the way" : record.status;
  return {
    id: record.id,
    restaurantId: record.restaurantId,
    restaurantName: record.restaurant.name,
    items: record.items,
    subtotal: record.subtotal,
    deliveryFee: record.deliveryFee,
    serviceFee: record.serviceFee,
    total: record.total,
    deliveryDistanceKm: record.deliveryDistanceKm,
    pointsEarned: record.pointsEarned,
    address: record.address,
    paymentMethod: record.paymentMethod,
    notes: record.notes || undefined,
    channel: record.channel,
    tableLabel: record.tableLabel || null,
    printerPrintedAt: record.printerPrintedAt ? record.printerPrintedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : record.createdAt.toISOString(),
    status,
    estimatedDeliveryLabel: record.estimatedDeliveryLabel,
    discountAmount: record.discountAmount || 0,
    courier: record.courier
      ? {
          id: record.courier.id,
          name: record.courier.name,
          phone: record.courier.phone,
          vehicle: record.courier.vehicle,
          status: record.courier.status,
          currentLat: record.courier.currentLat,
          currentLng: record.courier.currentLng,
        }
      : null
  };
}

function serializeCustomer(record) {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    defaultAddress: record.defaultAddress,
    isActive: record.isActive,
    ordersCount: record.orders.length,
    loyaltyPoints: record.loyaltyEntries.reduce((sum, entry) => sum + entry.points, 0),
    favoritesCount: record.favorites.length,
    createdAt: record.createdAt.toISOString()
  };
}

function serializeUserProfile(record) {
  const defaultAddress = (record.addresses || []).find((entry) => entry.isDefault)?.address || record.defaultAddress || "";
  return {
    id: record.id,
    firstName: record.firstName || "",
    lastName: record.lastName || "",
    name: record.name,
    email: record.email,
    phone: record.phone || "",
    defaultAddress,
    gender: record.gender || "UNSPECIFIED",
    authMethod: record.authProvider || undefined,
    isPhoneVerified: Boolean(record.phoneVerifiedAt),
    onboardingCompleted: Boolean(record.phoneVerifiedAt && record.firstName && record.lastName && defaultAddress),
  };
}

function serializeNotificationPreferences(record) {
  return {
    orderUpdates: Boolean(record?.notificationsOrderUpdates ?? false),
    promotions: Boolean(record?.notificationsPromotions ?? false),
    loyalty: Boolean(record?.notificationsLoyalty ?? false),
  };
}

function serializeUserAddress(record) {
  return {
    id: record.id,
    label: record.label,
    address: record.address,
    isDefault: record.isDefault,
    coordinates:
      record.latitude !== null && record.latitude !== undefined && record.longitude !== null && record.longitude !== undefined
        ? { latitude: record.latitude, longitude: record.longitude }
        : undefined,
  };
}

function serializeCourier(record) {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    vehicle: record.vehicle,
    status: record.status,
    payPerDelivery: record.payPerDelivery,
    payPerKm: record.payPerKm,
    zoneLabel: record.zoneLabel,
    currentLat: record.currentLat,
    currentLng: record.currentLng,
    activeOrders: record.orders.filter((order) => order.status !== "Delivered").length,
    deliveredOrders: record.orders.filter((order) => order.status === "Delivered").length
  };
}

function serializePromotion(record) {
  return {
    id: record.id,
    code: record.code,
    title: record.title,
    description: record.description,
    type: record.type,
    value: record.value,
    minOrderTotal: record.minOrderTotal,
    isActive: record.isActive,
    startsAt: record.startsAt.toISOString(),
    endsAt: record.endsAt.toISOString(),
    restaurantId: record.restaurantId,
    usageCount: record.orders.length
  };
}

function serializeMenuCategory(record) {
  return {
    id: record.id,
    name: record.name,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
  };
}

function readPartnerApplications() {
  try {
    return JSON.parse(fs.readFileSync(partnerApplicationsFile, "utf8"));
  } catch {
    return [];
  }
}

function writePartnerApplications(items) {
  fs.writeFileSync(partnerApplicationsFile, JSON.stringify(items, null, 2), "utf8");
}

function readEmailOutbox() {
  const outboxFile = path.join(dataDir, "email-outbox.json");
  if (!fs.existsSync(outboxFile)) {
    fs.writeFileSync(outboxFile, "[]", "utf8");
  }

  try {
    return JSON.parse(fs.readFileSync(outboxFile, "utf8"));
  } catch {
    return [];
  }
}

function writeEmailOutbox(items) {
  const outboxFile = path.join(dataDir, "email-outbox.json");
  fs.writeFileSync(outboxFile, JSON.stringify(items, null, 2), "utf8");
}

app.get("/api/mobile-config", (req, res) => {
  const platform = String(req.query?.platform || "").toLowerCase();
  const version = String(req.query?.version || "").trim();
  const requestPackageName = String(req.query?.packageName || "").trim();
  const packageName = ANDROID_PACKAGE_NAME || requestPackageName;
  const storeUrl =
    ANDROID_PLAY_STORE_URL || (packageName ? `https://play.google.com/store/apps/details?id=${packageName}` : null);
  const forceUpdate =
    platform === "android" &&
    MOBILE_FORCE_UPDATE &&
    Boolean(version) &&
    compareVersions(version, MOBILE_MIN_VERSION) < 0;

  res.json({
    forceUpdate,
    minimumVersion: MOBILE_MIN_VERSION,
    latestVersion: MOBILE_LATEST_VERSION,
    storeUrl,
    message: forceUpdate
      ? `Cette version n'est plus supportee. Installez la version ${MOBILE_LATEST_VERSION} depuis le Play Store.`
      : null,
  });
});

async function sendWhatsAppVerificationCode(phone, code) {
  if (!hasWhatsAppCloudConfig()) {
    return {
      provider: "demo",
      status: "QUEUED",
      messageId: `demo_${Date.now()}`,
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: WHATSAPP_TEMPLATE_LANG },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Envoi WhatsApp impossible.");
  }

  return {
    provider: "whatsapp-cloud",
    status: "SENT",
    messageId: payload?.messages?.[0]?.id || null,
  };
}

function extractWhatsAppStatuses(payload) {
  return (payload?.entry || []).flatMap((entry) =>
    (entry?.changes || []).flatMap((change) => change?.value?.statuses || [])
  );
}

async function applyWhatsAppStatusUpdate(statusItem) {
  const messageId = statusItem?.id;
  if (!messageId) {
    return null;
  }

  const nextStatus = String(statusItem.status || "").toUpperCase();
  const statusTimestamp =
    statusItem.timestamp && !Number.isNaN(Number(statusItem.timestamp))
      ? new Date(Number(statusItem.timestamp) * 1000)
      : new Date();

  const updateData = {
    deliveryStatus: nextStatus || "UNKNOWN",
  };

  if (nextStatus === "SENT") {
    updateData.sentAt = statusTimestamp;
  }
  if (nextStatus === "DELIVERED") {
    updateData.deliveredAt = statusTimestamp;
  }
  if (nextStatus === "READ") {
    updateData.readAt = statusTimestamp;
  }
  if (nextStatus === "FAILED") {
    updateData.failedAt = statusTimestamp;
    updateData.errorMessage =
      statusItem?.errors?.map((entry) => entry?.title || entry?.message).filter(Boolean).join(" | ") ||
      "Message WhatsApp echoue.";
  }

  try {
    return await prisma.authChallenge.update({
      where: { providerMessageId: messageId },
      data: updateData,
    });
  } catch {
    return null;
  }
}

async function queueRestaurantAccessEmail({
  restaurantName,
  ownerName,
  ownerEmail,
  loginEmail,
  temporaryPassword,
  apiToken,
  qrCodeUrl,
}) {
  if (!ownerEmail) {
    return;
  }

  const outbox = readEmailOutbox();
  outbox.unshift({
    id: `mail_${Date.now()}`,
    to: ownerEmail,
    subject: "FoodDelyvry - Acces a votre espace restaurant",
    text: `Bonjour ${ownerName || restaurantName}, votre espace restaurant est pret.\nRestaurant: ${restaurantName}\nEmail: ${loginEmail}\nMot de passe temporaire: ${temporaryPassword}\nToken API: ${apiToken}\nLien QR: ${qrCodeUrl}\nMerci de vous connecter puis de changer votre mot de passe.`,
    status: "QUEUED",
    createdAt: new Date().toISOString(),
  });
  writeEmailOutbox(outbox);
}

async function queueApplicationEmail(application, status) {
  const planSummary = application.type === "RESTAURANT" ? getBillingPlanSummary(application) : null;
  const outbox = readEmailOutbox();
  outbox.unshift({
    id: `mail_${Date.now()}`,
    to: application.email,
    subject:
      status === "ACCEPTED"
        ? "FoodDelyvry - Votre candidature a ete acceptee"
        : "FoodDelyvry - Mise a jour de votre candidature",
    text:
      status === "ACCEPTED"
        ? application.type === "RESTAURANT"
          ? `Bonjour ${application.applicantName}, votre compte restaurant a ete valide.\nPlan: ${planSummary}\nToken API: ${application.generatedApiToken}\nLien QR: ${application.qrCodeUrl}\nCe token sert de cle d'activation pour le logiciel d'impression.`
          : `Bonjour ${application.applicantName}, votre candidature ${application.type} a ete acceptee.`
        : `Bonjour ${application.applicantName}, votre candidature ${application.type} a ete refusee.`,
    status: "QUEUED",
    applicationId: application.id,
    createdAt: new Date().toISOString(),
  });
  writeEmailOutbox(outbox);
}

async function ensureApplicationEntity(application) {
  if (application.linkedEntityId && application.linkedEntityType) {
    return application;
  }

  if (application.type === "COURIER") {
    const courier = await prisma.courier.create({
      data: {
        name: application.applicantName,
        phone: application.phone,
        vehicle: application.vehicle || "Scooter",
        status: "AVAILABLE",
        payPerDelivery: Number(application.payPerDelivery || 3),
        payPerKm: Number(application.payPerKm || 0.8),
        zoneLabel: application.zone || application.city || null,
      }
    });

    return {
      ...application,
      linkedEntityType: "COURIER",
      linkedEntityId: courier.id,
      linkedEntityLabel: courier.name,
    };
  }

  const restaurant = await prisma.restaurant.create({
    data: {
      id: `r_app_${Date.now()}`,
      name: application.businessName || application.applicantName,
      ownerName: application.applicantName,
      ownerEmail: application.email,
      ownerPhone: application.phone,
      category: application.restaurantCategory || "General",
      shortDescription: application.notes || `Candidature acceptee depuis ${application.city}.`,
      address: application.address || application.city,
      openingHours: "A configurer",
      deliveryTime: "25-35 min",
      rating: 4.5,
      reviewCount: 0,
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      heroColor: "#EA580C",
      latitude: 0,
      longitude: 0,
      tags: [application.city, "Candidature acceptee"],
      pointsPerEuro: 10,
      isActive: false,
      validationStatus: "PENDING",
      billingPlanType: application.billingPlanType || "FIXED_PER_ORDER",
      billingFixedFee: application.billingFixedFee ? Number(application.billingFixedFee) : null,
      billingPercentage: application.billingPercentage ? Number(application.billingPercentage) : null,
      monthlySubscriptionFee: application.monthlySubscriptionFee ? Number(application.monthlySubscriptionFee) : null,
    }
  });

  return {
    ...application,
    linkedEntityType: "RESTAURANT",
    linkedEntityId: restaurant.id,
    linkedEntityLabel: restaurant.name,
  };
}

function normalizeStatus(status) {
  if (status === "On the way") {
    return "OnTheWay";
  }
  if (status === "Cancelled") {
    return "Cancelled";
  }
  return status;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token manquant." });
    return;
  }

  try {
    req.auth = jwt.verify(authHeader.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token invalide." });
  }
}

function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    req.auth = jwt.verify(authHeader.slice(7), JWT_SECRET);
  } catch {
    req.auth = null;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "ADMIN") {
    res.status(403).json({ message: "Acces reserve a l'administration." });
    return;
  }

  next();
}

function requireCustomer(req, res, next) {
  if (req.auth?.role !== "CUSTOMER") {
    res.status(403).json({ message: "Acces reserve aux clients." });
    return;
  }

  next();
}

async function requireRestaurantApiToken(req, res, next) {
  const token =
    req.headers["x-api-token"] ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null) ||
    req.query.token;

  if (!token) {
    res.status(401).json({ message: "Token API restaurant manquant." });
    return;
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { apiToken: String(token) },
  });

  if (!restaurant) {
    res.status(401).json({ message: "Token API restaurant invalide." });
    return;
  }

  req.restaurantAuth = restaurant;
  next();
}

async function getAuthenticatedUser(req) {
  if (req.auth?.sub) {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.sub },
      include: { favorites: true, addresses: true }
    });
    if (user) {
      return user;
    }
  }

  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: { favorites: true, addresses: true }
  });
}

async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    include: { favorites: true, addresses: true }
  });
}

async function computeSummary({ restaurantId, cart, userCoordinates, promoCode, orderChannel = "DELIVERY", userId }) {
  const [restaurant, customer] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    userId ? prisma.user.findUnique({ where: { id: userId } }) : Promise.resolve(null),
  ]);
  if (!restaurant) {
    return null;
  }

  const subtotal = calculateCartSubtotal(cart);
  const promotion = promoCode
    ? await prisma.promotion.findFirst({
        where: {
          code: promoCode,
          isActive: true,
          OR: [{ restaurantId: null }, { restaurantId }],
        },
      })
    : null;
  const freeDeliveryUnlocked = orderChannel === "DELIVERY" && Boolean(customer?.notificationsPromotions);
  const delivery =
    orderChannel === "QR_ONSITE"
      ? {
          distanceKm: 0,
          fee: 0,
          tierLabel: "Sur place",
          estimatedMinutes: 12,
          estimatedLabel: "10-18 min"
        }
      : getDeliveryQuote(userCoordinates, {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        });
  const appliedDelivery = freeDeliveryUnlocked ? { ...delivery, fee: 0, tierLabel: "Livraison offerte" } : delivery;
  const serviceFee = orderChannel === "QR_ONSITE" ? 0 : calculateServiceFee(subtotal);
  const discountAmount = calculatePromotionDiscount({ promotion, subtotal });
  const total = Number((subtotal + appliedDelivery.fee + serviceFee - discountAmount).toFixed(2));
  const pointsToEarn = Math.round(subtotal * restaurant.pointsPerEuro);

  const appliedPromotion = discountAmount > 0 ? promotion : null;

  return {
    subtotal,
    deliveryFee: appliedDelivery.fee,
    serviceFee,
    discountAmount,
    total,
    deliveryDistanceKm: appliedDelivery.distanceKm,
    deliveryTierLabel: appliedDelivery.tierLabel,
    pointsToEarn,
    estimatedDeliveryLabel: appliedDelivery.estimatedLabel,
    promotion: appliedPromotion ? serializePromotion({ ...appliedPromotion, orders: [] }) : null
  };
}

async function scheduleOrderProgress(orderId) {
  const steps = ["Preparing", "OnTheWay", "Delivered"];
  steps.forEach((status, index) => {
    setTimeout(async () => {
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: { status }
        });
        await emitOrderRealtime(orderId, "order/status-updated");
      } catch {
        return;
      }
    }, (index + 1) * 9000);
  });
}

async function emitOrderRealtime(orderId, eventType = "order/updated") {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true, user: true, courier: true, promotion: true },
  });

  if (!order) {
    return;
  }

  broadcastRealtime(eventType, {
    order: {
      ...serializeOrder(order),
      customerName: order.user.name,
      customerPhone: order.user.phone,
      customerEmail: order.user.email,
      promotionCode: order.promotion?.code || null,
    },
  });
}

async function emitCourierRealtime(courierId, eventType = "courier/location-updated") {
  const courier = await prisma.courier.findUnique({
    where: { id: courierId },
    include: { orders: { include: { restaurant: true, user: true, courier: true, promotion: true } } },
  });

  if (!courier) {
    return;
  }

  const activeOrders = courier.orders.filter((order) => order.status !== "Delivered");
  broadcastRealtime(eventType, {
    courier: serializeCourier(courier),
    activeOrders: activeOrders.map((order) => ({
      ...serializeOrder(order),
      customerName: order.user.name,
      customerPhone: order.user.phone,
      customerEmail: order.user.email,
      promotionCode: order.promotion?.code || null,
    })),
  });
}

async function getFirstAvailableCourier() {
  return prisma.courier.findFirst({
    where: { status: { in: ["AVAILABLE", "ON_DELIVERY"] } },
    orderBy: { createdAt: "asc" }
  });
}

async function fetchBootstrapPayload(userId) {
  const [user, restaurants, loyaltyEntries, orders, promotions, menuCategories] = await Promise.all([
    prisma.user.findUnique({
      where: userId ? { id: userId } : { email: DEMO_USER_EMAIL },
      include: { favorites: true, addresses: true }
    }),
    prisma.restaurant.findMany({
      where: { isActive: true },
      include: { menuItems: true },
      orderBy: { name: "asc" }
    }),
    prisma.loyaltyEntry.findMany({
      where: userId ? { userId } : { user: { email: DEMO_USER_EMAIL } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.findMany({
      where: userId ? { userId } : { user: { email: DEMO_USER_EMAIL } },
      include: { restaurant: true, courier: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.promotion.findMany({
      where: { isActive: true },
      include: { orders: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    })
  ]);

  return {
    user: user
      ? serializeUserProfile(user)
      : {
          firstName: "Nina",
          lastName: "Morel",
          name: "Nina Morel",
          email: DEMO_USER_EMAIL,
          phone: "+33 6 24 15 88 19",
          defaultAddress: "12 Rue des Martyrs, 75009 Paris",
          gender: "FEMALE",
          authMethod: "WHATSAPP",
          isPhoneVerified: true,
          onboardingCompleted: true,
        },
    savedAddresses: (user?.addresses || []).map(serializeUserAddress),
    notificationPreferences: serializeNotificationPreferences(user),
    restaurants: restaurants.map(serializeRestaurant),
    favorites: (user?.favorites || []).map((favorite) => favorite.restaurantId),
    orders: orders.map(serializeOrder),
    promotions: promotions.map(serializePromotion),
    menuCategories: menuCategories.map(serializeMenuCategory),
    pointsBalance: loyaltyEntries.reduce((sum, item) => sum + item.points, 0),
    pointsHistory: loyaltyEntries.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      restaurantName: item.restaurantName,
      points: item.points,
      createdAt: item.createdAt.toISOString(),
      description: item.description
    })),
    fallbackLocation: {
      granted: false,
      coordinates: { latitude: 48.8794, longitude: 2.3376 },
      label: "12 Rue des Martyrs, Paris",
      source: "fallback",
      errorMessage: "Position GPS indisponible. Estimation calculee depuis une adresse de demonstration."
    }
  };
}

async function findOrCreateGuestCustomer({ name, phone, restaurantId }) {
  const normalizedPhone = String(phone || "").trim();
  if (!normalizedPhone) {
    return getDemoUser();
  }

  const generatedEmail = `guest_${normalizedPhone.replace(/\D/g, "") || Date.now()}@fooddelyvry.local`;
  const existing = await prisma.user.findUnique({ where: { email: generatedEmail } });
  if (existing) {
    return existing;
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const passwordHash = await bcrypt.hash(generateOpaqueToken("guest"), 4);
  return prisma.user.create({
    data: {
      email: generatedEmail,
      passwordHash,
      name: String(name || "Client QR").trim() || "Client QR",
      phone: normalizedPhone,
      defaultAddress: restaurant?.address || "Sur place",
      role: "CUSTOMER",
    }
  });
}

async function createOrderRecord({
  restaurantId,
  cart,
  draft,
  userCoordinates,
  promoCode,
  orderChannel = "DELIVERY",
  tableLabel = null,
  userId,
}) {
  const [restaurant, customer, summary, courier] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    computeSummary({ restaurantId, cart, userCoordinates, promoCode, orderChannel, userId }),
    orderChannel === "DELIVERY" ? getFirstAvailableCourier() : Promise.resolve(null)
  ]);

  if (!restaurant || !customer || !summary) {
    return null;
  }

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      restaurantId,
      subtotal: summary.subtotal,
      deliveryFee: summary.deliveryFee,
      serviceFee: summary.serviceFee,
      total: summary.total,
      deliveryDistanceKm: summary.deliveryDistanceKm,
      discountAmount: summary.discountAmount,
      pointsEarned: summary.pointsToEarn,
      address: draft.address,
      paymentMethod: draft.paymentMethod,
      notes: draft.notes || null,
      channel: orderChannel,
      tableLabel,
      status: "Confirmed",
      estimatedDeliveryLabel: summary.estimatedDeliveryLabel,
      items: cart,
      courierId: courier?.id || null,
      promotionId: summary.promotion?.id || null
    },
    include: { restaurant: true, courier: true, user: true }
  });

  await prisma.loyaltyEntry.create({
    data: {
      userId: customer.id,
      orderId: order.id,
      restaurantName: restaurant.name,
      points: order.pointsEarned,
      description: `Points gagnes sur la commande ${order.id}`
    }
  });

  await scheduleOrderProgress(order.id);
  await emitOrderRealtime(order.id, "order/created");
  return order;
}

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "fooddelyvry-backend", database: "connected" });
  } catch {
    res.status(500).json({ ok: false, service: "fooddelyvry-backend", database: "disconnected" });
  }
});

app.get("/api/integrations/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    return;
  }

  res.status(403).send("Forbidden");
});

app.post("/api/integrations/whatsapp/webhook", async (req, res) => {
  const statuses = extractWhatsAppStatuses(req.body);

  await Promise.all(statuses.map((statusItem) => applyWhatsAppStatusUpdate(statusItem)));
  res.status(200).json({ ok: true, processed: statuses.length });
});

app.post("/api/auth/request-code", async (req, res) => {
  const method = req.body?.method === "SMS" ? "SMS" : "WHATSAPP";
  const phone = normalizePhoneNumber(req.body?.phone);

  if (!phone) {
    res.status(400).json({ message: "Numero de telephone requis." });
    return;
  }

  if (method === "SMS") {
    res.status(501).json({ message: "La verification SMS sera ajoutee plus tard." });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    const delivery = await sendWhatsAppVerificationCode(phone, code);
    const challenge = await prisma.authChallenge.create({
      data: {
        userId: existingUser?.id || null,
        phone,
        method,
        code,
        providerMessageId: delivery.messageId,
        deliveryStatus: delivery.status,
        sentAt: delivery.status === "SENT" ? new Date() : null,
        expiresAt,
      },
    });

    res.status(201).json({
      challengeId: challenge.id,
      method,
      expiresAt: challenge.expiresAt.toISOString(),
      provider: delivery.provider,
      userExists: Boolean(existingUser),
      demoCode: delivery.provider === "demo" ? code : undefined,
    });
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : "Envoi WhatsApp impossible.",
    });
  }
});

app.post("/api/auth/verify-code", async (req, res) => {
  const challengeId = String(req.body?.challengeId || "").trim();
  const code = String(req.body?.code || "").trim();

  if (!challengeId || !code) {
    res.status(400).json({ message: "Challenge et code requis." });
    return;
  }

  const challenge = await prisma.authChallenge.findUnique({
    where: { id: challengeId },
    include: { user: { include: { addresses: true, favorites: true } } },
  });

  if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) {
    res.status(400).json({ message: "Code expire ou invalide." });
    return;
  }

  if (challenge.code !== code) {
    res.status(401).json({ message: "Code de verification incorrect." });
    return;
  }

  const updatedChallenge = await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { verifiedAt: new Date() },
    include: { user: { include: { addresses: true, favorites: true } } },
  });

  const user = updatedChallenge.user;
  const isProfileComplete = Boolean(user?.phoneVerifiedAt && user?.firstName && user?.lastName && (user?.defaultAddress || user?.addresses?.length));

  if (user && isProfileComplete) {
    await prisma.authChallenge.update({
      where: { id: updatedChallenge.id },
      data: { consumedAt: new Date() },
    });

    res.json({
      verified: true,
      challengeId: updatedChallenge.id,
      userExists: true,
      isProfileComplete: true,
      token: signToken(user),
      user: serializeUserProfile(user),
      savedAddresses: (user.addresses || []).map(serializeUserAddress),
      notificationPreferences: serializeNotificationPreferences(user),
    });
    return;
  }

  res.json({
    verified: true,
    challengeId: updatedChallenge.id,
    userExists: Boolean(user),
    isProfileComplete: false,
    phone: updatedChallenge.phone,
  });
});

app.get("/api/auth/challenges/:id/status", async (req, res) => {
  const challenge = await prisma.authChallenge.findUnique({
    where: { id: req.params.id },
  });

  if (!challenge) {
    res.status(404).json({ message: "Challenge introuvable." });
    return;
  }

  res.json({
    id: challenge.id,
    method: challenge.method,
    phone: challenge.phone,
    providerMessageId: challenge.providerMessageId,
    deliveryStatus: challenge.deliveryStatus,
    errorMessage: challenge.errorMessage,
    sentAt: challenge.sentAt?.toISOString() || null,
    deliveredAt: challenge.deliveredAt?.toISOString() || null,
    readAt: challenge.readAt?.toISOString() || null,
    failedAt: challenge.failedAt?.toISOString() || null,
    verifiedAt: challenge.verifiedAt?.toISOString() || null,
    expiresAt: challenge.expiresAt.toISOString(),
  });
});

app.post("/api/auth/register-profile", async (req, res) => {
  const challengeId = String(req.body?.challengeId || "").trim();
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const gender = req.body?.gender || "UNSPECIFIED";
  const email = String(req.body?.email || "").trim().toLowerCase();
  const addresses = Array.isArray(req.body?.addresses) ? req.body.addresses : [];

  if (!challengeId || !firstName || !lastName || !addresses.length) {
    res.status(400).json({ message: "Profil incomplet." });
    return;
  }

  const challenge = await prisma.authChallenge.findUnique({
    where: { id: challengeId },
    include: { user: true },
  });

  if (!challenge || !challenge.verifiedAt || challenge.consumedAt || challenge.expiresAt < new Date()) {
    res.status(400).json({ message: "Verification expiree. Merci de recommencer." });
    return;
  }

  if (email) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== challenge.userId) {
      res.status(400).json({ message: "Cet email est deja utilise." });
      return;
    }
  }

  const phone = challenge.phone;
  const fallbackEmail = challenge.user?.email || generateCustomerEmailFromPhone(phone);
  const profileEmail = email || fallbackEmail;
  const passwordHash = challenge.user?.passwordHash || (await bcrypt.hash(generateOpaqueToken("cust"), 8));

  const user = await prisma.$transaction(async (tx) => {
    const upsertedUser = challenge.userId
      ? await tx.user.update({
          where: { id: challenge.userId },
          data: {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email: profileEmail,
            phone,
            defaultAddress: String(addresses[0]?.address || "").trim(),
            gender,
            authProvider: challenge.method,
            phoneVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
        })
      : await tx.user.create({
          data: {
            email: profileEmail,
            passwordHash,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            phone,
            defaultAddress: String(addresses[0]?.address || "").trim(),
            gender,
            authProvider: challenge.method,
            phoneVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
        });

    await tx.userAddress.deleteMany({ where: { userId: upsertedUser.id } });
    await tx.userAddress.createMany({
      data: addresses.map((entry, index) => ({
        userId: upsertedUser.id,
        label: String(entry.label || `Adresse ${index + 1}`).trim(),
        address: String(entry.address || "").trim(),
        latitude: entry.coordinates?.latitude !== undefined ? Number(entry.coordinates.latitude) : null,
        longitude: entry.coordinates?.longitude !== undefined ? Number(entry.coordinates.longitude) : null,
        isDefault: index === 0,
      })),
    });

    await tx.authChallenge.update({
      where: { id: challenge.id },
      data: {
        userId: upsertedUser.id,
        consumedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { id: upsertedUser.id },
      include: { addresses: true, favorites: true },
    });
  });

  res.status(201).json({
    token: signToken(user),
    user: serializeUserProfile(user),
    savedAddresses: (user.addresses || []).map(serializeUserAddress),
    notificationPreferences: serializeNotificationPreferences(user),
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    include: { addresses: true, favorites: true },
  });

  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable." });
    return;
  }

  res.json({
    user: serializeUserProfile(user),
    savedAddresses: (user.addresses || []).map(serializeUserAddress),
    notificationPreferences: serializeNotificationPreferences(user),
  });
});

app.patch("/api/auth/notification-preferences", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable." });
    return;
  }

  const payload = req.body || {};
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      notificationsOrderUpdates: payload.orderUpdates !== undefined ? Boolean(payload.orderUpdates) : user.notificationsOrderUpdates,
      notificationsPromotions: payload.promotions !== undefined ? Boolean(payload.promotions) : user.notificationsPromotions,
      notificationsLoyalty: payload.loyalty !== undefined ? Boolean(payload.loyalty) : user.notificationsLoyalty,
    },
    include: { addresses: true, favorites: true },
  });

  res.json({
    notificationPreferences: serializeNotificationPreferences(updatedUser),
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ message: "Email et mot de passe requis." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Identifiants invalides." });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ message: "Identifiants invalides." });
    return;
  }

  res.json({
    token: signToken(user),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/api/bootstrap", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  res.json(await fetchBootstrapPayload(user?.id));
});

app.post("/api/admin/upload-image", requireAuth, requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Aucun fichier image envoye." });
    return;
  }

  res.status(201).json({
    url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

app.get("/api/restaurants", async (_req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    where: { isActive: true },
    include: { menuItems: true },
    orderBy: { name: "asc" }
  });
  res.json(restaurants.map(serializeRestaurant));
});

app.get("/api/restaurants/:id", async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id },
    include: { menuItems: true }
  });

  if (!restaurant || !restaurant.isActive) {
    res.status(404).json({ message: "Restaurant introuvable." });
    return;
  }

  res.json(serializeRestaurant(restaurant));
});

app.post("/api/favorites/toggle", optionalAuth, async (req, res) => {
  const { restaurantId } = req.body || {};
  const demoUser = await getAuthenticatedUser(req);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });

  if (!demoUser || !restaurant) {
    res.status(404).json({ message: "Restaurant ou utilisateur introuvable." });
    return;
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_restaurantId: {
        userId: demoUser.id,
        restaurantId
      }
    }
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({
      data: {
        userId: demoUser.id,
        restaurantId
      }
    });
  }

  const favorites = await prisma.favorite.findMany({ where: { userId: demoUser.id } });

  res.json({
    favorites: favorites.map((entry) => entry.restaurantId),
    changedRestaurant: serializeRestaurant({ ...restaurant, menuItems: [] }),
    isFavorite: !existing
  });
});

app.post("/api/cart/quote", optionalAuth, async (req, res) => {
  const { restaurantId, cart, userCoordinates, promoCode, orderChannel } = req.body || {};
  if (!restaurantId || !Array.isArray(cart) || !userCoordinates) {
    res.status(400).json({ message: "Requete invalide pour le devis panier." });
    return;
  }

  const user = await getAuthenticatedUser(req);
  const summary = await computeSummary({ restaurantId, cart, userCoordinates, promoCode, orderChannel, userId: user?.id });
  if (!summary) {
    res.status(404).json({ message: "Restaurant introuvable." });
    return;
  }

  res.json(summary);
});

app.post("/api/orders", optionalAuth, async (req, res) => {
  const { restaurantId, cart, draft, userCoordinates, promoCode, orderChannel, tableLabel } = req.body || {};
  if (!restaurantId || !Array.isArray(cart) || !cart.length || !draft || !userCoordinates) {
    res.status(400).json({ message: "Impossible de creer la commande." });
    return;
  }

  const demoUser = await getAuthenticatedUser(req);
  if (!demoUser) {
    res.status(404).json({ message: "Restaurant ou utilisateur introuvable." });
    return;
  }

  const order = await createOrderRecord({
    restaurantId,
    cart,
    draft,
    userCoordinates,
    promoCode,
    orderChannel: orderChannel || "DELIVERY",
    tableLabel: tableLabel || null,
    userId: demoUser.id,
  });

  if (!order) {
    res.status(404).json({ message: "Restaurant ou utilisateur introuvable." });
    return;
  }

  const payload = await fetchBootstrapPayload(demoUser.id);
  res.status(201).json({
    order: serializeOrder(order),
    orders: payload.orders,
    pointsBalance: payload.pointsBalance,
    pointsHistory: payload.pointsHistory
  });
});

app.get("/api/orders", async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { restaurant: true, courier: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(orders.map(serializeOrder));
});

app.get("/api/public/qr/:qrToken", async (req, res) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      qrCodeToken: req.params.qrToken,
      validationStatus: "VALIDATED",
    },
    include: { menuItems: true }
  });

  if (!restaurant) {
    res.status(404).json({ message: "QR restaurant introuvable." });
    return;
  }

  res.json({
    restaurant: serializeRestaurant(restaurant),
    orderChannel: "QR_ONSITE",
    landingUrl: getRestaurantQrLandingUrl(req.params.qrToken),
  });
});

app.post("/api/public/qr/:qrToken/orders", async (req, res) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      qrCodeToken: req.params.qrToken,
      validationStatus: "VALIDATED",
    }
  });

  if (!restaurant) {
    res.status(404).json({ message: "Restaurant QR introuvable." });
    return;
  }

  const { cart, customerName, customerPhone, tableLabel, notes, paymentMethod, promoCode } = req.body || {};
  if (!Array.isArray(cart) || !cart.length || !customerPhone) {
    res.status(400).json({ message: "Commande QR incomplete." });
    return;
  }

  const customer = await findOrCreateGuestCustomer({
    name: customerName,
    phone: customerPhone,
    restaurantId: restaurant.id,
  });

  const order = await createOrderRecord({
    restaurantId: restaurant.id,
    cart,
    draft: {
      address: tableLabel ? `Sur place - Table ${tableLabel}` : "Sur place",
      paymentMethod: paymentMethod || "Cash",
      notes: notes || null,
    },
    userCoordinates: { latitude: restaurant.latitude, longitude: restaurant.longitude },
    promoCode,
    orderChannel: "QR_ONSITE",
    tableLabel: tableLabel || null,
    userId: customer.id,
  });

  if (!order) {
    res.status(400).json({ message: "Impossible de creer la commande QR." });
    return;
  }

  res.status(201).json({
    order: serializeOrder(order),
    customer: { name: customer.name, phone: customer.phone },
  });
});

app.get("/qr/:qrToken", async (req, res) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: { qrCodeToken: req.params.qrToken, validationStatus: "VALIDATED" }
  });

  if (!restaurant) {
    res.status(404).send("<h1>QR restaurant introuvable</h1>");
    return;
  }

  res.type("html").send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${restaurant.name} | Menu QR</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #fff7ed; color: #111827; }
      .wrap { max-width: 960px; margin: 0 auto; padding: 24px; }
      .hero { background: linear-gradient(135deg, ${restaurant.heroColor || "#EA580C"}, #111827); color: white; padding: 24px; border-radius: 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 20px; }
      .card { background: white; border-radius: 18px; padding: 16px; box-shadow: 0 10px 30px rgba(17,24,39,.08); }
      .field, button { width: 100%; box-sizing: border-box; margin-top: 12px; padding: 14px; border-radius: 14px; border: 1px solid #d6d3d1; }
      button { background: #111827; color: white; font-weight: 700; cursor: pointer; }
      .muted { color: #6b7280; }
      .ok { color: #166534; font-weight: 700; margin-top: 12px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="hero">
        <h1>${restaurant.name}</h1>
        <p>Commande directe sur place via QR code</p>
      </div>
      <div id="app" class="grid"></div>
    </div>
    <script>
      const qrToken = ${JSON.stringify(req.params.qrToken)};
      const app = document.getElementById("app");
      const state = { restaurant: null, cart: [] };
      function money(value) { return Number(value || 0).toFixed(2) + " EUR"; }
      function addToCart(item) {
        const existing = state.cart.find((entry) => entry.menuItemId === item.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          state.cart.push({
            id: item.id + "::qr",
            restaurantId: state.restaurant.id,
            menuItemId: item.id,
            name: item.name,
            image: item.image,
            quantity: 1,
            basePrice: item.price,
            selectedOptions: []
          });
        }
        render();
      }
      async function submitOrder(event) {
        event.preventDefault();
        const form = new FormData(event.target);
        const response = await fetch("/api/public/qr/" + qrToken + "/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cart: state.cart,
            customerName: form.get("customerName"),
            customerPhone: form.get("customerPhone"),
            tableLabel: form.get("tableLabel"),
            notes: form.get("notes"),
            paymentMethod: "Cash"
          })
        });
        const payload = await response.json();
        const message = response.ok
          ? "Commande envoyee. Reference: " + payload.order.id
          : (payload.message || "Erreur commande");
        document.getElementById("result").textContent = message;
        if (response.ok) {
          state.cart = [];
          render();
          event.target.reset();
        }
      }
      function render() {
        if (!state.restaurant) {
          app.innerHTML = "<div class='card'>Chargement...</div>";
          return;
        }
        const menuCards = state.restaurant.menu.map((item) => "<div class='card'><h3>" + item.name + "</h3><p class='muted'>" + item.description + "</p><strong>" + money(item.price) + "</strong><button onclick='addToCartById(" + JSON.stringify(item.id) + ")'>Ajouter</button></div>").join("");
        const cartTotal = state.cart.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
        app.innerHTML = menuCards + "<div class='card'><h3>Votre commande</h3><p>" + (state.cart.map((item) => item.name + " x" + item.quantity).join("<br/>") || "Panier vide") + "</p><strong>Total: " + money(cartTotal) + "</strong><form id='qr-form'><input class='field' name='customerName' placeholder='Nom' required /><input class='field' name='customerPhone' placeholder='Telephone' required /><input class='field' name='tableLabel' placeholder='Numero de table' /><textarea class='field' name='notes' placeholder='Note cuisine'></textarea><button type='submit'>Commander sur place</button><div id='result' class='ok'></div></form></div>";
        document.getElementById("qr-form").addEventListener("submit", submitOrder);
      }
      window.addToCartById = function(menuItemId) {
        const item = state.restaurant.menu.find((entry) => entry.id === menuItemId);
        if (item) addToCart(item);
      };
      fetch("/api/public/qr/" + qrToken).then((response) => response.json()).then((payload) => {
        state.restaurant = payload.restaurant;
        render();
      }).catch(() => { app.innerHTML = "<div class='card'>Impossible de charger le menu.</div>"; });
    </script>
  </body>
</html>`);
});

app.get("/api/courier/jobs", async (req, res) => {
  const courierId = String(req.query.courierId || "");
  if (!courierId) {
    res.status(400).json({ message: "courierId requis." });
    return;
  }

  const courier = await prisma.courier.findUnique({
    where: { id: courierId },
    include: { orders: { include: { restaurant: true, user: { include: { addresses: true } } } } }
  });

  if (!courier) {
    res.status(404).json({ message: "Livreur introuvable." });
    return;
  }

  const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
  const lng = req.query.lng !== undefined ? Number(req.query.lng) : null;
  if (lat !== null && lng !== null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    await prisma.courier.update({
      where: { id: courierId },
      data: { currentLat: lat, currentLng: lng }
    });
    courier.currentLat = lat;
    courier.currentLng = lng;
    await emitCourierRealtime(courierId);
  }

  const availableOrders = await prisma.order.findMany({
    where: {
      channel: "DELIVERY",
      courierId: null,
      status: { in: ["Confirmed", "Preparing"] }
    },
    include: { restaurant: true, user: { include: { addresses: true } } },
    orderBy: { createdAt: "asc" }
  });

  const courierCoords =
    courier.currentLat !== null && courier.currentLng !== null
      ? { latitude: courier.currentLat, longitude: courier.currentLng }
      : null;

  const formatCourierJob = (order, includeCustomer = false) => {
    const pickupDistanceKm = courierCoords
      ? calculateDistanceKm(courierCoords, {
          latitude: order.restaurant.latitude,
          longitude: order.restaurant.longitude
        })
      : null;
    return {
      id: order.id,
      status: order.status,
      channel: order.channel,
      restaurantName: order.restaurant.name,
      pickupAddress: order.restaurant.address,
      pickupCoordinates: {
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude,
      },
      destinationAddress: order.address,
      destinationCoordinates:
        order.user?.addresses?.[0]?.latitude !== undefined &&
        order.user?.addresses?.[0]?.longitude !== undefined
          ? {
              latitude: order.user.addresses[0].latitude,
              longitude: order.user.addresses[0].longitude,
            }
          : undefined,
      deliveryDistanceKm: order.deliveryDistanceKm,
      pickupDistanceKm,
      total: order.total,
      itemsCount: Array.isArray(order.items) ? order.items.length : 0,
      createdAt: order.createdAt.toISOString(),
      compensation: calculateCourierCompensation(order, courier),
      customer: includeCustomer
        ? {
            name: order.user.name,
            phone: order.user.phone,
            address: order.address,
          }
        : null,
    };
  };

  const activeJobs = courier.orders
    .filter((order) => order.status !== "Delivered")
    .map((order) => formatCourierJob(order, true));
  const history = courier.orders
    .filter((order) => order.status === "Delivered")
    .map((order) => formatCourierJob(order, true));

  res.json({
    courier: serializeCourier(courier),
    availableJobs: availableOrders
      .map((order) => formatCourierJob(order, false))
      .sort((a, b) => (a.pickupDistanceKm ?? 999) - (b.pickupDistanceKm ?? 999)),
    activeJobs,
    history,
  });
});

app.post("/api/courier/jobs/:id/accept", async (req, res) => {
  const courierId = String(req.body?.courierId || "");
  if (!courierId) {
    res.status(400).json({ message: "courierId requis." });
    return;
  }

  const [courier, order] = await Promise.all([
    prisma.courier.findUnique({ where: { id: courierId } }),
    prisma.order.findUnique({
      where: { id: req.params.id },
      include: { restaurant: true, user: { include: { addresses: true } }, courier: true }
    })
  ]);

  if (!courier || !order || order.channel !== "DELIVERY") {
    res.status(404).json({ message: "Course introuvable." });
    return;
  }

  if (order.courierId && order.courierId !== courierId) {
    res.status(409).json({ message: "Cette course a deja ete prise." });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      courierId,
      status: order.status === "Confirmed" ? "OnTheWay" : order.status,
    },
    include: { restaurant: true, user: { include: { addresses: true } }, courier: true }
  });

  await prisma.courier.update({
    where: { id: courierId },
    data: { status: "ON_DELIVERY" }
  });

  await emitOrderRealtime(updatedOrder.id, "order/courier-assigned");
  await emitCourierRealtime(courierId, "courier/job-accepted");

  res.json({
    job: {
      ...serializeOrder(updatedOrder),
      customerName: updatedOrder.user.name,
      customerPhone: updatedOrder.user.phone,
      destinationAddress: updatedOrder.address,
      compensation: calculateCourierCompensation(updatedOrder, courier),
    }
  });
});

app.post("/api/courier/location", async (req, res) => {
  const courierId = String(req.body?.courierId || "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (!courierId || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400).json({ message: "courierId, latitude et longitude requis." });
    return;
  }

  const courier = await prisma.courier.update({
    where: { id: courierId },
    data: { currentLat: latitude, currentLng: longitude },
    include: { orders: true },
  });

  await emitCourierRealtime(courierId);
  const activeOrderIds = courier.orders.filter((order) => order.status !== "Delivered").map((order) => order.id);
  await Promise.all(activeOrderIds.map((orderId) => emitOrderRealtime(orderId, "order/tracking-updated")));

  res.json({
    ok: true,
    courier: serializeCourier(courier),
  });
});

app.post("/api/restaurant/printer/auth", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { printerLastSeenAt: new Date() }
  });

  res.json({
    ok: true,
    restaurant: serializeRestaurant(restaurant),
    billingPlanSummary: getBillingPlanSummary(restaurant),
  });
});

app.get("/api/restaurant/printer/orders", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: restaurant.id,
      printerPrintedAt: null,
      status: { in: ["Confirmed", "Preparing"] }
    },
    include: { restaurant: true, courier: true, user: true },
    orderBy: { createdAt: "asc" }
  });

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { printerLastSeenAt: new Date() }
  });

  res.json(
    orders.map((order) => ({
      ...serializeOrder(order),
      customerName: order.user.name,
      customerPhone: order.user.phone,
    }))
  );
});

app.post("/api/restaurant/printer/orders/:id/printed", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, restaurantId: restaurant.id }
  });

  if (!order) {
    res.status(404).json({ message: "Commande restaurant introuvable." });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id: req.params.id },
    data: { printerPrintedAt: new Date() },
    include: { restaurant: true, courier: true }
  });

  res.json(serializeOrder(updatedOrder));
});

app.post("/api/restaurant/printer/heartbeat", requireRestaurantApiToken, async (req, res) => {
  const restaurant = await prisma.restaurant.update({
    where: { id: req.restaurantAuth.id },
    data: { printerLastSeenAt: new Date() },
    include: { menuItems: true }
  });

  res.json({ ok: true, restaurant: serializeRestaurant(restaurant) });
});

app.get("/api/loyalty", async (_req, res) => {
  const payload = await fetchBootstrapPayload();
  res.json({
    pointsBalance: payload.pointsBalance,
    pointsHistory: payload.pointsHistory
  });
});

app.get("/api/promotions", async (req, res) => {
  const restaurantId = req.query.restaurantId;
  const promotions = await prisma.promotion.findMany({
    where: {
      isActive: true,
      OR: [{ restaurantId: null }, { restaurantId: restaurantId || undefined }]
    },
    include: { orders: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(promotions.map(serializePromotion));
});

app.get("/api/menu-categories", async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(categories.map(serializeMenuCategory));
});

app.post("/api/applications", async (req, res) => {
  const body = req.body || {};
  const type = body.type === "COURIER" ? "COURIER" : "RESTAURANT";
  const applicantName = String(body.applicantName || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const city = String(body.city || "").trim();

  if (!applicantName || !email || !phone || !city) {
    res.status(400).json({ message: "Champs requis manquants." });
    return;
  }

  if (type === "RESTAURANT" && (!String(body.businessName || "").trim() || !String(body.address || "").trim())) {
    res.status(400).json({ message: "Informations restaurant incompletes." });
    return;
  }

  if (type === "COURIER" && !String(body.vehicle || "").trim()) {
    res.status(400).json({ message: "Informations livreur incompletes." });
    return;
  }

  const billingPlanType =
    body.billingPlanType === "PERCENTAGE_PER_ORDER" || body.billingPlanType === "MONTHLY_SUBSCRIPTION"
      ? body.billingPlanType
      : "FIXED_PER_ORDER";
  const billingFixedFee = body.billingFixedFee !== undefined ? Number(body.billingFixedFee) : null;
  const billingPercentage = body.billingPercentage !== undefined ? Number(body.billingPercentage) : null;
  const monthlySubscriptionFee =
    body.monthlySubscriptionFee !== undefined ? Number(body.monthlySubscriptionFee) : null;

  if (type === "RESTAURANT") {
    const isPlanValid =
      (billingPlanType === "FIXED_PER_ORDER" && billingFixedFee !== null && !Number.isNaN(billingFixedFee)) ||
      (billingPlanType === "PERCENTAGE_PER_ORDER" && billingPercentage !== null && !Number.isNaN(billingPercentage)) ||
      (billingPlanType === "MONTHLY_SUBSCRIPTION" &&
        monthlySubscriptionFee !== null &&
        !Number.isNaN(monthlySubscriptionFee));

    if (!isPlanValid) {
      res.status(400).json({ message: "Plan de facturation restaurant invalide." });
      return;
    }
  }

  const applications = readPartnerApplications();
  const application = {
    id: `app_${Date.now()}`,
    type,
    applicantName,
    email,
    phone,
    city,
    businessName: body.businessName?.trim() || null,
    restaurantCategory: body.restaurantCategory?.trim() || null,
    address: body.address?.trim() || null,
    billingPlanType: type === "RESTAURANT" ? billingPlanType : null,
    billingFixedFee: type === "RESTAURANT" ? billingFixedFee : null,
    billingPercentage: type === "RESTAURANT" ? billingPercentage : null,
    monthlySubscriptionFee: type === "RESTAURANT" ? monthlySubscriptionFee : null,
    vehicle: body.vehicle?.trim() || null,
    zone: body.zone?.trim() || null,
    payPerDelivery: type === "COURIER" && body.payPerDelivery !== undefined ? Number(body.payPerDelivery) : null,
    payPerKm: type === "COURIER" && body.payPerKm !== undefined ? Number(body.payPerKm) : null,
    notes: body.notes?.trim() || null,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  applications.unshift(application);
  writePartnerApplications(applications);

  res.status(201).json({ ok: true, applicationId: application.id });
});

app.get("/api/admin/restaurants", requireAuth, requireAdmin, async (_req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    include: { menuItems: true },
    orderBy: { name: "asc" }
  });
  res.json(restaurants.map(serializeRestaurant));
});

app.get("/api/admin/restaurants/:id/qr-code", requireAuth, requireAdmin, async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) {
    res.status(404).json({ message: "Restaurant introuvable." });
    return;
  }

  const qrCodeToken = restaurant.qrCodeToken || generateOpaqueToken("qr");
  if (!restaurant.qrCodeToken) {
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { qrCodeToken }
    });
  }

  const qrUrl = getRestaurantQrLandingUrl(qrCodeToken);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 320 });
  res.json({ qrCodeToken, qrUrl, qrDataUrl });
});

app.post("/api/admin/restaurants", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();

  if (ownerEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      res.status(400).json({ message: "Un compte existe deja avec cet email restaurant." });
      return;
    }
  }

  const restaurantId = body.id || `r${Date.now()}`;
  const generatedApiToken = body.apiToken || generateOpaqueToken("fdrest");
  const generatedQrCodeToken = body.qrCodeToken || generateOpaqueToken("qr");
  const temporaryPassword = `resto-${crypto.randomBytes(4).toString("hex")}`;

  const restaurant = await prisma.$transaction(async (tx) => {
    const createdRestaurant = await tx.restaurant.create({
      data: {
        id: restaurantId,
        name: body.name,
        category: body.category,
        shortDescription: body.shortDescription,
        address: body.address,
        openingHours: body.openingHours,
        deliveryTime: body.deliveryTime,
        rating: Number(body.rating || 4.5),
        reviewCount: Number(body.reviewCount || 0),
        image: body.image,
        heroColor: body.heroColor || "#EA580C",
        latitude: Number(body.coordinates?.latitude || 0),
        longitude: Number(body.coordinates?.longitude || 0),
        tags: body.tags || [],
        pointsPerEuro: Number(body.pointsPerEuro || 10),
        isActive: body.isActive ?? true,
        ownerName: body.ownerName || null,
        ownerEmail: ownerEmail || null,
        ownerPhone: body.ownerPhone || null,
        validationStatus: body.validationStatus || "VALIDATED",
        billingPlanType: body.billingPlanType || "FIXED_PER_ORDER",
        billingFixedFee: body.billingFixedFee !== undefined ? Number(body.billingFixedFee) : null,
        billingPercentage: body.billingPercentage !== undefined ? Number(body.billingPercentage) : null,
        monthlySubscriptionFee:
          body.monthlySubscriptionFee !== undefined ? Number(body.monthlySubscriptionFee) : null,
        apiToken: generatedApiToken,
        qrCodeToken: generatedQrCodeToken,
        validatedAt: body.validatedAt ? new Date(body.validatedAt) : new Date(),
      },
      include: { menuItems: true }
    });

    if (ownerEmail) {
      const passwordHash = await bcrypt.hash(temporaryPassword, 10);
      await tx.user.create({
        data: {
          email: ownerEmail,
          passwordHash,
          name: body.ownerName || body.name,
          phone: body.ownerPhone || null,
          defaultAddress: body.address || null,
          role: "RESTAURANT",
          managedRestaurantId: createdRestaurant.id,
        }
      });
    }

    return createdRestaurant;
  });

  if (ownerEmail) {
    await queueRestaurantAccessEmail({
      restaurantName: restaurant.name,
      ownerName: body.ownerName || restaurant.name,
      ownerEmail,
      loginEmail: ownerEmail,
      temporaryPassword,
      apiToken: generatedApiToken,
      qrCodeUrl: getRestaurantQrLandingUrl(generatedQrCodeToken),
    });
  }

  res.status(201).json({
    ...serializeRestaurant(restaurant),
    generatedAccess: ownerEmail
      ? {
          email: ownerEmail,
          temporaryPassword,
          apiToken: generatedApiToken,
          qrCodeUrl: getRestaurantQrLandingUrl(generatedQrCodeToken),
        }
      : null,
  });
});

app.put("/api/admin/restaurants/:id", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const restaurant = await prisma.restaurant.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      category: body.category,
      shortDescription: body.shortDescription,
      address: body.address,
      openingHours: body.openingHours,
      deliveryTime: body.deliveryTime,
      rating: Number(body.rating || 4.5),
      reviewCount: Number(body.reviewCount || 0),
      image: body.image,
      heroColor: body.heroColor || "#EA580C",
      latitude: Number(body.coordinates?.latitude || 0),
      longitude: Number(body.coordinates?.longitude || 0),
      tags: body.tags || [],
      pointsPerEuro: Number(body.pointsPerEuro || 10),
      isActive: body.isActive ?? true,
      ownerName: body.ownerName || null,
      ownerEmail: body.ownerEmail || null,
      ownerPhone: body.ownerPhone || null,
      validationStatus: body.validationStatus || undefined,
      billingPlanType: body.billingPlanType || undefined,
      billingFixedFee: body.billingFixedFee !== undefined ? Number(body.billingFixedFee) : undefined,
      billingPercentage: body.billingPercentage !== undefined ? Number(body.billingPercentage) : undefined,
      monthlySubscriptionFee:
        body.monthlySubscriptionFee !== undefined ? Number(body.monthlySubscriptionFee) : undefined,
      apiToken: body.apiToken || undefined,
      qrCodeToken: body.qrCodeToken || undefined,
      validatedAt: body.validatedAt ? new Date(body.validatedAt) : undefined,
    },
    include: { menuItems: true }
  });
  res.json(serializeRestaurant(restaurant));
});

app.post("/api/admin/restaurants/:id/menu-items", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const item = await prisma.menuItem.create({
    data: {
      id: body.id || `m${Date.now()}`,
      restaurantId: req.params.id,
      name: body.name,
      description: body.description,
      price: Number(body.price),
      category: body.category,
      image: body.image,
      badge: body.badge || null,
      calories: body.calories ? Number(body.calories) : null,
      stock: Number(body.stock || 0),
      isAvailable: body.isAvailable ?? true,
      options: body.options || []
    }
  });
  res.status(201).json(item);
});

app.put("/api/admin/menu-items/:id", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      description: body.description,
      price: Number(body.price),
      category: body.category,
      image: body.image,
      badge: body.badge || null,
      calories: body.calories ? Number(body.calories) : null,
      stock: Number(body.stock || 0),
      isAvailable: body.isAvailable ?? true,
      options: body.options || []
    }
  });
  res.json(item);
});

app.patch("/api/admin/menu-items/:id/stock", requireAuth, requireAdmin, async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { stock: Number(req.body?.stock || 0) }
  });
  res.json(item);
});

app.patch("/api/admin/menu-items/:id/availability", requireAuth, requireAdmin, async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { isAvailable: Boolean(req.body?.isAvailable) }
  });
  res.json(item);
});

app.delete("/api/admin/menu-items/:id", requireAuth, requireAdmin, async (req, res) => {
  await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() }
  });
  res.status(204).send();
});

app.get("/api/admin/menu-categories", requireAuth, requireAdmin, async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  res.json(categories.map(serializeMenuCategory));
});

app.get("/api/admin/applications", requireAuth, requireAdmin, async (_req, res) => {
  res.json(readPartnerApplications());
});

app.patch("/api/admin/applications/:id", requireAuth, requireAdmin, async (req, res) => {
  const applications = readPartnerApplications();
  const index = applications.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ message: "Demande introuvable." });
    return;
  }

  const nextStatus = req.body?.status || applications[index].status;
  let updatedApplication = {
    ...applications[index],
    status: nextStatus,
    reviewedAt: new Date().toISOString(),
  };

  if (nextStatus === "ACCEPTED") {
    updatedApplication = await ensureApplicationEntity(updatedApplication);
    if (updatedApplication.linkedEntityType === "RESTAURANT" && updatedApplication.linkedEntityId) {
      const generatedApiToken = updatedApplication.generatedApiToken || generateOpaqueToken("fdrest");
      const qrCodeToken = updatedApplication.qrCodeToken || generateOpaqueToken("qr");
      const restaurant = await prisma.restaurant.update({
        where: { id: updatedApplication.linkedEntityId },
        data: {
          validationStatus: "VALIDATED",
          ownerName: updatedApplication.applicantName,
          ownerEmail: updatedApplication.email,
          ownerPhone: updatedApplication.phone,
          billingPlanType: updatedApplication.billingPlanType || "FIXED_PER_ORDER",
          billingFixedFee:
            updatedApplication.billingFixedFee !== null && updatedApplication.billingFixedFee !== undefined
              ? Number(updatedApplication.billingFixedFee)
              : null,
          billingPercentage:
            updatedApplication.billingPercentage !== null && updatedApplication.billingPercentage !== undefined
              ? Number(updatedApplication.billingPercentage)
              : null,
          monthlySubscriptionFee:
            updatedApplication.monthlySubscriptionFee !== null &&
            updatedApplication.monthlySubscriptionFee !== undefined
              ? Number(updatedApplication.monthlySubscriptionFee)
              : null,
          apiToken: generatedApiToken,
          qrCodeToken,
          validatedAt: new Date(),
        }
      });

      updatedApplication = {
        ...updatedApplication,
        generatedApiToken,
        qrCodeToken,
        qrCodeUrl: getRestaurantQrLandingUrl(qrCodeToken),
        linkedEntityLabel: restaurant.name,
      };
    }
  }

  if (nextStatus === "REJECTED" && updatedApplication.linkedEntityType === "RESTAURANT" && updatedApplication.linkedEntityId) {
    await prisma.restaurant.update({
      where: { id: updatedApplication.linkedEntityId },
      data: { validationStatus: "REJECTED" }
    });
  }

  if (applications[index].status !== nextStatus && (nextStatus === "ACCEPTED" || nextStatus === "REJECTED")) {
    await queueApplicationEmail(updatedApplication, nextStatus);
  }

  applications[index] = updatedApplication;

  writePartnerApplications(applications);
  res.json(updatedApplication);
});

app.post("/api/admin/applications/:id/activate-restaurant", requireAuth, requireAdmin, async (req, res) => {
  const applications = readPartnerApplications();
  const application = applications.find((item) => item.id === req.params.id);

  if (!application || application.linkedEntityType !== "RESTAURANT" || !application.linkedEntityId) {
    res.status(404).json({ message: "Restaurant lie introuvable." });
    return;
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: application.linkedEntityId },
    data: { isActive: true, validationStatus: "VALIDATED" },
    include: { menuItems: true }
  });

  res.json(serializeRestaurant(restaurant));
});

app.get("/api/admin/email-outbox", requireAuth, requireAdmin, async (_req, res) => {
  res.json(readEmailOutbox());
});

app.post("/api/admin/menu-categories", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const category = await prisma.menuCategory.create({
    data: {
      name: body.name,
      sortOrder: Number(body.sortOrder || 0),
      isActive: body.isActive ?? true,
    }
  });
  res.status(201).json(serializeMenuCategory(category));
});

app.patch("/api/admin/menu-categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const category = await prisma.menuCategory.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      sortOrder: Number(body.sortOrder || 0),
      isActive: body.isActive ?? true,
    }
  });
  res.json(serializeMenuCategory(category));
});

app.delete("/api/admin/menu-categories/:id", requireAuth, requireAdmin, async (req, res) => {
  const category = await prisma.menuCategory.findUnique({
    where: { id: req.params.id }
  });

  if (!category) {
    res.status(404).json({ message: "Categorie introuvable." });
    return;
  }

  const linkedItems = await prisma.menuItem.count({
    where: {
      category: category.name,
      deletedAt: null,
    }
  });

  if (linkedItems > 0) {
    res.status(400).json({ message: "Impossible de supprimer une categorie utilisee par des plats." });
    return;
  }

  await prisma.menuCategory.delete({
    where: { id: req.params.id }
  });

  res.status(204).send();
});

app.get("/api/admin/customers", requireAuth, requireAdmin, async (_req, res) => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      orders: true,
      loyaltyEntries: true,
      favorites: true
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(customers.map(serializeCustomer));
});

app.patch("/api/admin/customers/:id", requireAuth, requireAdmin, async (req, res) => {
  const customer = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      name: req.body?.name,
      email: req.body?.email,
      phone: req.body?.phone,
      defaultAddress: req.body?.defaultAddress,
      isActive: req.body?.isActive
    },
    include: {
      orders: true,
      loyaltyEntries: true,
      favorites: true
    }
  });
  res.json(serializeCustomer(customer));
});

app.get("/api/admin/couriers", requireAuth, requireAdmin, async (_req, res) => {
  const couriers = await prisma.courier.findMany({
    include: { orders: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(couriers.map(serializeCourier));
});

app.post("/api/admin/couriers", requireAuth, requireAdmin, async (req, res) => {
  const courier = await prisma.courier.create({
    data: {
      name: req.body?.name,
      phone: req.body?.phone,
      vehicle: req.body?.vehicle,
      status: req.body?.status || "AVAILABLE",
      payPerDelivery: req.body?.payPerDelivery !== undefined ? Number(req.body.payPerDelivery) : 3,
      payPerKm: req.body?.payPerKm !== undefined ? Number(req.body.payPerKm) : 0.8,
      zoneLabel: req.body?.zoneLabel || null,
      currentLat: req.body?.currentLat ? Number(req.body.currentLat) : null,
      currentLng: req.body?.currentLng ? Number(req.body.currentLng) : null
    },
    include: { orders: true }
  });
  res.status(201).json(serializeCourier(courier));
});

app.patch("/api/admin/couriers/:id", requireAuth, requireAdmin, async (req, res) => {
  const courier = await prisma.courier.update({
    where: { id: req.params.id },
    data: {
      name: req.body?.name,
      phone: req.body?.phone,
      vehicle: req.body?.vehicle,
      status: req.body?.status,
      payPerDelivery: req.body?.payPerDelivery !== undefined ? Number(req.body.payPerDelivery) : undefined,
      payPerKm: req.body?.payPerKm !== undefined ? Number(req.body.payPerKm) : undefined,
      zoneLabel: req.body?.zoneLabel || null,
      currentLat: req.body?.currentLat !== undefined ? Number(req.body.currentLat) : undefined,
      currentLng: req.body?.currentLng !== undefined ? Number(req.body.currentLng) : undefined
    },
    include: { orders: true }
  });
  res.json(serializeCourier(courier));
});

app.get("/api/admin/promotions", requireAuth, requireAdmin, async (_req, res) => {
  const promotions = await prisma.promotion.findMany({
    include: { orders: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(promotions.map(serializePromotion));
});

app.post("/api/admin/promotions", requireAuth, requireAdmin, async (req, res) => {
  const promotion = await prisma.promotion.create({
    data: {
      code: req.body?.code,
      title: req.body?.title,
      description: req.body?.description || null,
      type: req.body?.type || "PERCENTAGE",
      value: Number(req.body?.value || 0),
      minOrderTotal: Number(req.body?.minOrderTotal || 0),
      isActive: req.body?.isActive ?? true,
      startsAt: new Date(req.body?.startsAt),
      endsAt: new Date(req.body?.endsAt),
      restaurantId: req.body?.restaurantId || null
    },
    include: { orders: true }
  });
  res.status(201).json(serializePromotion(promotion));
});

app.patch("/api/admin/promotions/:id", requireAuth, requireAdmin, async (req, res) => {
  const promotion = await prisma.promotion.update({
    where: { id: req.params.id },
    data: {
      code: req.body?.code,
      title: req.body?.title,
      description: req.body?.description || null,
      type: req.body?.type,
      value: req.body?.value !== undefined ? Number(req.body.value) : undefined,
      minOrderTotal: req.body?.minOrderTotal !== undefined ? Number(req.body.minOrderTotal) : undefined,
      isActive: req.body?.isActive,
      startsAt: req.body?.startsAt ? new Date(req.body.startsAt) : undefined,
      endsAt: req.body?.endsAt ? new Date(req.body.endsAt) : undefined,
      restaurantId: req.body?.restaurantId || null
    },
    include: { orders: true }
  });
  res.json(serializePromotion(promotion));
});

app.get("/api/admin/orders", requireAuth, requireAdmin, async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { restaurant: true, user: true, courier: true, promotion: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(
    orders.map((item) => ({
      ...serializeOrder(item),
      customerName: item.user.name,
      customerPhone: item.user.phone,
      customerEmail: item.user.email,
      promotionCode: item.promotion?.code || null
    }))
  );
});

app.patch("/api/admin/orders/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const { status, reason } = req.body || {};
  if (!status) {
    res.status(400).json({ message: "Statut requis." });
    return;
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: req.params.id }
  });

  if (!existingOrder) {
    res.status(404).json({ message: "Commande introuvable." });
    return;
  }

  const noteSuffix = reason ? `Annulation admin: ${String(reason).trim()}` : null;
  const nextNotes = noteSuffix
    ? [existingOrder.notes, noteSuffix].filter(Boolean).join(" | ")
    : existingOrder.notes;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status: normalizeStatus(status),
      notes: nextNotes
    },
    include: { restaurant: true, courier: true }
  });
  await emitOrderRealtime(order.id, "order/status-updated");
  res.json(serializeOrder(order));
});

app.patch("/api/admin/orders/:id/assign-courier", requireAuth, requireAdmin, async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { courierId: req.body?.courierId || null },
    include: { restaurant: true, courier: true }
  });
  await emitOrderRealtime(order.id, "order/courier-assigned");
  if (order.courierId) {
    await emitCourierRealtime(order.courierId);
  }
  res.json(serializeOrder(order));
});

app.get("/api/admin/reports/summary", requireAuth, requireAdmin, async (_req, res) => {
  const [orders, customers, couriers, promotions, menuItems] = await Promise.all([
    prisma.order.findMany({ include: { restaurant: true, courier: true, promotion: true } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" } }),
    prisma.courier.findMany({ include: { orders: true } }),
    prisma.promotion.findMany({ include: { orders: true } }),
    prisma.menuItem.findMany({ where: { deletedAt: null } })
  ]);

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const discounts = orders.reduce((sum, order) => sum + (order.discountAmount || 0), 0);
  const delivered = orders.filter((order) => order.status === "Delivered").length;
  const averageBasket = orders.length ? revenue / orders.length : 0;
  const lowStockItems = menuItems.filter((item) => item.stock <= 5).length;

  res.json({
    totals: {
      revenue: Number(revenue.toFixed(2)),
      discounts: Number(discounts.toFixed(2)),
      orders: orders.length,
      delivered,
      customers: customers.length,
      couriers: couriers.length,
      promotions: promotions.length,
      averageBasket: Number(averageBasket.toFixed(2)),
      lowStockItems
    },
    topRestaurants: Object.values(
      orders.reduce((accumulator, order) => {
        const key = order.restaurantId;
        accumulator[key] ||= { restaurantId: key, name: order.restaurant.name, revenue: 0, orders: 0 };
        accumulator[key].revenue += order.total;
        accumulator[key].orders += 1;
        return accumulator;
      }, {})
    )
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    courierPerformance: couriers.map(serializeCourier),
    promotionUsage: promotions.map(serializePromotion)
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Erreur serveur interne." });
});

server.listen(PORT, () => {
  console.log(`FoodDelyvry backend running on http://localhost:${PORT}`);
});
