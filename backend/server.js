require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const http = require("http");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { PrismaClient } = require("@prisma/client");
const { WebSocketServer } = require("ws");
const {
  corsMiddleware,
  helmetMiddleware,
  apiRateLimiter,
  validateBody,
  Schemas,
} = require("./security");
const { z } = require("zod");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === "change-me-in-production") {
  console.error("JWT_SECRET is missing or still set to the default placeholder. Set a strong value in your .env file.");
  process.exit(1);
}
const DEMO_USER_EMAIL = "nina.morel@demo.app";
const DEFAULT_QR_WEBAPP_URL = process.env.QR_WEBAPP_URL || `http://localhost:${PORT}`;
const APP_LOGIN_URL = process.env.APP_LOGIN_URL || "fooddelyvry://auth";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "speedz_admin_session";
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "";
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "fr";
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@speedz.app";
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

// Configuration de livraison par défaut (mode zone, alignée sur DELIVERY_TIERS).
const DELIVERY_CONFIG_DEFAULT = {
  mode: "PER_ZONE",
  perKm: { baseFee: 0, pricePerKm: 30, freeUnderKm: 1 },
  zones: [
    { label: "Livraison offerte", maxDistanceKm: 2, fee: 0 },
    { label: "Zone proche", maxDistanceKm: 5, fee: 2 },
    { label: "Zone standard", maxDistanceKm: 8, fee: 4.5 },
    { label: "Zone etendue", maxDistanceKm: 9999, fee: 7 }
  ]
};
const ACTIVE_ORDER_STATUSES = ["AwaitingCourier", "Accepted", "Confirmed", "Preparing", "OnTheWay"];

// Dispatch livreur : fenêtre d'exclusivité pour les livreurs favoris du client
// avant d'ouvrir la course à tous les livreurs de la zone du restaurant.
const FAVORITE_WINDOW_MS = Number(process.env.COURIER_FAVORITE_WINDOW_MS || 60_000);
const DISPATCH_RADIUS_KM = Number(process.env.COURIER_DISPATCH_RADIUS_KM || 8);
// Filet de sécurité : passé ce délai sans preneur, la course s'ouvre à TOUS les
// livreurs, quelle que soit la zone — une commande ne doit jamais rester bloquée.
const DISPATCH_OPEN_TO_ALL_MS = Number(process.env.COURIER_OPEN_TO_ALL_MS || 5 * 60_000);
// Mode OWN avec repli autorisé : délai d'attente laissé aux livreurs du restaurant
// avant d'ouvrir la course à la flotte SpeedZ.
const OWN_FALLBACK_DELAY_MS = Number(process.env.OWN_FALLBACK_DELAY_MS || 5 * 60_000);
// Livreurs préférés d'un restaurant : fenêtre pendant laquelle la course leur est
// réservée avant de s'ouvrir aux autres livreurs éligibles.
const RESTAURANT_PREFERRED_WINDOW_MS = Number(process.env.RESTAURANT_PREFERRED_WINDOW_MS || 5 * 60_000);

// Un restaurant est considéré « en service » si son agent d'impression a communiqué
// récemment (heartbeat / récupération des tickets). Remplace les horaires d'ouverture.
const PRINTER_ONLINE_WINDOW_MS = Number(process.env.PRINTER_ONLINE_WINDOW_MS || 3 * 60_000);
// Interrupteur : mettre REQUIRE_PRINTER_ONLINE=false pour accepter les commandes
// même si l'agent d'impression du restaurant n'est pas connecté.
const REQUIRE_PRINTER_ONLINE = String(process.env.REQUIRE_PRINTER_ONLINE ?? "true") !== "false";

function isPrinterOnline(printerLastSeenAt) {
  if (!printerLastSeenAt) return false;
  const seen = new Date(printerLastSeenAt).getTime();
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen <= PRINTER_ONLINE_WINDOW_MS;
}

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const adminAuditLogFile = path.join(dataDir, "admin-audit-log.jsonl");
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    // .jfif et .jpe sont des variantes de JPEG produites par certains appareils/Windows.
    const allowedMimeTypes = new Set(["image/jpeg", "image/pjpeg", "image/png", "image/webp", "image/gif"]);
    const extension = path.extname(file.originalname || "").toLowerCase();
    const allowedExtensions = new Set([".jpg", ".jpeg", ".jfif", ".jpe", ".png", ".webp", ".gif"]);

    if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
      callback(new Error("Format image non supporte. Utilisez JPG, PNG, WEBP ou GIF."));
      return;
    }

    callback(null, true);
  }
});

app.disable("x-powered-by");
app.set("etag", false);
// Derrière le reverse-proxy cPanel/Passenger : faire confiance au 1er hop pour que
// req.ip reflète l'IP réelle du client (X-Forwarded-For). Sinon toutes les requêtes
// partagent l'IP du proxy → un seul compteur de rate-limit pour TOUT le site (429).
app.set("trust proxy", 1);
app.use(corsMiddleware);
app.use(helmetMiddleware);
app.use(apiRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDir));

app.use("/api", (req, res, next) => {
  // Prevent stale admin/api payloads behind browser, Passenger or proxy caches.
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

// CSRF protection disabled - using SameSite=Lax cookies for protection
// TODO: Implement proper double-submit cookie pattern if needed

// ─── Rate limiters ────────────────────────────────────────────────────────────
// Limite les requêtes OTP pour éviter le brute-force et le SMS flooding

/** Envoi de code OTP : max 5 requêtes / 15 min par IP */
const requestCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives d'envoi de code. Réessayez dans 15 minutes.",
    retryAfter: 15 * 60,
  },
  handler: (req, res, _next, options) => {
    res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
    res.status(429).json(options.message);
  },
  skip: (req) => {
    // Ne pas limiter en mode développement local
    const ip = req.ip || "";
    return ip === "::1" || ip === "127.0.0.1";
  },
});

/** Vérification de code OTP : max 10 requêtes / 15 min par IP */
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives de vérification. Réessayez dans 15 minutes.",
    retryAfter: 15 * 60,
  },
  handler: (req, res, _next, options) => {
    res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
    res.status(429).json(options.message);
  },
  skip: (req) => {
    const ip = req.ip || "";
    return ip === "::1" || ip === "127.0.0.1";
  },
});

/** Login admin : max 10 tentatives / 15 min par IP */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
    retryAfter: 15 * 60,
  },
  handler: (req, res, _next, options) => {
    res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
    res.status(429).json(options.message);
  },
  skip: (req) => {
    const ip = req.ip || "";
    return ip === "::1" || ip === "127.0.0.1";
  },
});
// ─────────────────────────────────────────────────────────────────────────────

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

function broadcastAdminResource(type, payload = {}) {
  broadcastRealtime(`admin/${type}`, payload);
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

// Distance de repli quand un restaurant n'a pas de coordonnées GPS renseignées.
// Sans ce garde-fou, la distance est calculée vers (0,0) — soit des milliers de km,
// ce qui fait exploser les frais de livraison ET la rémunération du livreur.
const FALLBACK_DELIVERY_DISTANCE_KM = Number(process.env.FALLBACK_DELIVERY_DISTANCE_KM || 3);

// Un restaurant en mode OWN peut-il assurer la livraison maintenant ?
// « Off ou occupé » : on exige au moins un livreur propre réellement disponible.
async function hasAvailableOwnCourier(restaurantId) {
  if (!restaurantId) return false;
  const count = await prisma.courier.count({
    where: { restaurantId, status: "AVAILABLE" },
  });
  return count > 0;
}

/**
 * Tarification livraison selon le mode du restaurant.
 *
 * Mode OWN : livraison offerte dans le rayon de gratuité — MAIS uniquement si un
 * livreur du restaurant est disponible. Si aucun ne l'est et que le restaurant a
 * autorisé le repli, on facture le barème SpeedZ **dès le devis** : le client voit
 * le vrai prix avant de commander, il n'est jamais surfacturé après coup.
 *
 * Retourne { quote, useSpeedzFleet } — useSpeedzFleet indique que la course devra
 * être servie par la flotte SpeedZ.
 */
async function applyOwnDeliveryPricing(restaurant, quote) {
  if (restaurant?.deliveryMode !== "OWN") {
    return { quote, useSpeedzFleet: true };
  }

  const ownCourierAvailable = await hasAvailableOwnCourier(restaurant.id);

  // Aucun livreur propre disponible + repli autorisé => barème SpeedZ payant.
  if (!ownCourierAvailable && restaurant.allowSpeedzFallback) {
    return { quote, useSpeedzFleet: true };
  }

  // Livraison offerte par le restaurant, dans son rayon de gratuité.
  const radiusKm = Number(restaurant.freeDeliveryRadiusKm ?? 0);
  if (radiusKm > 0 && quote.distanceKm > radiusKm) {
    return { quote, useSpeedzFleet: false };
  }
  return {
    quote: { ...quote, fee: 0, tierLabel: "Livraison offerte par le restaurant" },
    useSpeedzFleet: false,
  };
}

function getDeliveryQuote(userCoordinates, restaurantCoordinates) {
  const coordsUsable =
    hasUsableCoordinates(userCoordinates?.latitude, userCoordinates?.longitude) &&
    hasUsableCoordinates(restaurantCoordinates?.latitude, restaurantCoordinates?.longitude);

  if (!coordsUsable) {
    console.warn("[livraison] Coordonnées manquantes — distance de repli appliquée. Renseignez le GPS du restaurant.");
  }

  const distanceKm = coordsUsable
    ? calculateDistanceKm(userCoordinates, restaurantCoordinates)
    : FALLBACK_DELIVERY_DISTANCE_KM;
  const { fee, label } = computeDeliveryFee(distanceKm);
  const estimatedMinutes = Math.max(18, Math.round(12 + distanceKm * 4.5));

  return {
    distanceKm,
    fee,
    tierLabel: label,
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

// Identifiant public du livreur = les 6 derniers chiffres de son téléphone.
// Partagé verbalement par le livreur pour que le client le retrouve en favori.
function courierCode(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.slice(-6);
}

function generateVerificationCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function generateCustomerEmailFromPhone(phone) {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, "");
  return `customer_${digits || Date.now()}@speedz.app`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hasSmtpConfig() {
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_FROM);
}

function splitFullName(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName: firstName || normalized,
    lastName: rest.join(" ").trim() || firstName || normalized,
  };
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
  // Retire un éventuel slash final de QR_WEBAPP_URL pour éviter "//qr/".
  return `${DEFAULT_QR_WEBAPP_URL.replace(/\/+$/, "")}/qr/${qrCodeToken}`;
}

function getRequestPublicBaseUrl(req) {
  const configuredBaseUrl =
    process.env.IMAGE_URL_BASE ||
    process.env.PUBLIC_BASE_URL ||
    process.env.API_BASE_URL ||
    "";

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  const host = forwardedHost || req.headers.host || "localhost";
  const protocol = forwardedProto || req.protocol || "http";

  return `${protocol}://${host}`.replace(/\/$/, "");
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
    weeklyHours: record.weeklyHours || null,
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
    // Un restaurant est « en service » tant que son agent d'impression communique.
    // C'est ce qui remplace les horaires d'ouverture : sans imprimante connectée,
    // le restaurant reste visible dans l'app mais n'accepte pas de commande.
    isOnline: isPrinterOnline(record.printerLastSeenAt),
    deliveryMode: record.deliveryMode || "SPEEDZ",
    freeDeliveryRadiusKm: record.freeDeliveryRadiusKm ?? null,
    allowSpeedzFallback: Boolean(record.allowSpeedzFallback),
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

function getRestaurantTableQrUrl(restaurant, table) {
  const base = restaurant.qrCodeToken ? getRestaurantQrLandingUrl(restaurant.qrCodeToken) : null;
  if (!base) {
    return null;
  }
  return `${base}?table=${encodeURIComponent(table.label)}`;
}

function serializeTable(record, restaurant) {
  return {
    id: record.id,
    restaurantId: record.restaurantId,
    label: record.label,
    zone: record.zone || null,
    seats: record.seats,
    status: record.status,
    sortOrder: record.sortOrder,
    qrToken: record.qrToken,
    qrUrl: restaurant ? getRestaurantTableQrUrl(restaurant, record) : null,
    createdAt: record.createdAt ? record.createdAt.toISOString() : null,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : null,
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
    role: record.role,
    managedRestaurantId: record.managedRestaurantId || null,
    authMethod: record.authProvider || undefined,
    isPhoneVerified: Boolean(record.phoneVerifiedAt),
    onboardingCompleted: Boolean(record.phoneVerifiedAt && record.firstName && record.lastName),
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
    code: courierCode(record.phone),
    // Rattachement : null = flotte SpeedZ, sinon livreur propre à ce restaurant.
    restaurantId: record.restaurantId || null,
    restaurantName: record.restaurant?.name || null,
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

// ─── Notifications push (stockage fichier, sans migration de schéma) ───────────
const pushTokensFile = path.join(dataDir, "push-tokens.json");

function readPushTokens() {
  try {
    if (!fs.existsSync(pushTokensFile)) return {};
    return JSON.parse(fs.readFileSync(pushTokensFile, "utf8")) || {};
  } catch {
    return {};
  }
}

function writePushTokens(map) {
  fs.writeFileSync(pushTokensFile, JSON.stringify(map, null, 2), "utf8");
}

function savePushToken(userId, token) {
  if (!userId || !token) return;
  const map = readPushTokens();
  map[userId] = { token, updatedAt: new Date().toISOString() };
  writePushTokens(map);
}

function getPushToken(userId) {
  if (!userId) return null;
  const entry = readPushTokens()[userId];
  return entry?.token || null;
}

// ─── Programme de fidélité (stockage fichier, administré par l'admin) ─────────
// Les points ne sont plus dérivés d'un taux par restaurant : un unique programme
// global, paramétré par l'admin, décide s'il y a des points et combien.
const LOYALTY_CONFIG_DEFAULT = {
  enabled: true,
  pointsPerEuro: 1,
  minOrderTotal: 0,
};
const loyaltyConfigFile = path.join(dataDir, "loyalty-config.json");
let loyaltyConfigCache = null;

function readLoyaltyConfig() {
  if (loyaltyConfigCache) return loyaltyConfigCache;
  try {
    if (fs.existsSync(loyaltyConfigFile)) {
      const raw = JSON.parse(fs.readFileSync(loyaltyConfigFile, "utf8"));
      loyaltyConfigCache = { ...LOYALTY_CONFIG_DEFAULT, ...raw };
    } else {
      loyaltyConfigCache = LOYALTY_CONFIG_DEFAULT;
    }
  } catch {
    loyaltyConfigCache = LOYALTY_CONFIG_DEFAULT;
  }
  return loyaltyConfigCache;
}

function writeLoyaltyConfig(config) {
  loyaltyConfigCache = config;
  fs.writeFileSync(loyaltyConfigFile, JSON.stringify(config, null, 2), "utf8");
}

// Points gagnés pour un sous-total, selon le programme configuré par l'admin.
// Programme désactivé ou commande sous le minimum ⇒ aucun point.
function computeLoyaltyPoints(subtotal, config = readLoyaltyConfig()) {
  if (!config.enabled) return 0;
  if (Number(subtotal) < Number(config.minOrderTotal || 0)) return 0;
  return Math.max(0, Math.round(Number(subtotal) * Number(config.pointsPerEuro || 0)));
}

// ─── Configuration de livraison (stockage fichier, sans migration) ────────────
const deliveryConfigFile = path.join(dataDir, "delivery-config.json");
let deliveryConfigCache = null;

function readDeliveryConfig() {
  if (deliveryConfigCache) return deliveryConfigCache;
  try {
    if (fs.existsSync(deliveryConfigFile)) {
      const raw = JSON.parse(fs.readFileSync(deliveryConfigFile, "utf8"));
      deliveryConfigCache = { ...DELIVERY_CONFIG_DEFAULT, ...raw };
    } else {
      deliveryConfigCache = DELIVERY_CONFIG_DEFAULT;
    }
  } catch {
    deliveryConfigCache = DELIVERY_CONFIG_DEFAULT;
  }
  return deliveryConfigCache;
}

function writeDeliveryConfig(config) {
  deliveryConfigCache = config;
  fs.writeFileSync(deliveryConfigFile, JSON.stringify(config, null, 2), "utf8");
}

// Calcule les frais de livraison selon le mode configuré (au km ou par zone).
function computeDeliveryFee(distanceKm, config = readDeliveryConfig()) {
  if (config.mode === "PER_KM") {
    const perKm = config.perKm || DELIVERY_CONFIG_DEFAULT.perKm;
    const baseFee = Number(perKm.baseFee) || 0;
    const pricePerKm = Number(perKm.pricePerKm) || 0;
    const freeUnderKm = Number(perKm.freeUnderKm) || 0;
    if (distanceKm <= freeUnderKm) {
      return { fee: 0, label: "Livraison offerte" };
    }
    const fee = Number((baseFee + distanceKm * pricePerKm).toFixed(2));
    return { fee, label: `${distanceKm} km` };
  }

  const zones = (config.zones && config.zones.length ? config.zones : DELIVERY_CONFIG_DEFAULT.zones)
    .slice()
    .sort((a, b) => a.maxDistanceKm - b.maxDistanceKm);
  const zone = zones.find((entry) => distanceKm <= entry.maxDistanceKm) || zones[zones.length - 1];
  return { fee: Number(zone.fee) || 0, label: zone.label };
}

// ─── Publicités (stockage fichier, sans migration de schéma) ──────────────────
const adsFile = path.join(dataDir, "ads.json");

function readAds() {
  try {
    if (!fs.existsSync(adsFile)) return [];
    return JSON.parse(fs.readFileSync(adsFile, "utf8")) || [];
  } catch {
    return [];
  }
}

function writeAds(items) {
  fs.writeFileSync(adsFile, JSON.stringify(items, null, 2), "utf8");
}

function serializeAd(ad) {
  return {
    id: ad.id,
    title: ad.title,
    imageUrl: ad.imageUrl,
    placement: ad.placement,
    isActive: Boolean(ad.isActive),
    startsAt: ad.startsAt || null,
    endsAt: ad.endsAt || null,
    restaurantId: ad.restaurantId || null,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt || null,
  };
}

function isAdLive(ad, now = new Date()) {
  if (!ad.isActive) return false;
  if (ad.startsAt && new Date(ad.startsAt) > now) return false;
  if (ad.endsAt && new Date(ad.endsAt) < now) return false;
  return true;
}

// ─── Versements restaurant (stockage fichier, sans migration de schéma) ───────
// Suit ce que chaque restaurant a réglé à la plateforme (ex. commission %).
const settlementsFile = path.join(dataDir, "restaurant-settlements.json");

function readSettlements() {
  try {
    if (!fs.existsSync(settlementsFile)) return [];
    return JSON.parse(fs.readFileSync(settlementsFile, "utf8")) || [];
  } catch {
    return [];
  }
}

function writeSettlements(items) {
  fs.writeFileSync(settlementsFile, JSON.stringify(items, null, 2), "utf8");
}

function serializeSettlement(entry) {
  return {
    id: entry.id,
    restaurantId: entry.restaurantId,
    amount: Number(entry.amount) || 0,
    method: entry.method || null,
    note: entry.note || null,
    paidAt: entry.paidAt || entry.createdAt,
    createdAt: entry.createdAt,
  };
}

// Nombre de mois entiers écoulés depuis une date (min. 1), pour l'abonnement.
function fullMonthsSince(date, now = new Date()) {
  if (!date) return 1;
  const start = new Date(date);
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() >= start.getDate()) months += 1;
  return Math.max(1, months);
}

/**
 * Calcule la facturation d'un restaurant : ce qu'il doit à la plateforme selon
 * son plan (commission %, frais fixe, ou abonnement) sur ses commandes livrées.
 * `orders` = commandes du restaurant (déjà filtrées ou non).
 */
function computeRestaurantBilling(restaurant, orders) {
  const restaurantOrders = orders.filter((order) => order.restaurantId === restaurant.id);
  const delivered = restaurantOrders.filter((order) => order.status === "Delivered");
  const grossSales = Number(delivered.reduce((sum, order) => sum + (order.subtotal || 0), 0).toFixed(2));

  let amountDue = 0;
  let planLabel = "";
  const planType = restaurant.billingPlanType || "FIXED_PER_ORDER";

  if (planType === "PERCENTAGE_PER_ORDER") {
    const pct = Number(restaurant.billingPercentage || 0);
    amountDue = Number((grossSales * (pct / 100)).toFixed(2));
    planLabel = `Commission ${pct}%`;
  } else if (planType === "MONTHLY_SUBSCRIPTION") {
    const monthlyFee = Number(restaurant.monthlySubscriptionFee || 0);
    amountDue = Number((monthlyFee * fullMonthsSince(restaurant.createdAt)).toFixed(2));
    planLabel = `Abonnement ${monthlyFee.toFixed(2)} / mois`;
  } else {
    const fixedFee = Number(restaurant.billingFixedFee || 0);
    amountDue = Number((delivered.length * fixedFee).toFixed(2));
    planLabel = `Frais fixe ${fixedFee.toFixed(2)} / commande`;
  }

  return {
    restaurantId: restaurant.id,
    planType,
    planLabel,
    planSummary: getBillingPlanSummary(restaurant),
    ordersCount: restaurantOrders.length,
    deliveredCount: delivered.length,
    grossSales,
    amountDue,
  };
}

// ─── Liaison menu POS ↔ SpeedZ (mapping d'IDs, stockage fichier) ─────────────
// Permet une synchro bidirectionnelle stable : on garde la correspondance entre
// l'ID produit du logiciel de caisse (externalId) et l'ID de l'article SpeedZ.
const posMenuLinksFile = path.join(dataDir, "pos-menu-links.json");

function readPosMenuLinks() {
  try {
    if (!fs.existsSync(posMenuLinksFile)) return {};
    return JSON.parse(fs.readFileSync(posMenuLinksFile, "utf8")) || {};
  } catch {
    return {};
  }
}

function writePosMenuLinks(map) {
  fs.writeFileSync(posMenuLinksFile, JSON.stringify(map, null, 2), "utf8");
}

// Retourne { [externalId]: speedzItemId } pour un restaurant.
function getRestaurantItemLinks(restaurantId) {
  const all = readPosMenuLinks();
  return (all[restaurantId] && all[restaurantId].items) || {};
}

function setRestaurantItemLinks(restaurantId, items) {
  const all = readPosMenuLinks();
  all[restaurantId] = { items };
  writePosMenuLinks(all);
}

// Assemble facturation + versements + solde pour un restaurant.
function buildRestaurantBillingStatement(restaurant, orders, settlements) {
  const billing = computeRestaurantBilling(restaurant, orders);
  const mine = settlements
    .filter((entry) => entry.restaurantId === restaurant.id)
    .map(serializeSettlement)
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  const totalPaid = Number(mine.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2));
  const balance = Number((billing.amountDue - totalPaid).toFixed(2));
  return { ...billing, totalPaid, balance, settlements: mine };
}

/**
 * Envoie une notification via l'API Expo Push. Best-effort : n'échoue jamais
 * l'appelant (log seulement), pour ne pas casser la mise à jour de commande.
 */
async function sendExpoPush({ to, title, body, data }) {
  if (!to || !/^ExponentPushToken\[/.test(to)) return;
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, title, body, data: data || {}, sound: "default", priority: "high" }),
    });
    if (!response.ok) {
      console.error("[push] Expo a répondu", response.status);
    }
  } catch (error) {
    console.error("[push] échec envoi notification:", error?.message || error);
  }
}

/**
 * Envoi push en lot (campagnes admin). L'API Expo accepte un tableau de messages ;
 * on découpe par paquets de 100 (limite Expo). Retourne le nombre de tokens ciblés.
 * Best-effort : ne jette jamais.
 */
async function sendExpoPushBatch(tokens, { title, body, data }) {
  const valid = [...new Set((tokens || []).filter((t) => /^ExponentPushToken\[/.test(t)))];
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100).map((to) => ({
      to,
      title,
      body,
      data: data || {},
      sound: "default",
      priority: "high",
    }));
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        console.error("[push] Expo (lot) a répondu", response.status);
      }
    } catch (error) {
      console.error("[push] échec envoi lot:", error?.message || error);
    }
  }
  return valid.length;
}

// Tous les tokens push des clients (stockés en fichier, clés = userId).
function getAllClientPushTokens() {
  const map = readPushTokens();
  return Object.values(map)
    .map((entry) => entry?.token)
    .filter(Boolean);
}

// Tous les tokens push des livreurs (stockés sur le profil Courier).
async function getAllCourierPushTokens() {
  const couriers = await prisma.courier.findMany({
    where: { pushToken: { not: null } },
    select: { pushToken: true },
  });
  return couriers.map((c) => c.pushToken).filter(Boolean);
}

// Historique des campagnes push (fichier), pour affichage dans l'admin.
const pushCampaignsFile = path.join(dataDir, "push-campaigns.json");
function readPushCampaigns() {
  try {
    if (!fs.existsSync(pushCampaignsFile)) return [];
    return JSON.parse(fs.readFileSync(pushCampaignsFile, "utf8")) || [];
  } catch {
    return [];
  }
}
function writePushCampaigns(items) {
  fs.writeFileSync(pushCampaignsFile, JSON.stringify(items.slice(0, 100), null, 2), "utf8");
}

const ORDER_STATUS_PUSH = {
  CONFIRMED: { title: "Commande confirmée ✅", body: "Votre commande a été confirmée par le restaurant." },
  PREPARING: { title: "En préparation 👨‍🍳", body: "Votre commande est en cours de préparation." },
  READY: { title: "Commande prête 🍽️", body: "Votre commande est prête." },
  ON_THE_WAY: { title: "En route 🛵", body: "Votre livreur est en route !" },
  OUT_FOR_DELIVERY: { title: "En route 🛵", body: "Votre livreur est en route !" },
  DELIVERED: { title: "Livrée 🎉", body: "Votre commande a été livrée. Bon appétit !" },
  CANCELLED: { title: "Commande annulée", body: "Votre commande a été annulée." },
};

async function notifyOrderStatus(order) {
  try {
    const token = getPushToken(order?.userId);
    if (!token) return;
    const preset = ORDER_STATUS_PUSH[String(order.status || "").toUpperCase()];
    if (!preset) return;
    await sendExpoPush({
      to: token,
      title: preset.title,
      body: preset.body,
      data: { type: "order-status", orderId: order.id, status: order.status },
    });
  } catch (error) {
    console.error("[push] notifyOrderStatus:", error?.message || error);
  }
}

class ApiError extends Error {
  constructor(status, message, code = "API_ERROR", details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function ok(res, payload, status = 200) {
  res.status(status).json(payload);
}

function errorResponse(res, status, message, code = "API_ERROR", details = undefined) {
  res.status(status).json({
    message,
    code,
    error: {
      code,
      message,
      details: details || undefined,
    },
  });
}

function getPublicError(error) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error?.code === "P2002") {
    return {
      status: 409,
      message: "Une valeur unique existe deja en base.",
      code: "UNIQUE_CONSTRAINT",
      details: error.meta || undefined,
    };
  }

  if (error?.code === "P2022") {
    return {
      status: 500,
      message: "La base de donnees n'est pas a jour. Lancez npm run prisma:push puis redemarrez l'application Node.js.",
      code: "DATABASE_SCHEMA_OUT_OF_SYNC",
      details: error.meta || undefined,
    };
  }

  if (error?.name === "PrismaClientValidationError") {
    return {
      status: 400,
      message: "Donnees envoyees invalides pour cette operation.",
      code: "INVALID_DATABASE_PAYLOAD",
    };
  }

  if (typeof error?.message === "string" && error.message.startsWith("Origine non autorisée")) {
    return {
      status: 403,
      message: error.message,
      code: "CORS_ORIGIN_DENIED",
    };
  }

  return {
    status: 500,
    message: "Erreur serveur interne.",
    code: "INTERNAL_SERVER_ERROR",
  };
}

function parsePagination(query, { defaultLimit = 50, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(query.limit || defaultLimit), 10) || defaultLimit));
  const skip = (page - 1) * limit;
  const search = String(query.search || "").trim();
  const status = String(query.status || "").trim();

  return { page, limit, skip, search, status };
}

function paginated(items, total, { page, limit }) {
  return {
    items,
    meta: {
      page,
      limit,
      total,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

function wrapAsync(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function logAdminAction(req, action, entityType, entityId, details = {}) {
  const entry = {
    id: crypto.randomUUID(),
    action,
    entityType,
    entityId,
    adminId: req.auth?.sub || null,
    adminEmail: req.auth?.email || null,
    ip: req.ip || null,
    at: new Date().toISOString(),
    details,
  };

  fs.appendFileSync(adminAuditLogFile, `${JSON.stringify(entry)}\n`, "utf8");
}

function detectImageTypeFromFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a") {
    return "image/gif";
  }
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "image/gif";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
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

async function sendEmailMessage({ to, subject, text, html, metadata }) {
  const outbox = readEmailOutbox();
  const entry = {
    id: `mail_${Date.now()}`,
    to,
    subject,
    text,
    html: html || null,
    status: "QUEUED",
    provider: hasSmtpConfig() ? "smtp" : "outbox",
    metadata: metadata || null,
    createdAt: new Date().toISOString(),
  };

  if (!hasSmtpConfig()) {
    outbox.unshift(entry);
    writeEmailOutbox(outbox);
    return {
      provider: "outbox",
      status: "QUEUED",
      messageId: entry.id,
    };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const result = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  // nodemailer résout même si le serveur SMTP a rejeté certains destinataires.
  // On vérifie explicitement qu'au moins un destinataire a été accepté, et on
  // conserve la réponse SMTP brute dans l'outbox pour pouvoir diagnostiquer
  // (ex: message accepté par le relais mais bloqué ensuite par SPF/DKIM).
  const accepted = Array.isArray(result.accepted) ? result.accepted : [];
  const rejected = Array.isArray(result.rejected) ? result.rejected : [];
  const delivered = accepted.length > 0 && rejected.length === 0;

  entry.status = delivered ? "SENT" : "REJECTED";
  entry.provider = "smtp";
  entry.messageId = result.messageId || null;
  entry.smtpResponse = result.response || null;
  entry.accepted = accepted;
  entry.rejected = rejected;
  entry.sentAt = new Date().toISOString();
  outbox.unshift(entry);
  writeEmailOutbox(outbox);

  if (!delivered) {
    const error = new Error(
      `SMTP a rejeté le destinataire (${rejected.join(", ") || "aucun accepté"}). Réponse: ${result.response || "inconnue"}`
    );
    error.rejected = rejected;
    error.responseCode = result.responseCode;
    throw error;
  }

  return {
    provider: "smtp",
    status: "SENT",
    messageId: result.messageId || entry.id,
  };
}

/**
 * Classe une erreur d'envoi d'email SMTP.
 * - "invalid-recipient" : l'adresse est refusée/inexistante (erreur utilisateur -> 400)
 * - "transport"         : SMTP indisponible, auth, DNS, timeout (erreur serveur -> 502)
 * Ne renvoie jamais le texte brut SMTP au client.
 */
function classifyEmailError(error) {
  const responseCode = Number(error?.responseCode);
  const code = String(error?.code || "").toUpperCase();
  const rejected = Array.isArray(error?.rejected) ? error.rejected : [];
  const isRecipientRejected =
    rejected.length > 0 ||
    code === "EENVELOPE" ||
    (responseCode >= 500 && responseCode < 600);

  if (isRecipientRejected) {
    return {
      kind: "invalid-recipient",
      status: 400,
      message: "Cette adresse email semble invalide ou injoignable. Vérifiez-la et réessayez.",
    };
  }

  return {
    kind: "transport",
    status: 502,
    message: "L'envoi de l'email a échoué. Réessayez dans quelques instants.",
  };
}

async function sendEmailVerificationCode({ email, code, fullName }) {
  const greetingName = String(fullName || "").trim() || email;
  const subject = "Speedz - Votre code de connexion";
  const text =
    `Bonjour ${greetingName},\n` +
    `Votre code OTP Speedz est: ${code}\n` +
    `Ce code expire dans 10 minutes.\n` +
    `Si vous n'etes pas a l'origine de cette demande, ignorez cet email.`;

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8f4ee;padding:24px;color:#111827">
      <div style="max-width:560px;margin:0 auto;background:#fffaf5;border-radius:24px;padding:24px;border:1px solid #eee4d8">
        <div style="display:inline-block;background:#111827;color:#ffffff;border-radius:999px;padding:8px 14px;font-weight:700">Speedz</div>
        <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#111827">Code de connexion</h1>
        <p style="margin:0 0 18px;color:#64748b;line-height:1.6">Bonjour ${greetingName}, utilisez ce code pour valider votre connexion.</p>
        <div style="background:#fff4e8;border-radius:18px;padding:18px;text-align:center;border:1px solid #f3d7bc">
          <div style="font-size:34px;letter-spacing:8px;font-weight:800;color:#ea580c">${code}</div>
        </div>
        <p style="margin:18px 0 0;color:#64748b;line-height:1.6">Ce code expire dans 10 minutes.</p>
      </div>
    </div>
  `;

  return sendEmailMessage({
    to: email,
    subject,
    text,
    html,
    metadata: { kind: "email-otp" },
  });
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

  // Envoi réel via SMTP (sendEmailMessage écrit lui-même dans l'outbox avec le
  // vrai statut SENT/REJECTED). Best-effort : un échec d'email ne doit pas
  // empêcher la création du restaurant.
  try {
    await sendEmailMessage({
      to: ownerEmail,
      subject: "SpeedZ - Acces a votre espace restaurant",
      text: `Bonjour ${ownerName || restaurantName}, votre espace restaurant est pret.\nRestaurant: ${restaurantName}\nEmail: ${loginEmail}\nMot de passe temporaire: ${temporaryPassword}\nToken API: ${apiToken}\nLien QR: ${qrCodeUrl}\nMerci de vous connecter puis de changer votre mot de passe.`,
      metadata: { kind: "restaurant-access", restaurantName },
    });
  } catch (error) {
    console.error("[email] Envoi de l'accès restaurant échoué:", error.message);
  }
}

// Crée (ou relie) le compte de connexion à l'espace restaurateur web.
// Appelé au moment où le token est généré : le restaurateur reçoit par email
// ses identifiants de portail EN PLUS du token API (utilisé par l'agent d'impression).
// Retourne { email, temporaryPassword|null } — temporaryPassword null si le compte
// existait déjà (on ne réinitialise pas son mot de passe).
async function ensureRestaurantPortalAccount({ email, name, phone, address, restaurantId }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Compte déjà présent : on s'assure qu'il est bien rattaché à ce restaurant.
    if (existing.managedRestaurantId !== restaurantId || existing.role !== "RESTAURANT") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "RESTAURANT", managedRestaurantId: restaurantId, isActive: true },
      });
    }
    return { email: normalizedEmail, temporaryPassword: null };
  }

  const temporaryPassword = `resto-${crypto.randomBytes(4).toString("hex")}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name || normalizedEmail,
      phone: phone || null,
      defaultAddress: address || null,
      role: "RESTAURANT",
      managedRestaurantId: restaurantId,
    },
  });
  return { email: normalizedEmail, temporaryPassword };
}

async function queueApplicationEmail(application, status) {
  const planSummary = application.type === "RESTAURANT" ? getBillingPlanSummary(application) : null;
  const subject =
    status === "ACCEPTED"
      ? "SpeedZ - Votre candidature a ete acceptee"
      : "SpeedZ - Mise a jour de votre candidature";
  const text =
    status === "ACCEPTED"
      ? application.type === "RESTAURANT"
        ? `Bonjour ${application.applicantName}, votre compte restaurant a ete valide.\nPlan: ${planSummary}\n\n== Espace restaurateur (web) ==\nConnexion: ${application.portalEmail || application.email}${application.portalTemporaryPassword ? `\nMot de passe temporaire: ${application.portalTemporaryPassword}\nMerci de le changer apres votre premiere connexion.` : `\n(Utilisez le mot de passe de votre compte existant.)`}\n\n== Logiciel de caisse / impression ==\nToken API: ${application.generatedApiToken}\nCe token sert de cle d'activation pour l'agent d'impression.\n\nLien QR (menu client): ${application.qrCodeUrl}`
        : `Bonjour ${application.applicantName}, votre compte livreur SpeedZ a ete valide.\n\nConnexion : ouvrez l'application SpeedZ Livreur et connectez-vous avec votre numero de telephone (${application.phone}).\n\nVotre code livreur : ${courierCode(application.phone)}\nPartagez ce code a vos clients pour qu'ils vous ajoutent en favori : vous serez alors prioritaire sur leurs commandes.`
      : `Bonjour ${application.applicantName}, votre candidature ${application.type} a ete refusee.`;

  // Envoi réel via SMTP (best-effort). sendEmailMessage écrit dans l'outbox.
  try {
    await sendEmailMessage({
      to: application.email,
      subject,
      text,
      metadata: { kind: "application-status", applicationId: application.id, status },
    });
  } catch (error) {
    console.error("[email] Envoi du statut de candidature échoué:", error.message);
  }
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
        passwordHash: application.passwordHash || null,
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

function parseCookies(cookieHeader) {
  return String(cookieHeader || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((accumulator, chunk) => {
      const separatorIndex = chunk.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = chunk.slice(0, separatorIndex).trim();
      const value = chunk.slice(separatorIndex + 1).trim();
      accumulator[key] = decodeURIComponent(value);
      return accumulator;
    }, {});
}

function getAuthTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[AUTH_COOKIE_NAME] || null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  const attributes = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];

  if (secure) {
    attributes.push("Secure");
  }

  res.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  const attributes = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (secure) {
    attributes.push("Secure");
  }

  res.setHeader("Set-Cookie", attributes.join("; "));
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      managedRestaurantId: user.managedRestaurantId || null,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: "Token manquant." });
    return;
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Token invalide." });
  }
}

function optionalAuth(req, _res, next) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
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

// Portail restaurateur (web) : compte User role=RESTAURANT lié à un restaurant via
// managedRestaurantId. Distinct de requireRestaurantApiToken (agent d'impression/caisse).
async function requireRestaurant(req, res, next) {
  if (req.auth?.role !== "RESTAURANT") {
    res.status(403).json({ message: "Acces reserve aux restaurateurs." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
    include: { managedRestaurant: { include: { menuItems: true } } },
  });

  if (!user || !user.isActive || !user.managedRestaurant) {
    res.status(403).json({ message: "Aucun restaurant associe a ce compte." });
    return;
  }

  req.restaurantUser = user;
  req.restaurantAuth = user.managedRestaurant;
  next();
}

function signCourierToken(courier) {
  return jwt.sign(
    {
      sub: courier.id,
      role: "COURIER",
      phone: courier.phone,
      name: courier.name,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

async function requireCourierAuth(req, res, next) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: "Token livreur manquant." });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.role !== "COURIER" || !payload?.sub) {
      res.status(403).json({ message: "Token livreur invalide." });
      return;
    }

    const courier = await prisma.courier.findUnique({
      where: { id: payload.sub },
      include: {
        restaurant: true,
        orders: { include: { restaurant: true, user: { include: { addresses: true } } } },
      },
    });

    if (!courier || courier.phone !== payload.phone) {
      res.status(401).json({ message: "Livreur introuvable ou session expiree." });
      return;
    }

    req.courierAuth = courier;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ message: "Session livreur invalide." });
  }
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
  // Restaurant qui livre avec ses propres livreurs : livraison offerte dans son
  // rayon de gratuité, sauf si aucun de ses livreurs n'est disponible (repli SpeedZ
  // payant, décidé ici pour que le client voie le bon prix avant de commander).
  const { quote: appliedDelivery, useSpeedzFleet } = await applyOwnDeliveryPricing(restaurant, delivery);
  const serviceFee = orderChannel === "QR_ONSITE" ? 0 : calculateServiceFee(subtotal);
  const discountAmount = calculatePromotionDiscount({ promotion, subtotal });
  const total = Number((subtotal + appliedDelivery.fee + serviceFee - discountAmount).toFixed(2));
  // Points : programme global administré par l'admin (plus de taux par restaurant).
  const pointsToEarn = computeLoyaltyPoints(subtotal);

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
    // La course sera-t-elle servie par la flotte SpeedZ ? (repli d'un restaurant
    // en mode OWN dont aucun livreur n'était disponible au moment du devis)
    useSpeedzFleet,
    promotion: appliedPromotion ? serializePromotion({ ...appliedPromotion, orders: [] }) : null
  };
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

/**
 * Crédite les points de fidélité d'une commande livrée.
 * Idempotent : LoyaltyEntry.orderId est unique, une commande ne crédite qu'une fois
 * (utile car le passage en "Delivered" peut venir du livreur comme de l'admin).
 * Aucun point si le programme est désactivé ou si la commande n'en rapportait pas.
 */
async function creditLoyaltyPointsForOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true, loyaltyEntry: true },
  });
  if (!order || order.status !== "Delivered") return;
  if (order.loyaltyEntry) return;
  if (!order.pointsEarned || order.pointsEarned <= 0) return;

  await prisma.loyaltyEntry.create({
    data: {
      userId: order.userId,
      orderId: order.id,
      restaurantName: order.restaurant?.name || "SpeedZ",
      points: order.pointsEarned,
      description: `Points gagnes sur la commande ${order.id}`,
    },
  });
}

async function getFirstAvailableCourier() {
  return prisma.courier.findFirst({
    where: { status: { in: ["AVAILABLE", "ON_DELIVERY"] } },
    orderBy: { createdAt: "asc" }
  });
}

// Notification push envoyée à un livreur (token Expo stocké sur son profil).
async function sendCourierPush(courier, { title, body, data }) {
  if (!courier?.pushToken) return;
  await sendExpoPush({ to: courier.pushToken, title, body, data });
}

// Message de bienvenue envoyé au livreur validé (à sa 1re connexion, quand son
// token push devient disponible, ou immédiatement s'il en a déjà un).
async function sendCourierWelcomePush(courier) {
  await sendCourierPush(courier, {
    title: "Bienvenue chez SpeedZ 🛵",
    body: `${courier.name}, votre compte livreur est validé. Vous pouvez commencer à recevoir des courses !`,
    data: { type: "courier-welcome" },
  });
}

// Un livreur est « dans la zone » du restaurant si sa dernière position connue
// est à moins de DISPATCH_RADIUS_KM. Sans position connue, on le considère éligible
// (il verra la course via le polling) pour ne jamais bloquer une livraison.
function hasUsableCoordinates(lat, lng) {
  // 0/0 = coordonnées non renseignées (restaurant créé sans GPS), pas un vrai point.
  if (lat == null || lng == null) return false;
  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return false;
  return Number(lat) !== 0 || Number(lng) !== 0;
}

/**
 * Cloisonnement des flottes. Détermine si une course peut être proposée à ce livreur.
 *
 * - Restaurant en mode OWN : réservée à SES livreurs. Si le restaurant a autorisé le
 *   repli (allowSpeedzFallback) et que personne ne l'a prise après le délai, elle
 *   s'ouvre à la flotte SpeedZ — le client garde sa livraison gratuite, le coût est
 *   marqué comme refacturable au restaurant (fellBackToSpeedz).
 * - Restaurant en mode SPEEDZ : réservée à la flotte SpeedZ. Les livreurs rattachés
 *   à un restaurant ne livrent que pour le leur.
 */
function canCourierSeeOrder(courier, order, now = Date.now()) {
  // Repli décidé au devis : le client a déjà payé les frais SpeedZ, la course
  // appartient à la flotte SpeedZ dès le départ.
  if (order.fellBackToSpeedz) return !courier.restaurantId;

  const restaurantOwnsDelivery = order.restaurant?.deliveryMode === "OWN";
  const isOwnCourierOfThisRestaurant = courier.restaurantId === order.restaurantId;

  if (restaurantOwnsDelivery) {
    if (isOwnCourierOfThisRestaurant) return true;
    if (!order.restaurant?.allowSpeedzFallback) return false;
    // Sécurité : un livreur propre s'est mis hors ligne après la commande.
    // Passé le délai, la flotte SpeedZ peut reprendre la course.
    const waited = now - order.createdAt.getTime() >= OWN_FALLBACK_DELAY_MS;
    return waited && !courier.restaurantId;
  }

  // Restaurant en mode SPEEDZ : uniquement la flotte SpeedZ.
  return !courier.restaurantId;
}

function isCourierInRestaurantZone(courier, restaurant) {
  // Sans position fiable d'un côté ou de l'autre, on n'applique PAS le filtre de
  // distance : mieux vaut proposer la course que la rendre invisible.
  if (!hasUsableCoordinates(courier.currentLat, courier.currentLng)) return true;
  if (!hasUsableCoordinates(restaurant?.latitude, restaurant?.longitude)) return true;
  const distanceKm = calculateDistanceKm(
    { latitude: courier.currentLat, longitude: courier.currentLng },
    { latitude: restaurant.latitude, longitude: restaurant.longitude }
  );
  return distanceKm <= DISPATCH_RADIUS_KM;
}

// Récupère les livreurs favoris du client (uniquement ceux prêts à recevoir une course).
async function getFavoriteCouriersForUser(userId) {
  if (!userId) return [];
  const favorites = await prisma.courierFavorite.findMany({
    where: { userId },
    include: { courier: true },
  });
  return favorites
    .map((favorite) => favorite.courier)
    .filter((courier) => courier && courier.status !== "OFFLINE");
}

/**
 * Dispatch d'une commande DELIVERY nouvellement créée.
 * - Si le client a des livreurs favoris : notification immédiate à ces favoris,
 *   qui disposent d'une fenêtre d'exclusivité (FAVORITE_WINDOW_MS).
 * - Sans favori : notification immédiate à tous les livreurs de la zone.
 * - À l'expiration de la fenêtre, si la course n'a pas été prise, on notifie
 *   tous les livreurs de la zone.
 * La visibilité réelle des courses est gérée dans GET /api/courier/jobs (source de
 * vérité basée sur createdAt) ; le push ne sert qu'à l'immédiateté.
 */
async function dispatchDeliveryOrder(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  if (!order || order.channel !== "DELIVERY" || order.status !== "AwaitingCourier") return;

  const pushPayload = {
    title: "Nouvelle course 🛵",
    body: `Commande à récupérer chez ${order.restaurant?.name || "un restaurant"}.`,
    data: { type: "courier-new-job", orderId: order.id },
  };

  // Restaurant qui livre lui-même : on notifie SES livreurs, pas la flotte SpeedZ.
  // (sauf repli décidé au devis : la course part directement à la flotte SpeedZ)
  if (order.restaurant?.deliveryMode === "OWN" && !order.fellBackToSpeedz) {
    const ownCouriers = await prisma.courier.findMany({
      where: { restaurantId: order.restaurantId, status: { in: ["AVAILABLE", "ON_DELIVERY"] } },
    });
    await Promise.all(ownCouriers.map((courier) => sendCourierPush(courier, pushPayload)));

    // Repli autorisé : si personne n'a pris la course, alerter la flotte SpeedZ.
    if (order.restaurant.allowSpeedzFallback) {
      setTimeout(() => {
        notifyZoneCouriers(orderId, pushPayload).catch((error) =>
          console.error("[dispatch] repli SpeedZ:", error?.message || error)
        );
      }, OWN_FALLBACK_DELAY_MS).unref?.();
    }
    return;
  }

  const favoriteCouriers = await getFavoriteCouriersForUser(order.userId);
  const preferredCouriers = await getPreferredCouriersForRestaurant(order.restaurantId);

  // Cascade : favoris du client → préférés du restaurant → toute la zone.
  const escalateToZone = () => {
    setTimeout(() => {
      notifyZoneCouriers(orderId, pushPayload).catch((error) =>
        console.error("[dispatch] escalade zone:", error?.message || error)
      );
    }, RESTAURANT_PREFERRED_WINDOW_MS).unref?.();
  };

  if (favoriteCouriers.length > 0) {
    await Promise.all(favoriteCouriers.map((courier) => sendCourierPush(courier, pushPayload)));
    setTimeout(() => {
      notifyPreferredThenZone(orderId, pushPayload).catch((error) =>
        console.error("[dispatch] escalade preferes:", error?.message || error)
      );
    }, FAVORITE_WINDOW_MS).unref?.();
    return;
  }

  if (preferredCouriers.length > 0) {
    await Promise.all(preferredCouriers.map((courier) => sendCourierPush(courier, pushPayload)));
    escalateToZone();
    return;
  }

  await notifyZoneCouriers(orderId, pushPayload);
}

// Livreurs préférés d'un restaurant, prêts à recevoir une course.
async function getPreferredCouriersForRestaurant(restaurantId) {
  if (!restaurantId) return [];
  const links = await prisma.restaurantPreferredCourier.findMany({
    where: { restaurantId },
    include: { courier: true },
  });
  return links.map((link) => link.courier).filter((c) => c && c.status !== "OFFLINE");
}

// Étape intermédiaire de la cascade : notifier les préférés du restaurant, puis
// ouvrir à toute la zone si la course reste sans preneur.
async function notifyPreferredThenZone(orderId, pushPayload) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "AwaitingCourier" || order.courierId) return;

  const preferred = await getPreferredCouriersForRestaurant(order.restaurantId);
  if (preferred.length === 0) {
    await notifyZoneCouriers(orderId, pushPayload);
    return;
  }
  await Promise.all(preferred.map((courier) => sendCourierPush(courier, pushPayload)));
  setTimeout(() => {
    notifyZoneCouriers(orderId, pushPayload).catch((error) =>
      console.error("[dispatch] escalade zone:", error?.message || error)
    );
  }, RESTAURANT_PREFERRED_WINDOW_MS).unref?.();
}

// Notifie tous les livreurs disponibles de la zone du restaurant, si la course
// est toujours en attente d'un livreur.
async function notifyZoneCouriers(orderId, pushPayload) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { restaurant: true },
  });
  if (!order || order.status !== "AwaitingCourier" || order.courierId) return;

  // Flotte SpeedZ uniquement : les livreurs rattachés à un restaurant ne livrent
  // que pour le leur.
  const couriers = await prisma.courier.findMany({
    where: { status: { in: ["AVAILABLE", "ON_DELIVERY"] }, restaurantId: null },
  });
  const zoneCouriers = couriers.filter((courier) => isCourierInRestaurantZone(courier, order.restaurant));
  await Promise.all(zoneCouriers.map((courier) => sendCourierPush(courier, pushPayload)));
}

async function fetchBootstrapPayload(userId) {
  const [user, restaurants, loyaltyEntries, orders, promotions, menuCategories] = await Promise.all([
    prisma.user.findUnique({
      where: userId ? { id: userId } : { email: DEMO_USER_EMAIL },
      include: { favorites: true, addresses: true, courierFavorites: { include: { courier: true } } }
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
    favoriteCouriers: (user?.courierFavorites || []).map((favorite) => serializeCourierPublic(favorite.courier)),
    favoriteCourierIds: (user?.courierFavorites || []).map((favorite) => favorite.courierId),
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

  const generatedEmail = `guest_${normalizedPhone.replace(/\D/g, "") || Date.now()}@speedz.local`;
  const existing = await prisma.user.findUnique({ where: { email: generatedEmail } });
  if (existing) {
    return existing;
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const passwordHash = await bcrypt.hash(generateOpaqueToken("guest"), 12);
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
  tableId = null,
  userId,
}) {
  const [restaurant, customer, summary] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    computeSummary({ restaurantId, cart, userCoordinates, promoCode, orderChannel, userId }),
  ]);

  if (!restaurant || !customer || !summary) {
    return null;
  }

  // Restaurant hors service (agent d'impression déconnecté) : on refuse la commande.
  // Désactivable via REQUIRE_PRINTER_ONLINE=false si des restaurants n'ont pas
  // encore installé l'agent SpeedZPrinter.
  if (REQUIRE_PRINTER_ONLINE && !isPrinterOnline(restaurant.printerLastSeenAt)) {
    return { error: "RESTAURANT_OFFLINE" };
  }

  // Les commandes en livraison démarrent en AwaitingCourier (aucun livreur, non
  // imprimées) : elles sont proposées aux livreurs (favoris d'abord, cf.
  // dispatchDeliveryOrder) et ne s'impriment qu'une fois confirmées par le livreur.
  // Les commandes sur place (QR_ONSITE) sont confirmées et imprimées immédiatement.
  const initialStatus = orderChannel === "DELIVERY" ? "AwaitingCourier" : "Confirmed";

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
      tableId,
      status: initialStatus,
      // Restaurant en mode OWN sans livreur dispo au devis : la course part
      // directement à la flotte SpeedZ (et le client a payé les frais en conséquence).
      fellBackToSpeedz: restaurant.deliveryMode === "OWN" && summary.useSpeedzFleet === true,
      estimatedDeliveryLabel: summary.estimatedDeliveryLabel,
      items: cart,
      courierId: null,
      promotionId: summary.promotion?.id || null
    },
    include: { restaurant: true, courier: true, user: true }
  });

  // Les points ne sont PAS crédités ici : ils le sont au passage en "Delivered"
  // (voir creditLoyaltyPointsForOrder), pour qu'une commande annulée ne rapporte rien.

  await emitOrderRealtime(order.id, "order/created");

  if (order.channel === "DELIVERY") {
    // Best-effort : ne jamais bloquer la réponse commande sur le dispatch/push.
    dispatchDeliveryOrder(order.id).catch((error) =>
      console.error("[dispatch] échec:", error?.message || error)
    );
  }

  return order;
}

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "speedz-backend", database: "connected" });
  } catch {
    res.status(500).json({ ok: false, service: "speedz-backend", database: "disconnected" });
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

app.post("/api/auth/request-code", requestCodeLimiter, validateBody(Schemas.requestCode), async (req, res) => {
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
        identifier: phone,
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
      demoCode: process.env.NODE_ENV !== "production" && delivery.provider === "demo" ? code : undefined,
    });
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : "Envoi WhatsApp impossible.",
    });
  }
});

app.post("/api/auth/request-email-code", requestCodeLimiter, validateBody(Schemas.requestEmailCode), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const fullName = String(req.body?.fullName || "").trim();

  if (!email) {
    res.status(400).json({ message: "Email requis." });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  try {
    const delivery = await sendEmailVerificationCode({ email, code, fullName });
    const challenge = await prisma.authChallenge.create({
      data: {
        userId: existingUser?.id || null,
        identifier: email,
        method: "EMAIL",
        code,
        providerMessageId: delivery.messageId,
        deliveryStatus: delivery.status,
        sentAt: delivery.status === "SENT" ? new Date() : null,
        expiresAt,
      },
    });

    res.status(201).json({
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt.toISOString(),
      provider: delivery.provider,
      userExists: Boolean(existingUser),
      demoCode: process.env.NODE_ENV !== "production" && delivery.provider === "outbox" ? code : undefined,
    });
  } catch (error) {
    const classified = classifyEmailError(error);
    if (classified.kind === "transport") {
      console.error("[request-email-code] échec envoi email:", error);
    }
    res.status(classified.status).json({ message: classified.message });
  }
});

app.post("/api/auth/verify-code", verifyCodeLimiter, validateBody(Schemas.verifyCode), async (req, res) => {
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
    phone: updatedChallenge.identifier,
    identifier: updatedChallenge.identifier,
  });
});

app.post("/api/auth/verify-email-code", verifyCodeLimiter, validateBody(Schemas.verifyEmailCode), async (req, res) => {
  const challengeId = String(req.body?.challengeId || "").trim();
  const code = String(req.body?.code || "").trim();
  const email = normalizeEmail(req.body?.email);
  const fullName = String(req.body?.fullName || "").trim();
  const phone = normalizePhoneNumber(req.body?.phone);

  if (!challengeId || !code || !email || !fullName || !phone) {
    res.status(400).json({ message: "Informations de verification incompletes." });
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

  if (challenge.identifier !== email) {
    res.status(400).json({ message: "Cet email ne correspond pas a la verification en cours." });
    return;
  }

  if (challenge.code !== code) {
    res.status(401).json({ message: "Code de verification incorrect." });
    return;
  }

  const phoneOwner = await prisma.user.findUnique({ where: { phone } }).catch(() => null);
  if (phoneOwner && phoneOwner.id !== challenge.userId) {
    res.status(400).json({ message: "Ce numero est deja utilise par un autre compte." });
    return;
  }

  const { firstName, lastName } = splitFullName(fullName);
  if (!firstName || !lastName) {
    res.status(400).json({ message: "Nom et prenom requis." });
    return;
  }

  const user = await prisma.$transaction(async (tx) => {
    const passwordHash = challenge.user?.passwordHash || (await bcrypt.hash(generateOpaqueToken("cust"), 12));
    const upsertedUser = challenge.userId
      ? await tx.user.update({
          where: { id: challenge.userId },
          data: {
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            email,
            phone,
            authProvider: "SMS",
            phoneVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
        })
      : await tx.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            name: `${firstName} ${lastName}`.trim(),
            phone,
            defaultAddress: "",
            authProvider: "SMS",
            phoneVerifiedAt: new Date(),
            role: "CUSTOMER",
          },
        });

    await tx.authChallenge.update({
      where: { id: challenge.id },
      data: {
        userId: upsertedUser.id,
        verifiedAt: new Date(),
        consumedAt: new Date(),
      },
    });

    return tx.user.findUnique({
      where: { id: upsertedUser.id },
      include: { addresses: true, favorites: true },
    });
  });

  res.json({
    token: signToken(user),
    user: serializeUserProfile(user),
    savedAddresses: (user.addresses || []).map(serializeUserAddress),
    notificationPreferences: serializeNotificationPreferences(user),
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
    phone: challenge.identifier,
    identifier: challenge.identifier,
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

app.post("/api/auth/register-profile", validateBody(Schemas.registerProfile), async (req, res) => {
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

  const phone = challenge.identifier;
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

app.patch("/api/auth/me", requireAuth, validateBody(Schemas.updateAdminProfile), wrapAsync(async (req, res) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.auth.sub },
  });

  if (!currentUser) {
    throw new ApiError(404, "Utilisateur introuvable.", "USER_NOT_FOUND");
  }

  const nextEmail = normalizeEmail(req.body?.email);
  if (nextEmail !== currentUser.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (existingUser && existingUser.id !== currentUser.id) {
      throw new ApiError(409, "Un compte existe deja avec cet email.", "EMAIL_ALREADY_EXISTS");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      firstName: req.body?.firstName,
      lastName: req.body?.lastName,
      name: req.body?.name,
      email: nextEmail,
      phone: req.body?.phone ? String(req.body.phone).trim() : null,
    },
    include: { addresses: true, favorites: true },
  });

  res.json({
    user: serializeUserProfile(updatedUser),
    savedAddresses: (updatedUser.addresses || []).map(serializeUserAddress),
    notificationPreferences: serializeNotificationPreferences(updatedUser),
  });
}));

app.patch("/api/auth/change-password", requireAuth, validateBody(Schemas.updateAdminPassword), wrapAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth.sub },
  });

  if (!user) {
    throw new ApiError(404, "Utilisateur introuvable.", "USER_NOT_FOUND");
  }

  if (!user.passwordHash || typeof user.passwordHash !== "string") {
    throw new ApiError(400, "Ce compte ne peut pas changer son mot de passe.", "PASSWORD_CHANGE_UNAVAILABLE");
  }

  const isValid = await bcrypt.compare(req.body.currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "Mot de passe actuel invalide.", "INVALID_CURRENT_PASSWORD");
  }

  const nextHash = await bcrypt.hash(req.body.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: nextHash },
  });

  res.json({ ok: true });
}));

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

app.post("/api/notifications/register-token", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ message: "Authentification requise." });
    return;
  }

  const token = String(req.body?.token || "").trim();
  if (!/^ExponentPushToken\[.+\]$/.test(token)) {
    res.status(422).json({ message: "Jeton de notification invalide." });
    return;
  }

  savePushToken(user.id, token);
  res.json({ ok: true });
});

app.post("/api/auth/login", loginLimiter, validateBody(Schemas.login), wrapAsync(async (req, res) => {
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

  if (!user.isActive) {
    res.status(403).json({ message: "Ce compte est desactive." });
    return;
  }

  if (!user.passwordHash || typeof user.passwordHash !== "string") {
    res.status(401).json({ message: "Ce compte ne peut pas se connecter avec un mot de passe." });
    return;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ message: "Identifiants invalides." });
    return;
  }

  const token = signToken(user);
  setSessionCookie(res, token);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      managedRestaurantId: user.managedRestaurantId || null
    }
  });
}));

app.post("/api/auth/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

app.get("/api/bootstrap", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  res.json(await fetchBootstrapPayload(user?.id));
});

app.post("/api/admin/upload-image", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  await new Promise((resolve, reject) => {
    upload.single("image")(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  if (!req.file) {
    throw new ApiError(400, "Aucun fichier image envoye.", "UPLOAD_MISSING_FILE");
  }

  // Normalise les variantes JPEG (pjpeg pour .jfif) avant comparaison.
  const normalizeMime = (value) => (value === "image/pjpeg" ? "image/jpeg" : value);
  const detectedMimeType = detectImageTypeFromFile(req.file.path);
  if (!detectedMimeType || normalizeMime(detectedMimeType) !== normalizeMime(req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, "Le fichier envoye n'est pas une image valide.", "UPLOAD_INVALID_IMAGE");
  }

  const publicBaseUrl = getRequestPublicBaseUrl(req);
  ok(res, {
    url: `${publicBaseUrl.replace(/\/$/, "")}/uploads/${req.file.filename}`,
    filename: req.file.filename
  }, 201);
}));

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

// Vue publique d'un livreur pour le client : jamais le téléphone complet, seulement
// le code à 6 chiffres partagé verbalement.
function serializeCourierPublic(record) {
  return {
    id: record.id,
    name: record.name,
    code: courierCode(record.phone),
    vehicle: record.vehicle,
    zoneLabel: record.zoneLabel,
    status: record.status,
  };
}

// Recherche d'un livreur par son code (6 derniers chiffres du téléphone).
// Renvoie une liste car plusieurs livreurs peuvent partager les mêmes 6 chiffres.
app.get("/api/couriers/search", optionalAuth, async (req, res) => {
  const code = String(req.query.code || "").replace(/\D/g, "");
  if (code.length < 4) {
    res.status(400).json({ message: "Code livreur invalide (au moins 4 chiffres)." });
    return;
  }
  const couriers = await prisma.courier.findMany({ orderBy: { createdAt: "asc" } });
  const matches = couriers.filter((courier) => courierCode(courier.phone) === code);
  res.json({ couriers: matches.map(serializeCourierPublic) });
});

// Liste des livreurs favoris du client.
app.get("/api/couriers/favorites", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(404).json({ message: "Utilisateur introuvable." });
    return;
  }
  const favorites = await prisma.courierFavorite.findMany({
    where: { userId: user.id },
    include: { courier: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    couriers: favorites.map((favorite) => serializeCourierPublic(favorite.courier)),
    favoriteCourierIds: favorites.map((favorite) => favorite.courierId),
  });
});

// Ajoute / retire un livreur des favoris du client.
app.post("/api/couriers/:id/favorite/toggle", optionalAuth, async (req, res) => {
  const courierId = req.params.id;
  const [user, courier] = await Promise.all([
    getAuthenticatedUser(req),
    prisma.courier.findUnique({ where: { id: courierId } }),
  ]);

  if (!user || !courier) {
    res.status(404).json({ message: "Livreur ou utilisateur introuvable." });
    return;
  }

  const existing = await prisma.courierFavorite.findUnique({
    where: { userId_courierId: { userId: user.id, courierId } },
  });

  if (existing) {
    await prisma.courierFavorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.courierFavorite.create({ data: { userId: user.id, courierId } });
  }

  const favorites = await prisma.courierFavorite.findMany({ where: { userId: user.id } });
  res.json({
    favoriteCourierIds: favorites.map((favorite) => favorite.courierId),
    changedCourier: serializeCourierPublic(courier),
    isFavorite: !existing,
  });
});

app.post("/api/cart/quote", optionalAuth, validateBody(Schemas.cartQuote), async (req, res) => {
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

app.post("/api/orders", optionalAuth, validateBody(Schemas.createOrder), async (req, res) => {
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

  if (order.error === "RESTAURANT_OFFLINE") {
    res.status(409).json({
      message: "Ce restaurant est actuellement hors service. Réessayez plus tard.",
      code: "RESTAURANT_OFFLINE",
    });
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

// Commandes du client authentifié (léger : sert au rafraîchissement automatique du
// suivi côté app, en complément du temps réel WebSocket).
app.get("/api/my-orders", optionalAuth, async (req, res) => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.json({ orders: [] });
    return;
  }
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { restaurant: true, courier: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders: orders.map(serializeOrder) });
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

  // Rattache la commande à une table du plan de salle si le libellé correspond.
  const matchedTable = tableLabel
    ? await prisma.restaurantTable.findFirst({
        where: { restaurantId: restaurant.id, label: String(tableLabel).trim() },
      })
    : null;

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
    tableId: matchedTable?.id || null,
    userId: customer.id,
  });

  if (order?.error === "RESTAURANT_OFFLINE") {
    res.status(409).json({
      message: "Ce restaurant est actuellement hors service. Réessayez plus tard.",
      code: "RESTAURANT_OFFLINE",
    });
    return;
  }

  if (!order) {
    res.status(400).json({ message: "Impossible de creer la commande QR." });
    return;
  }

  if (matchedTable) {
    await prisma.restaurantTable.update({
      where: { id: matchedTable.id },
      data: { status: "ORDER_IN_PROGRESS" },
    });
    broadcastRealtime("restaurant/table-updated", { restaurantId: restaurant.id, tableId: matchedTable.id });
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

  // Cette page utilise un <script> inline pour charger et rendre le menu. La CSP
  // globale de helmet interdit les scripts inline (scriptSrc 'self') — sans cette
  // surcharge, le navigateur bloque le script en production et le menu reste vide.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self'"
  );

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
      const presetTable = new URLSearchParams(location.search).get("table") || "";
      const app = document.getElementById("app");
      const state = { restaurant: null, cart: [], error: null };
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
        if (state.error) {
          app.innerHTML = "<div class='card'><h3>" + state.error + "</h3><button onclick='loadMenu()'>Reessayer</button></div>";
          return;
        }
        if (!state.restaurant) {
          app.innerHTML = "<div class='card'>Chargement du menu...</div>";
          return;
        }
        const available = (state.restaurant.menu || []).filter((item) => item.isAvailable !== false);
        if (available.length === 0) {
          app.innerHTML = "<div class='card'><h3>Menu en cours de preparation</h3><p class='muted'>Ce restaurant n'a pas encore publie de plats. Merci de revenir bientot.</p></div>";
          return;
        }
        const menuCards = available.map((item) => "<div class='card'><h3>" + item.name + "</h3><p class='muted'>" + (item.description || "") + "</p><strong>" + money(item.price) + "</strong><button onclick='addToCartById(" + JSON.stringify(item.id) + ")'>Ajouter</button></div>").join("");
        const cartTotal = state.cart.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
        app.innerHTML = menuCards + "<div class='card'><h3>Votre commande</h3><p>" + (state.cart.map((item) => item.name + " x" + item.quantity).join("<br/>") || "Panier vide") + "</p><strong>Total: " + money(cartTotal) + "</strong><form id='qr-form'><input class='field' name='customerName' placeholder='Nom' required /><input class='field' name='customerPhone' placeholder='Telephone' required /><input class='field' name='tableLabel' placeholder='Numero de table' value=\"" + presetTable.replace(/[\"'<>]/g, "") + "\" /><textarea class='field' name='notes' placeholder='Note cuisine'></textarea><button type='submit'>Commander sur place</button><div id='result' class='ok'></div></form></div>";
        document.getElementById("qr-form").addEventListener("submit", submitOrder);
      }
      window.addToCartById = function(menuItemId) {
        const item = state.restaurant.menu.find((entry) => entry.id === menuItemId);
        if (item) addToCart(item);
      };
      window.loadMenu = function() {
        state.error = null;
        render();
        fetch("/api/public/qr/" + qrToken).then(function(response) {
          if (response.status === 429) { throw new Error("busy"); }
          if (!response.ok) { throw new Error("notfound"); }
          return response.json();
        }).then(function(payload) {
          state.restaurant = payload.restaurant;
          render();
        }).catch(function(err) {
          if (err.message === "busy") {
            // Trop de requetes : nouvelle tentative automatique dans 3 s.
            state.error = "Service occupe, nouvelle tentative...";
            render();
            setTimeout(window.loadMenu, 3000);
          } else {
            state.error = "Menu indisponible pour ce QR code.";
            render();
          }
        });
      };
      loadMenu();
    </script>
  </body>
</html>`);
});

// Connexion livreur : téléphone + mot de passe.
// Compat comptes créés par l'admin sans mot de passe : le premier login
// enregistre le mot de passe saisi et verrouille le compte.
// (Prévu : remplacement par un OTP WhatsApp/SMS quand l'API sera intégrée.)
app.post("/api/courier/auth", validateBody(Schemas.courierAuth), async (req, res) => {
  const phone = normalizePhoneNumber(req.body?.phone);
  const password = String(req.body?.password || "");
  const digits = phone.replace(/\D/g, "");
  // Recherche robuste : on compare les numéros normalisés (les livreurs peuvent être
  // enregistrés avec des espaces ou un format différent de la saisie de connexion).
  let courier = await prisma.courier.findFirst({
    where: { phone },
    include: { orders: true },
  });
  if (!courier) {
    const all = await prisma.courier.findMany({ include: { orders: true } });
    courier =
      all.find((entry) => normalizePhoneNumber(entry.phone) === phone) ||
      all.find((entry) => entry.phone.replace(/\D/g, "") === digits) ||
      null;
  }

  if (!courier) {
    res.status(404).json({ message: "Livreur introuvable. Verifiez le numero ou attendez la validation de votre compte." });
    return;
  }

  if (courier.passwordHash) {
    const isValid = await bcrypt.compare(password, courier.passwordHash);
    if (!isValid) {
      res.status(401).json({ message: "Mot de passe incorrect." });
      return;
    }
  } else {
    // Premier login d'un compte sans mot de passe : on enregistre celui saisi.
    await prisma.courier.update({
      where: { id: courier.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
  }

  res.json({
    token: signCourierToken(courier),
    courier: serializeCourier(courier),
  });
});

app.get("/api/courier/jobs", requireCourierAuth, async (req, res) => {
  const courier = req.courierAuth;
  const courierId = courier.id;

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

  const awaitingOrders = await prisma.order.findMany({
    where: {
      channel: "DELIVERY",
      courierId: null,
      status: "AwaitingCourier"
    },
    include: { restaurant: true, user: { include: { addresses: true } } },
    orderBy: { createdAt: "asc" }
  });

  // Dispatch favoris-d'abord : pendant FAVORITE_WINDOW_MS après la création, une
  // course dont le client a des livreurs favoris n'est visible que par ces favoris.
  // Passé ce délai (ou sans favori), elle s'ouvre à tous les livreurs de la zone.
  const orderUserIds = [...new Set(awaitingOrders.map((order) => order.userId))];
  const favoriteLinks = orderUserIds.length
    ? await prisma.courierFavorite.findMany({
        where: { userId: { in: orderUserIds } },
        select: { userId: true, courierId: true },
      })
    : [];
  const usersWithFavorites = new Set(favoriteLinks.map((link) => link.userId));
  const usersWhoFavoritedThisCourier = new Set(
    favoriteLinks.filter((link) => link.courierId === courierId).map((link) => link.userId)
  );

  // Livreurs préférés du restaurant : priorité sur les autres pendant
  // RESTAURANT_PREFERRED_WINDOW_MS.
  const orderRestaurantIds = [...new Set(awaitingOrders.map((order) => order.restaurantId))];
  const preferredLinks = orderRestaurantIds.length
    ? await prisma.restaurantPreferredCourier.findMany({
        where: { restaurantId: { in: orderRestaurantIds } },
        select: { restaurantId: true, courierId: true },
      })
    : [];
  const restaurantsWithPreferred = new Set(preferredLinks.map((link) => link.restaurantId));
  const restaurantsPreferringThisCourier = new Set(
    preferredLinks.filter((link) => link.courierId === courierId).map((link) => link.restaurantId)
  );

  const now = Date.now();

  const availableOrders = awaitingOrders.filter((order) => {
    const withinFavoriteWindow = now - order.createdAt.getTime() < FAVORITE_WINDOW_MS;
    const clientHasFavorites = usersWithFavorites.has(order.userId);
    const isFavoriteOfClient = usersWhoFavoritedThisCourier.has(order.userId);

    // Cloisonnement livreurs propres / flotte SpeedZ : décidé en premier, il prime
    // sur tout le reste (sinon un livreur SpeedZ prendrait une course gratuite).
    if (!canCourierSeeOrder(courier, order, now)) return false;

    // Cascade de priorité :
    //   1) 0–1 min  : livreurs favoris du client (s'il en a)
    //   2) 1–5 min  : livreurs préférés du restaurant (s'il en a)
    //   3) ensuite  : tous les livreurs éligibles de la zone
    if (clientHasFavorites && withinFavoriteWindow) {
      return isFavoriteOfClient;
    }

    const age = now - order.createdAt.getTime();
    const restaurantHasPreferred = restaurantsWithPreferred.has(order.restaurantId);
    const isPreferredOfRestaurant = restaurantsPreferringThisCourier.has(order.restaurantId);
    if (restaurantHasPreferred && age < RESTAURANT_PREFERRED_WINDOW_MS) {
      // Réservée aux livreurs préférés du restaurant (et aux favoris du client).
      return isPreferredOfRestaurant || isFavoriteOfClient;
    }

    // Filet de sécurité : au-delà de DISPATCH_OPEN_TO_ALL_MS sans preneur, la
    // course est visible par tous les livreurs éligibles, même hors zone.
    const openToEveryone = age >= DISPATCH_OPEN_TO_ALL_MS;
    if (openToEveryone) return true;

    // Sinon : ouverte aux livreurs de la zone (les favoris restent prioritaires
    // dans l'affichage car ils l'ont vue en premier).
    return isFavoriteOfClient || isCourierInRestaurantZone(courier, order.restaurant);
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
  const deliveredOrders = courier.orders.filter((order) => order.status === "Delivered");
  const history = deliveredOrders
    .map((order) => formatCourierJob(order, true))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // KPI livreur : gains et livraisons du jour (basés sur la date de mise à jour,
  // renseignée au passage en "Delivered").
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const deliveredToday = deliveredOrders.filter((order) => order.updatedAt >= startOfDay);
  const round2 = (n) => Number(n.toFixed(2));
  const stats = {
    status: courier.status,
    todayEarnings: round2(
      deliveredToday.reduce((sum, order) => sum + calculateCourierCompensation(order, courier).total, 0)
    ),
    todayDeliveries: deliveredToday.length,
    totalDeliveries: deliveredOrders.length,
    totalEarnings: round2(
      deliveredOrders.reduce((sum, order) => sum + calculateCourierCompensation(order, courier).total, 0)
    ),
  };

  // Un livreur hors ligne ne reçoit pas de nouvelles courses (mais garde ses courses actives).
  const offeredJobs =
    courier.status === "OFFLINE"
      ? []
      : availableOrders
          .map((order) => formatCourierJob(order, false))
          .sort((a, b) => (a.pickupDistanceKm ?? 999) - (b.pickupDistanceKm ?? 999));

  res.json({
    courier: serializeCourier(courier),
    stats,
    availableJobs: offeredJobs,
    activeJobs,
    history,
  });
});

// Bascule de disponibilité du livreur : en ligne (AVAILABLE = "en travail") / hors ligne.
// Ne modifie pas un livreur actuellement en course (ON_DELIVERY).
app.post("/api/courier/availability", requireCourierAuth, async (req, res) => {
  const online = Boolean(req.body?.online);
  const current = req.courierAuth.status;
  if (current === "ON_DELIVERY") {
    res.status(409).json({ message: "Vous avez une course en cours." });
    return;
  }
  const courier = await prisma.courier.update({
    where: { id: req.courierAuth.id },
    data: { status: online ? "AVAILABLE" : "OFFLINE" },
    include: { orders: true },
  });
  await emitCourierRealtime(courier.id, "courier/availability-updated");
  res.json({ courier: serializeCourier(courier) });
});

app.post("/api/courier/jobs/:id/accept", requireCourierAuth, async (req, res) => {
  const courierId = req.courierAuth.id;

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

  // Garde-fou de cloisonnement : empêche un livreur SpeedZ de prendre une course
  // « livraison offerte » d'un restaurant, et inversement.
  if (!canCourierSeeOrder(courier, order)) {
    res.status(403).json({ message: "Cette course n'est pas ouverte a votre flotte." });
    return;
  }

  // Repli : un livreur SpeedZ prend une course d'un restaurant en mode OWN.
  // Le client garde sa livraison gratuite ; le coût est refacturable au restaurant.
  const isFallback = order.restaurant?.deliveryMode === "OWN" && !courier.restaurantId;

  // « Prendre » la course : elle passe en Accepted (assignée au livreur, toujours
  // pas imprimée). L'impression au restaurant n'est déclenchée qu'à la confirmation.
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      courierId,
      status: order.status === "AwaitingCourier" ? "Accepted" : order.status,
      ...(isFallback ? { fellBackToSpeedz: true } : {}),
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

// « Confirmer » la course prise : passe la commande en Confirmed, ce qui déclenche
// l'impression du ticket au restaurant. Renvoie le téléphone client pour l'appel.
app.post("/api/courier/jobs/:id/confirm", requireCourierAuth, async (req, res) => {
  const courierId = req.courierAuth.id;

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

  if (order.courierId !== courierId) {
    res.status(403).json({ message: "Cette course n'est pas la votre." });
    return;
  }

  if (order.status !== "Accepted") {
    res.status(409).json({ message: "Cette course ne peut plus etre confirmee." });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: "Confirmed" },
    include: { restaurant: true, user: { include: { addresses: true } }, courier: true }
  });

  await emitOrderRealtime(updatedOrder.id, "order/confirmed");
  await emitCourierRealtime(courierId, "courier/job-confirmed");

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

// Progression du statut d'une course par le livreur assigné : OnTheWay puis Delivered.
// À la livraison, le livreur repasse AVAILABLE.
const COURIER_STATUS_TRANSITIONS = {
  Confirmed: ["OnTheWay"],
  OnTheWay: ["Delivered"],
};

app.post("/api/courier/jobs/:id/status", requireCourierAuth, async (req, res) => {
  const courierId = req.courierAuth.id;
  const nextStatus = String(req.body?.status || "").trim();

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { restaurant: true, user: { include: { addresses: true } }, courier: true },
  });

  if (!order || order.channel !== "DELIVERY") {
    res.status(404).json({ message: "Course introuvable." });
    return;
  }
  if (order.courierId !== courierId) {
    res.status(403).json({ message: "Cette course n'est pas la votre." });
    return;
  }
  const allowed = COURIER_STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    res.status(409).json({ message: "Transition de statut non autorisee." });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: nextStatus },
    include: { restaurant: true, user: { include: { addresses: true } }, courier: true },
  });

  if (nextStatus === "Delivered") {
    await prisma.courier.update({ where: { id: courierId }, data: { status: "AVAILABLE" } });
    await creditLoyaltyPointsForOrder(updatedOrder.id);
  }

  await emitOrderRealtime(updatedOrder.id, "order/status-updated");
  await emitCourierRealtime(courierId, "courier/status-updated");
  await notifyOrderStatus(updatedOrder);

  res.json({
    job: {
      ...serializeOrder(updatedOrder),
      customerName: updatedOrder.user.name,
      customerPhone: updatedOrder.user.phone,
      destinationAddress: updatedOrder.address,
      compensation: calculateCourierCompensation(updatedOrder, req.courierAuth),
    },
  });
});

// Enregistre le token Expo Push du livreur (pour la notification des nouvelles courses).
app.post("/api/courier/push-token", requireCourierAuth, async (req, res) => {
  const token = String(req.body?.token || "").trim();
  if (!/^ExponentPushToken\[.+\]$/.test(token)) {
    res.status(400).json({ message: "Token de notification invalide." });
    return;
  }
  // Première fois que ce livreur enregistre un token (aucun auparavant) : c'est
  // le moment fiable pour lui envoyer le message de bienvenue après validation.
  const isFirstToken = !req.courierAuth.pushToken;
  const courier = await prisma.courier.update({
    where: { id: req.courierAuth.id },
    data: { pushToken: token },
  });
  if (isFirstToken) {
    sendCourierWelcomePush(courier).catch((error) =>
      console.error("[push] bienvenue livreur:", error?.message || error)
    );
  }
  res.json({ ok: true });
});

app.post("/api/courier/location", requireCourierAuth, async (req, res) => {
  const courierId = String(req.courierAuth.id || "").trim();
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400).json({ message: "latitude et longitude requises." });
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

// QR code de commande du magasin (à imprimer/afficher pour les clients).
app.get("/api/restaurant/printer/qr", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const qrCodeToken = restaurant.qrCodeToken || generateOpaqueToken("qr");
  if (!restaurant.qrCodeToken) {
    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { qrCodeToken },
    });
  }
  res.json({
    restaurantName: restaurant.name,
    qrToken: qrCodeToken,
    url: getRestaurantQrLandingUrl(qrCodeToken),
  });
});

// Version publiée de l'agent d'impression (pour l'auto-update de l'agent).
// L'agent compare sa version locale et notifie si une mise à jour existe.
app.get("/api/printer-agent/version", (_req, res) => {
  res.json({
    version: process.env.PRINTER_AGENT_VERSION || "2.0.0",
    url: process.env.PRINTER_AGENT_URL || "https://speedz.microtechdz13.com/downloads/SpeedZPrinter.exe",
    notes: process.env.PRINTER_AGENT_NOTES || "",
  });
});

// Tables du restaurant + lien QR de chaque table (pour impression par l'agent).
app.get("/api/restaurant/printer/tables", requireRestaurantApiToken, async (req, res) => {
  let restaurant = req.restaurantAuth;
  if (!restaurant.qrCodeToken) {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { qrCodeToken: generateOpaqueToken("qr") },
    });
  }
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  res.json({
    restaurantName: restaurant.name,
    tables: tables.map((t) => ({
      id: t.id,
      label: t.label,
      zone: t.zone || null,
      url: getRestaurantTableQrUrl(restaurant, t),
    })),
  });
});

// Facturation vue par le restaurant (via son token) : commandes, ce qu'il doit
// à la plateforme, ses versements, son solde, et le lien de menu à partager.
app.get("/api/restaurant/billing", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const orders = await prisma.order.findMany({
    where: { restaurantId: restaurant.id },
    select: { id: true, restaurantId: true, subtotal: true, total: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const statement = buildRestaurantBillingStatement(restaurant, orders, readSettlements());
  const qrCodeToken = restaurant.qrCodeToken || null;
  res.json({
    ...statement,
    restaurantName: restaurant.name,
    menuShareUrl: qrCodeToken ? getRestaurantQrLandingUrl(qrCodeToken) : null,
    recentOrders: orders.slice(0, 20).map((order) => ({
      id: order.id,
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
  });
});

// ════════════════════════════════════════════════════════════════════════════
// INTÉGRATION LOGICIEL DE CAISSE (POS) — API appelée par le logiciel du resto.
// Auth : en-tête `x-api-token: <token du restaurant>`. Voir printer-agent/POS_API.md
// ════════════════════════════════════════════════════════════════════════════

// 1) Récupérer les commandes en ligne SpeedZ pour les injecter dans la caisse.
//    Polling : passer ?since=<ISO> (dernière commande vue) pour n'avoir que les
//    nouvelles. Optionnel : ?status=Confirmed&limit=200.
app.get("/api/restaurant/orders", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const since = req.query.since ? new Date(String(req.query.since)) : null;
  const statusFilter = req.query.status ? String(req.query.status) : null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const where = { restaurantId: restaurant.id };
  if (since && !Number.isNaN(since.getTime())) {
    where.createdAt = { gt: since };
  }
  if (statusFilter) {
    where.status = statusFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    include: { restaurant: true, courier: true, user: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  res.json(
    orders.map((order) => ({
      ...serializeOrder(order),
      customerName: order.user?.name || null,
      customerPhone: order.user?.phone || null,
    }))
  );
});

// 2) Lire le menu SpeedZ (sens SpeedZ → caisse). Inclut l'externalId connu pour
//    que la caisse fasse correspondre ses produits.
app.get("/api/restaurant/menu", requireRestaurantApiToken, async (req, res) => {
  const restaurant = req.restaurantAuth;
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.menuCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const links = getRestaurantItemLinks(restaurant.id);
  const idToExternal = Object.fromEntries(Object.entries(links).map(([ext, id]) => [id, ext]));

  res.json({
    categories: categories.map((c) => ({ name: c.name, sortOrder: c.sortOrder, isActive: c.isActive })),
    items: items.map((item) => ({
      id: item.id,
      externalId: idToExternal[item.id] || null,
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      isAvailable: item.isAvailable,
      stock: item.stock,
      updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
    })),
  });
});

// 3) Pousser le menu de la caisse vers SpeedZ (sens caisse → SpeedZ).
//    Upsert par externalId (ID produit de la caisse). deleted:true = retrait.
app.post(
  "/api/restaurant/menu/sync",
  requireRestaurantApiToken,
  validateBody(Schemas.syncMenu),
  async (req, res) => {
    const restaurant = req.restaurantAuth;
    const body = req.body;
    const links = getRestaurantItemLinks(restaurant.id);
    const summary = { created: 0, updated: 0, deleted: 0, categories: 0 };

    // Catégories : crée celles qui n'existent pas (MenuCategory a un nom unique).
    for (const category of body.categories || []) {
      const existing = await prisma.menuCategory.findUnique({ where: { name: category.name } });
      if (!existing) {
        await prisma.menuCategory.create({
          data: {
            name: category.name,
            sortOrder: Number(category.sortOrder) || 0,
            isActive: category.isActive !== false,
          },
        });
        summary.categories += 1;
      }
    }

    // Articles : upsert par externalId via le mapping fichier.
    const mappings = [];
    for (const incoming of body.items || []) {
      const externalId = String(incoming.externalId);
      const linkedId = links[externalId];

      if (incoming.deleted) {
        if (linkedId) {
          await prisma.menuItem
            .update({ where: { id: linkedId }, data: { deletedAt: new Date() } })
            .catch(() => {});
          delete links[externalId];
          summary.deleted += 1;
        }
        continue;
      }

      const data = {
        name: incoming.name,
        description: incoming.description || "",
        price: Number(incoming.price) || 0,
        category: incoming.category || "Divers",
        image: incoming.image || "",
        isAvailable: incoming.isAvailable !== false,
        stock: incoming.stock !== undefined ? Number(incoming.stock) : 0,
      };

      let itemId = linkedId;
      const exists = linkedId
        ? await prisma.menuItem.findUnique({ where: { id: linkedId } })
        : null;

      if (exists && !exists.deletedAt) {
        await prisma.menuItem.update({ where: { id: linkedId }, data });
        summary.updated += 1;
      } else {
        const created = await prisma.menuItem.create({
          data: { id: `pos_${restaurant.id}_${externalId}`.slice(0, 60), restaurantId: restaurant.id, options: [], ...data },
        });
        itemId = created.id;
        links[externalId] = itemId;
        summary.created += 1;
      }
      mappings.push({ externalId, id: itemId });
    }

    setRestaurantItemLinks(restaurant.id, links);
    broadcastAdminResource("menu-synced", { restaurantId: restaurant.id, ...summary });
    res.json({ ok: true, ...summary, mappings });
  }
);

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

// Configuration de livraison (publique : l'app mobile l'utilise pour estimer les frais).
app.get("/api/delivery-config", (_req, res) => {
  res.json(readDeliveryConfig());
});

app.get("/api/admin/delivery-config", requireAuth, requireAdmin, (_req, res) => {
  res.json(readDeliveryConfig());
});

app.put("/api/admin/delivery-config", requireAuth, requireAdmin, validateBody(Schemas.deliveryConfig), (req, res) => {
  writeDeliveryConfig(req.body);
  res.json(readDeliveryConfig());
});

// ─── Programme de fidélité (points) : entièrement administré par l'admin ───────
app.get("/api/loyalty-config", (_req, res) => {
  res.json(readLoyaltyConfig());
});

app.get("/api/admin/loyalty-config", requireAuth, requireAdmin, (_req, res) => {
  res.json(readLoyaltyConfig());
});

app.put("/api/admin/loyalty-config", requireAuth, requireAdmin, validateBody(Schemas.loyaltyConfig), async (req, res) => {
  writeLoyaltyConfig(req.body);
  await logAdminAction(req, "loyalty_config.updated", "loyalty-config", "global", req.body);
  res.json(readLoyaltyConfig());
});

// Publicités actives, filtrables par emplacement (SPLASH | HOME_BANNER).
app.get("/api/ads", (req, res) => {
  const placement = String(req.query.placement || "").toUpperCase();
  const now = new Date();
  const ads = readAds()
    .filter((ad) => isAdLive(ad, now))
    .filter((ad) => (placement ? ad.placement === placement : true))
    .map(serializeAd);
  res.json(ads);
});

app.get("/api/admin/ads", requireAuth, requireAdmin, (_req, res) => {
  res.json(readAds().map(serializeAd));
});

app.post("/api/admin/ads", requireAuth, requireAdmin, validateBody(Schemas.createAd), (req, res) => {
  const ads = readAds();
  const now = new Date().toISOString();
  const ad = {
    id: crypto.randomUUID(),
    title: req.body.title,
    imageUrl: req.body.imageUrl,
    placement: req.body.placement,
    isActive: req.body.isActive,
    startsAt: req.body.startsAt || null,
    endsAt: req.body.endsAt || null,
    restaurantId: req.body.restaurantId || null,
    createdAt: now,
    updatedAt: now,
  };
  ads.unshift(ad);
  writeAds(ads);
  res.status(201).json(serializeAd(ad));
});

app.patch("/api/admin/ads/:id", requireAuth, requireAdmin, validateBody(Schemas.updateAd), (req, res) => {
  const ads = readAds();
  const index = ads.findIndex((ad) => ad.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: "Publicité introuvable." });
    return;
  }
  ads[index] = {
    ...ads[index],
    ...req.body,
    restaurantId: req.body.restaurantId !== undefined ? req.body.restaurantId || null : ads[index].restaurantId,
    updatedAt: new Date().toISOString(),
  };
  writeAds(ads);
  res.json(serializeAd(ads[index]));
});

app.delete("/api/admin/ads/:id", requireAuth, requireAdmin, (req, res) => {
  const ads = readAds();
  const next = ads.filter((ad) => ad.id !== req.params.id);
  if (next.length === ads.length) {
    res.status(404).json({ message: "Publicité introuvable." });
    return;
  }
  writeAds(next);
  res.json({ ok: true });
});

// ─── Versements & facturation restaurant (admin) ─────────────────────────────
// Vue d'ensemble : pour chaque restaurant, ce qu'il doit / a versé / son solde.
app.get("/api/admin/billing-overview", requireAuth, requireAdmin, async (_req, res) => {
  const [restaurants, orders] = await Promise.all([
    prisma.restaurant.findMany(),
    prisma.order.findMany({
      select: { id: true, restaurantId: true, subtotal: true, status: true, createdAt: true },
    }),
  ]);
  const settlements = readSettlements();
  const rows = restaurants
    .map((restaurant) => {
      const statement = buildRestaurantBillingStatement(restaurant, orders, settlements);
      return { ...statement, name: restaurant.name, ownerName: restaurant.ownerName || null };
    })
    .sort((a, b) => b.balance - a.balance);
  res.json({
    restaurants: rows,
    settlements: settlements.map(serializeSettlement).sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt)),
  });
});

// Enregistre un versement reçu d'un restaurant.
app.post(
  "/api/admin/restaurants/:id/settlements",
  requireAuth,
  requireAdmin,
  validateBody(Schemas.createSettlement),
  async (req, res) => {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
    if (!restaurant) {
      res.status(404).json({ message: "Restaurant introuvable." });
      return;
    }
    const settlements = readSettlements();
    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      restaurantId: restaurant.id,
      amount: Number(req.body.amount),
      method: req.body.method || null,
      note: req.body.note || null,
      paidAt: req.body.paidAt || now,
      createdAt: now,
    };
    settlements.unshift(entry);
    writeSettlements(settlements);
    res.status(201).json(serializeSettlement(entry));
  }
);

app.delete("/api/admin/settlements/:id", requireAuth, requireAdmin, (req, res) => {
  const settlements = readSettlements();
  const next = settlements.filter((entry) => entry.id !== req.params.id);
  if (next.length === settlements.length) {
    res.status(404).json({ message: "Versement introuvable." });
    return;
  }
  writeSettlements(next);
  res.json({ ok: true });
});

app.get("/api/menu-categories", async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  res.json(categories.map(serializeMenuCategory));
});

app.post("/api/applications", validateBody(Schemas.createApplication), async (req, res) => {
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

  // Le plan de facturation est désormais paramétré par l'admin après réception
  // de la demande — il n'est plus exigé à l'inscription.

  // Mot de passe livreur : hashé immédiatement, jamais stocké en clair.
  const passwordHash =
    type === "COURIER" && body.password ? await bcrypt.hash(String(body.password), 10) : null;

  const applications = readPartnerApplications();
  const application = {
    id: `app_${Date.now()}`,
    type,
    applicantName,
    email,
    phone,
    city,
    passwordHash,
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

async function listAdminApplications(req, res) {
  const { page, limit, skip, search, status } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  let applications = readPartnerApplications();

  if (status) {
    applications = applications.filter((item) => String(item.status || "").toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const needle = search.toLowerCase();
    applications = applications.filter((item) =>
      [item.applicantName, item.email, item.phone, item.city, item.businessName, item.vehicle]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }

  applications.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
  // Ne jamais exposer le hash du mot de passe livreur, même à l'admin.
  const sanitized = applications
    .slice(skip, skip + limit)
    .map(({ passwordHash, ...rest }) => rest);
  ok(res, paginated(sanitized, applications.length, { page, limit }));
}

async function updateAdminApplication(req, res) {
  const applications = readPartnerApplications();
  const index = applications.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    throw new ApiError(404, "Demande introuvable.", "APPLICATION_NOT_FOUND");
  }

  const previousApplication = applications[index];
  const nextStatus = req.body?.status || previousApplication.status;
  let updatedApplication = {
    ...previousApplication,
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

      // Création du compte de connexion au portail restaurateur (email + mot de
      // passe temporaire), rattaché au même restaurant que le token API.
      const portalAccount = await ensureRestaurantPortalAccount({
        email: updatedApplication.email,
        name: updatedApplication.applicantName,
        phone: updatedApplication.phone,
        address: updatedApplication.address,
        restaurantId: restaurant.id,
      });

      updatedApplication = {
        ...updatedApplication,
        generatedApiToken,
        qrCodeToken,
        qrCodeUrl: getRestaurantQrLandingUrl(qrCodeToken),
        linkedEntityLabel: restaurant.name,
        portalEmail: portalAccount?.email || null,
        portalTemporaryPassword: portalAccount?.temporaryPassword || null,
      };
    }
  }

  // Livreur validé : tentative de push de bienvenue immédiat. No-op s'il n'a pas
  // encore de token (cas normal) — il le recevra alors à sa 1re connexion.
  if (nextStatus === "ACCEPTED" && updatedApplication.linkedEntityType === "COURIER" && updatedApplication.linkedEntityId) {
    const courier = await prisma.courier.findUnique({ where: { id: updatedApplication.linkedEntityId } });
    if (courier?.pushToken) {
      sendCourierWelcomePush(courier).catch((error) =>
        console.error("[push] bienvenue livreur (acceptation):", error?.message || error)
      );
    }
  }

  if (nextStatus === "REJECTED" && updatedApplication.linkedEntityType === "RESTAURANT" && updatedApplication.linkedEntityId) {
    await prisma.restaurant.update({
      where: { id: updatedApplication.linkedEntityId },
      data: { validationStatus: "REJECTED" }
    });
  }

  if (previousApplication.status !== nextStatus && (nextStatus === "ACCEPTED" || nextStatus === "REJECTED")) {
    await queueApplicationEmail(updatedApplication, nextStatus);
  }

  // Ne jamais persister le mot de passe portail en clair dans le fichier JSON.
  // Il n'existe que le temps de la réponse (email + affichage admin).
  const { portalTemporaryPassword, ...persistableApplication } = updatedApplication;
  applications[index] = persistableApplication;
  writePartnerApplications(applications);
  await logAdminAction(req, "application.status_updated", "application", updatedApplication.id, {
    previousStatus: previousApplication.status,
    nextStatus,
    linkedEntityId: updatedApplication.linkedEntityId || null,
  });
  broadcastAdminResource("application-updated", {
    applicationId: updatedApplication.id,
    linkedEntityId: updatedApplication.linkedEntityId || null,
  });

  // La réponse conserve les identifiants portail pour que l'admin puisse les
  // relayer si l'email n'aboutit pas (SMTP).
  const { passwordHash: _hash, ...safeApplication } = updatedApplication;
  ok(res, safeApplication);
}

async function updateAdminCustomer(req, res) {
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
  await logAdminAction(req, "customer.updated", "customer", customer.id, { isActive: customer.isActive });
  broadcastAdminResource("customer-updated", { customerId: customer.id });
  ok(res, serializeCustomer(customer));
}

async function updateAdminCourier(req, res) {
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
      restaurantId: req.body?.restaurantId !== undefined ? req.body.restaurantId || null : undefined,
      currentLat: req.body?.currentLat !== undefined ? Number(req.body.currentLat) : undefined,
      currentLng: req.body?.currentLng !== undefined ? Number(req.body.currentLng) : undefined
    },
    include: { orders: true, restaurant: true }
  });
  await logAdminAction(req, "courier.updated", "courier", courier.id, { status: courier.status });
  broadcastAdminResource("courier-updated", { courierId: courier.id });
  ok(res, serializeCourier(courier));
}

async function updateAdminPromotion(req, res) {
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
  await logAdminAction(req, "promotion.updated", "promotion", promotion.id, { code: promotion.code, isActive: promotion.isActive });
  broadcastAdminResource("promotion-updated", { promotionId: promotion.id });
  ok(res, serializePromotion(promotion));
}

async function updateAdminOrderStatus(req, res) {
  const { status, reason } = req.body || {};
  if (!status) {
    throw new ApiError(400, "Statut requis.", "ORDER_STATUS_REQUIRED");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: req.params.id }
  });

  if (!existingOrder) {
    throw new ApiError(404, "Commande introuvable.", "ORDER_NOT_FOUND");
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
  if (order.status === "Delivered") {
    await creditLoyaltyPointsForOrder(order.id);
  }
  await emitOrderRealtime(order.id, "order/status-updated");
  await notifyOrderStatus(order);
  await logAdminAction(req, "order.status_updated", "order", order.id, {
    previousStatus: existingOrder.status,
    nextStatus: order.status,
    reason: reason || null,
  });
  ok(res, serializeOrder(order));
}

async function assignAdminCourier(req, res) {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { courierId: req.body?.courierId || null },
    include: { restaurant: true, courier: true }
  });
  await emitOrderRealtime(order.id, "order/courier-assigned");
  if (order.courierId) {
    await emitCourierRealtime(order.courierId);
  }
  await logAdminAction(req, "order.courier_assigned", "order", order.id, { courierId: order.courierId || null });
  ok(res, serializeOrder(order));
}

app.get("/api/admin/restaurants", requireAuth, requireAdmin, wrapAsync(async (_req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    include: { menuItems: true },
    orderBy: { name: "asc" }
  });
  res.json(restaurants.map(serializeRestaurant));
}));

app.get("/api/admin/restaurants/:id/qr-code", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) {
    throw new ApiError(404, "Restaurant introuvable.", "RESTAURANT_NOT_FOUND");
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
}));

// Régénère le token API du restaurant (celui utilisé par l'agent imprimante).
// L'ancien token cesse immédiatement de fonctionner ; le resto doit re-coller
// le nouveau dans l'agent SpeedZPrinter.
app.post("/api/admin/restaurants/:id/regenerate-token", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) {
    throw new ApiError(404, "Restaurant introuvable.", "RESTAURANT_NOT_FOUND");
  }

  const apiToken = generateOpaqueToken("fdrest");
  const qrCodeToken = restaurant.qrCodeToken || generateOpaqueToken("qr");
  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { apiToken, qrCodeToken },
    include: { menuItems: true },
  });

  const qrUrl = getRestaurantQrLandingUrl(qrCodeToken);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 320 });
  await logAdminAction(req, "restaurant.token_regenerated", "restaurant", restaurant.id, {});
  res.json({ restaurant: serializeRestaurant(updated), apiToken, qrCodeToken, qrUrl, qrDataUrl });
}));

// (Ré)génère l'accès à l'espace restaurateur (web) : crée le compte s'il n'existe
// pas, réinitialise le mot de passe, et renvoie les identifiants + le lien de
// connexion + le token API + le lien QR. Permet à l'admin de communiquer (ou
// recommuniquer) l'accès au restaurateur à tout moment.
app.post("/api/admin/restaurants/:id/portal-access", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) {
    throw new ApiError(404, "Restaurant introuvable.", "RESTAURANT_NOT_FOUND");
  }

  const loginEmail = String(req.body?.email || restaurant.ownerEmail || "").trim().toLowerCase();
  if (!loginEmail) {
    throw new ApiError(400, "Aucun email proprietaire pour ce restaurant. Renseignez l'email d'abord.", "RESTAURANT_OWNER_EMAIL_MISSING");
  }

  const temporaryPassword = `resto-${crypto.randomBytes(4).toString("hex")}`;
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const existing = await prisma.user.findUnique({ where: { email: loginEmail } });
  if (existing) {
    // Un autre restaurant possède déjà ce compte : on refuse pour éviter le vol d'accès.
    if (existing.managedRestaurantId && existing.managedRestaurantId !== restaurant.id) {
      throw new ApiError(409, "Cet email est deja lie a un autre restaurant.", "EMAIL_LINKED_ELSEWHERE");
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "RESTAURANT", managedRestaurantId: restaurant.id, isActive: true, passwordHash },
    });
  } else {
    await prisma.user.create({
      data: {
        email: loginEmail,
        passwordHash,
        name: restaurant.ownerName || restaurant.name,
        phone: restaurant.ownerPhone || null,
        defaultAddress: restaurant.address || null,
        role: "RESTAURANT",
        managedRestaurantId: restaurant.id,
      },
    });
  }

  // S'assure d'un token API et d'un token QR (sans régénérer s'ils existent déjà).
  let apiToken = restaurant.apiToken;
  let qrCodeToken = restaurant.qrCodeToken;
  if (!apiToken || !qrCodeToken) {
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        apiToken: apiToken || generateOpaqueToken("fdrest"),
        qrCodeToken: qrCodeToken || generateOpaqueToken("qr"),
      },
    });
    apiToken = updated.apiToken;
    qrCodeToken = updated.qrCodeToken;
  }

  const loginUrl = (process.env.PORTAL_URL || getRequestPublicBaseUrl(req)).replace(/\/$/, "");
  const qrUrl = getRestaurantQrLandingUrl(qrCodeToken);

  // Envoi de l'email d'accès (best-effort).
  await queueRestaurantAccessEmail({
    restaurantName: restaurant.name,
    ownerName: restaurant.ownerName || restaurant.name,
    ownerEmail: loginEmail,
    loginEmail,
    temporaryPassword,
    apiToken,
    qrCodeUrl: qrUrl,
  });

  await logAdminAction(req, "restaurant.portal_access_generated", "restaurant", restaurant.id, { loginEmail });
  res.json({ loginEmail, temporaryPassword, loginUrl, apiToken, qrUrl });
}));

app.post("/api/admin/restaurants", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const body = req.body || {};
  const requiredFields = ["name", "category", "shortDescription", "address"];
  const missingFields = requiredFields.filter((field) => !String(body[field] || "").trim());
  if (missingFields.length) {
    throw new ApiError(400, "Champs restaurant obligatoires manquants.", "RESTAURANT_REQUIRED_FIELDS", {
      fields: missingFields,
    });
  }

  const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();

  if (ownerEmail) {
    const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingUser) {
      throw new ApiError(409, "Un compte existe deja avec cet email restaurant.", "RESTAURANT_OWNER_EMAIL_EXISTS");
    }
  }

  const restaurantId = String(body.id || `r${Date.now()}`).trim();
  const generatedApiToken = body.apiToken || generateOpaqueToken("fdrest");
  const generatedQrCodeToken = body.qrCodeToken || generateOpaqueToken("qr");
  const temporaryPassword = `resto-${crypto.randomBytes(4).toString("hex")}`;
  const fallbackImage =
    body.image ||
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";

  const restaurant = await prisma.$transaction(async (tx) => {
    const createdRestaurant = await tx.restaurant.create({
      data: {
        id: restaurantId,
        name: body.name,
        category: body.category,
        shortDescription: body.shortDescription,
        address: body.address,
        openingHours: body.openingHours || "11:00 - 23:00",
        deliveryTime: body.deliveryTime || "25-35 min",
        rating: Number(body.rating || 4.5),
        reviewCount: Number(body.reviewCount || 0),
        image: fallbackImage,
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
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
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

  broadcastAdminResource("restaurant-created", { restaurantId: restaurant.id });

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
}));

app.put("/api/admin/restaurants/:id", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
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
      // Mode de livraison : flotte SpeedZ ou livreurs propres au restaurant.
      deliveryMode: body.deliveryMode || undefined,
      freeDeliveryRadiusKm:
        body.freeDeliveryRadiusKm !== undefined ? Number(body.freeDeliveryRadiusKm) : undefined,
      allowSpeedzFallback:
        body.allowSpeedzFallback !== undefined ? Boolean(body.allowSpeedzFallback) : undefined,
    },
    include: { menuItems: true }
  });
  broadcastAdminResource("restaurant-updated", { restaurantId: restaurant.id });
  res.json(serializeRestaurant(restaurant));
}));

// ─── Suppression restaurant ────────────────────────────────────────────────────
// Soft-delete : marque le restaurant comme inactif ET supprimé
// (garde l'historique des commandes intact via Cascade défini dans Prisma)
app.delete("/api/admin/restaurants/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // ?hard=true pour suppression physique (admin only)

    // Vérifie qu'il n'y a pas de commandes actives (en cours / en attente)
    const activeOrders = await prisma.order.count({
      where: {
        restaurantId: id,
        status: { in: ACTIVE_ORDER_STATUSES },
      },
    });

    if (activeOrders > 0) {
      return res.status(409).json({
        error: `Impossible de supprimer : ${activeOrders} commande(s) active(s) en cours.`,
        activeOrders,
      });
    }

    if (hard === "true") {
      const totalOrders = await prisma.order.count({ where: { restaurantId: id } });
      if (totalOrders > 0) {
        return res.status(409).json({
          error: `Impossible de supprimer definitivement : ${totalOrders} commande(s) associee(s). Supprimez d'abord les commandes.`,
          totalOrders,
        });
      }
      await prisma.restaurant.delete({ where: { id } });
      broadcastAdminResource("restaurant-deleted", { restaurantId: id, hard: true });
      return res.status(200).json({ deleted: true, hard: true });
    }

    // Soft-delete par défaut : désactive le restaurant (pas de deletedAt sur ce modèle)
    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        isActive: false,
        validationStatus: "REJECTED",
      },
    });

    broadcastAdminResource("restaurant-deleted", { restaurantId: updated.id, hard: false });

    return res.status(200).json({ deleted: true, hard: false, id: updated.id });
  } catch (error) {
    console.error("DELETE /api/admin/restaurants/:id", error);
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
});

// ─── Archivage menu item (amélioration : retour du record archivé) ─────────────
// Le DELETE menu-items existant fait un soft-delete, on l'améliore avec une réponse

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
  broadcastAdminResource("menu-item-created", { restaurantId: req.params.id, menuItemId: item.id });
  res.status(201).json(item);
});

app.put("/api/admin/menu-items/:id", requireAuth, requireAdmin, validateBody(Schemas.updateMenuItem), async (req, res) => {
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
  broadcastAdminResource("menu-item-updated", { restaurantId: item.restaurantId, menuItemId: item.id });
  res.json(item);
});

app.patch("/api/admin/menu-items/:id/stock", requireAuth, requireAdmin, validateBody(z.object({ stock: z.number().int().min(0) })), async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { stock: Number(req.body?.stock || 0) }
  });
  broadcastAdminResource("menu-item-stock-updated", { restaurantId: item.restaurantId, menuItemId: item.id });
  res.json(item);
});

app.patch("/api/admin/menu-items/:id/availability", requireAuth, requireAdmin, validateBody(z.object({ isAvailable: z.boolean() })), async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { isAvailable: Boolean(req.body?.isAvailable) }
  });
  broadcastAdminResource("menu-item-availability-updated", { restaurantId: item.restaurantId, menuItemId: item.id });
  res.json(item);
});

app.delete("/api/admin/menu-items/:id", requireAuth, requireAdmin, async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { deletedAt: new Date() }
  });
  broadcastAdminResource("menu-item-deleted", { restaurantId: item.restaurantId, menuItemId: item.id });
  res.status(204).send();
});

app.get("/api/admin/menu-categories", requireAuth, requireAdmin, async (_req, res) => {
  const categories = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  res.json(categories.map(serializeMenuCategory));
});

app.get("/api/admin/applications", requireAuth, requireAdmin, wrapAsync(listAdminApplications));

app.patch("/api/admin/applications/:id", requireAuth, requireAdmin, wrapAsync(updateAdminApplication));

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

  broadcastAdminResource("application-restaurant-activated", { applicationId: req.params.id, restaurantId: restaurant.id });

  res.json(serializeRestaurant(restaurant));
});

app.get("/api/admin/email-outbox", requireAuth, requireAdmin, wrapAsync(async (_req, res) => {
  res.json(readEmailOutbox());
}));

// ─── Livreurs préférés d'un restaurant ────────────────────────────────────────
// Ils sont notifiés en priorité pendant RESTAURANT_PREFERRED_WINDOW_MS.
app.get("/api/admin/restaurants/:id/preferred-couriers", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const links = await prisma.restaurantPreferredCourier.findMany({
    where: { restaurantId: req.params.id },
    include: { courier: { include: { orders: true, restaurant: true } } },
    orderBy: { createdAt: "asc" },
  });
  ok(res, links.map((link) => serializeCourier(link.courier)));
}));

app.put("/api/admin/restaurants/:id/preferred-couriers", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const restaurantId = req.params.id;
  const courierIds = Array.isArray(req.body?.courierIds) ? req.body.courierIds.filter(Boolean) : [];

  // Remplacement complet de la liste (plus simple et idempotent côté admin).
  await prisma.restaurantPreferredCourier.deleteMany({ where: { restaurantId } });
  if (courierIds.length) {
    await prisma.restaurantPreferredCourier.createMany({
      data: courierIds.map((courierId) => ({ restaurantId, courierId })),
      skipDuplicates: true,
    });
  }

  await logAdminAction(req, "restaurant.preferred_couriers_updated", "restaurant", restaurantId, {
    count: courierIds.length,
  });
  const links = await prisma.restaurantPreferredCourier.findMany({
    where: { restaurantId },
    include: { courier: { include: { orders: true, restaurant: true } } },
  });
  ok(res, links.map((link) => serializeCourier(link.courier)));
}));

// ─── Notifications push envoyées depuis l'admin ───────────────────────────────
// Cible : CLIENTS (app client), COURIERS (app livreur) ou ALL (les deux).
app.get("/api/admin/notifications/push", requireAuth, requireAdmin, wrapAsync(async (_req, res) => {
  const [clientTokens, courierTokens] = await Promise.all([
    Promise.resolve(getAllClientPushTokens()),
    getAllCourierPushTokens(),
  ]);
  res.json({
    audiences: {
      clients: clientTokens.length,
      couriers: courierTokens.length,
    },
    campaigns: readPushCampaigns(),
  });
}));

app.post("/api/admin/notifications/push", requireAuth, requireAdmin, validateBody(Schemas.adminPushNotification), wrapAsync(async (req, res) => {
  const { audience, title, body, userId, zoneLabel } = req.body;

  // Sélection des tokens selon la cible.
  const targets = [];
  let targetLabel = "";
  if (audience === "ALL") {
    targets.push(...getAllClientPushTokens(), ...(await getAllCourierPushTokens()));
    targetLabel = "Tous";
  } else if (audience === "CLIENTS") {
    targets.push(...getAllClientPushTokens());
    targetLabel = "Tous les clients";
  } else if (audience === "COURIERS") {
    targets.push(...(await getAllCourierPushTokens()));
    targetLabel = "Tous les livreurs";
  } else if (audience === "CLIENT") {
    const token = getPushToken(userId);
    if (token) targets.push(token);
    const client = await prisma.user.findUnique({ where: { id: userId } });
    targetLabel = `Client : ${client?.name || userId}`;
  } else if (audience === "COURIER_ZONE") {
    const couriers = await prisma.courier.findMany({
      where: { zoneLabel, pushToken: { not: null } },
      select: { pushToken: true },
    });
    targets.push(...couriers.map((c) => c.pushToken).filter(Boolean));
    targetLabel = `Livreurs — zone ${zoneLabel}`;
  }

  const data = { type: "admin-broadcast", audience };
  const sent = await sendExpoPushBatch(targets, { title, body, data });

  const campaign = {
    id: `push_${Date.now()}`,
    audience,
    targetLabel,
    userId: userId || null,
    zoneLabel: zoneLabel || null,
    title,
    body,
    sent,
    sentBy: req.auth?.email || req.auth?.sub || "admin",
    createdAt: new Date().toISOString(),
  };
  const campaigns = readPushCampaigns();
  campaigns.unshift(campaign);
  writePushCampaigns(campaigns);

  await logAdminAction(req, "notification.push_sent", "push", campaign.id, { audience, sent });
  res.status(201).json({ ok: true, campaign });
}));

app.post("/api/admin/menu-categories", requireAuth, requireAdmin, validateBody(Schemas.createMenuCategory), async (req, res) => {
  const body = req.body || {};
  const category = await prisma.menuCategory.create({
    data: {
      name: body.name,
      sortOrder: Number(body.sortOrder || 0),
      isActive: body.isActive ?? true,
    }
  });
  broadcastAdminResource("menu-category-created", { categoryId: category.id });
  res.status(201).json(serializeMenuCategory(category));
});

app.patch("/api/admin/menu-categories/:id", requireAuth, requireAdmin, validateBody(Schemas.updateMenuCategory), async (req, res) => {
  const body = req.body || {};
  const category = await prisma.menuCategory.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      sortOrder: Number(body.sortOrder || 0),
      isActive: body.isActive ?? true,
    }
  });
  broadcastAdminResource("menu-category-updated", { categoryId: category.id });
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

  broadcastAdminResource("menu-category-deleted", { categoryId: req.params.id });

  res.status(204).send();
});

app.get("/api/admin/customers", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const { page, limit, skip, search, status } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const where = {
    role: "CUSTOMER",
    ...(status ? { isActive: status.toLowerCase() === "active" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        orders: true,
        loyaltyEntries: true,
        favorites: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  ok(res, paginated(customers.map(serializeCustomer), total, { page, limit }));
}));

app.patch("/api/admin/customers/:id", requireAuth, requireAdmin, validateBody(Schemas.updateCustomer), wrapAsync(updateAdminCustomer));

app.get("/api/admin/couriers", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const { page, limit, skip, search, status } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { vehicle: { contains: search } },
            { zoneLabel: { contains: search } },
          ],
        }
      : {}),
  };
  const [couriers, total] = await Promise.all([
    prisma.courier.findMany({
      where,
      include: { orders: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.courier.count({ where }),
  ]);
  ok(res, paginated(couriers.map(serializeCourier), total, { page, limit }));
}));

app.post("/api/admin/couriers", requireAuth, requireAdmin, validateBody(Schemas.createCourier), async (req, res) => {
  const courier = await prisma.courier.create({
    data: {
      name: req.body?.name,
      phone: req.body?.phone,
      vehicle: req.body?.vehicle,
      status: req.body?.status || "AVAILABLE",
      payPerDelivery: req.body?.payPerDelivery !== undefined ? Number(req.body.payPerDelivery) : 3,
      payPerKm: req.body?.payPerKm !== undefined ? Number(req.body.payPerKm) : 0.8,
      zoneLabel: req.body?.zoneLabel || null,
      restaurantId: req.body?.restaurantId || null,
      currentLat: req.body?.currentLat ? Number(req.body.currentLat) : null,
      currentLng: req.body?.currentLng ? Number(req.body.currentLng) : null
    },
    include: { orders: true, restaurant: true }
  });
  broadcastAdminResource("courier-created", { courierId: courier.id });
  res.status(201).json(serializeCourier(courier));
});

app.patch("/api/admin/couriers/:id", requireAuth, requireAdmin, validateBody(Schemas.updateCourier), wrapAsync(updateAdminCourier));

app.get("/api/admin/promotions", requireAuth, requireAdmin, async (_req, res) => {
  const promotions = await prisma.promotion.findMany({
    include: { orders: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(promotions.map(serializePromotion));
});

app.post("/api/admin/promotions", requireAuth, requireAdmin, validateBody(Schemas.createPromotion), wrapAsync(async (req, res) => {
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
  await logAdminAction(req, "promotion.created", "promotion", promotion.id, { code: promotion.code });
  broadcastAdminResource("promotion-created", { promotionId: promotion.id });
  ok(res, serializePromotion(promotion), 201);
}));

app.patch("/api/admin/promotions/:id", requireAuth, requireAdmin, validateBody(Schemas.updatePromotion), wrapAsync(updateAdminPromotion));

app.get("/api/admin/orders", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const { page, limit, skip, search, status } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const where = {
    ...(status && status !== "All"
      ? { status: normalizeStatus(status) }
      : {}),
    ...(search
      ? {
          OR: [
            { id: { contains: search } },
            { address: { contains: search } },
            { notes: { contains: search } },
            { restaurant: { name: { contains: search } } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { restaurant: true, user: true, courier: true, promotion: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);
  ok(
    res,
    paginated(
      orders.map((item) => ({
        ...serializeOrder(item),
        customerName: item.user.name,
        customerPhone: item.user.phone,
        customerEmail: item.user.email,
        promotionCode: item.promotion?.code || null
      })),
      total,
      { page, limit }
    )
  );
}));

app.patch("/api/admin/orders/:id/status", requireAuth, requireAdmin, validateBody(Schemas.updateOrderStatus), wrapAsync(updateAdminOrderStatus));

app.patch("/api/admin/orders/:id/assign-courier", requireAuth, requireAdmin, validateBody(Schemas.assignCourier), wrapAsync(assignAdminCourier));

// Ré-impression : remet la commande dans la file de l'agent d'impression.
app.post("/api/admin/orders/:id/reprint", requireAuth, requireAdmin, wrapAsync(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    throw new ApiError(404, "Commande introuvable.", "ORDER_NOT_FOUND");
  }
  await prisma.order.update({
    where: { id: req.params.id },
    data: { printerPrintedAt: null },
  });
  await logAdminAction(req, "order.reprint", "order", req.params.id, {});
  ok(res, { ok: true });
}));

app.get("/api/admin/reports/summary", requireAuth, requireAdmin, wrapAsync(async (_req, res) => {
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
}));

// ════════════════════════════════════════════════════════════════════════════
// PORTAIL RESTAURATEUR (WEB) — espace restaurant self-service.
// Auth : JWT d'un User role=RESTAURANT lié à un restaurant (managedRestaurantId).
// Toutes les données sont scopées à req.restaurantAuth (le restaurant du compte).
// ════════════════════════════════════════════════════════════════════════════

const RESTAURANT_ACTIVE_ORDER_STATUSES = [
  "AwaitingCourier",
  "Accepted",
  "Confirmed",
  "Preparing",
  "Ready",
  "OnTheWay",
];

function broadcastRestaurant(restaurantId, type, payload = {}) {
  broadcastRealtime(`restaurant/${type}`, { restaurantId, ...payload });
}

// Recalcule l'état d'une table à partir de ses commandes en cours.
async function refreshTableStatus(tableId) {
  if (!tableId) return;
  const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
  if (!table) return;
  const activeCount = await prisma.order.count({
    where: { tableId, status: { in: RESTAURANT_ACTIVE_ORDER_STATUSES } },
  });
  let nextStatus = table.status;
  if (activeCount > 0) {
    if (table.status === "FREE") nextStatus = "ORDER_IN_PROGRESS";
  } else if (table.status === "ORDER_IN_PROGRESS") {
    nextStatus = "FREE";
  }
  if (nextStatus !== table.status) {
    await prisma.restaurantTable.update({ where: { id: tableId }, data: { status: nextStatus } });
  }
  broadcastRestaurant(table.restaurantId, "table-updated", { tableId });
}

// ─── Profil / bootstrap de l'espace restaurant ────────────────────────────────
app.get("/api/restaurant/portal/me", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.restaurantAuth.id },
    include: { menuItems: true },
  });
  res.json({
    restaurant: serializeRestaurant(restaurant),
    account: {
      id: req.restaurantUser.id,
      name: req.restaurantUser.name,
      email: req.restaurantUser.email,
    },
  });
}));

// Compose un résumé lisible des horaires par jour (regroupe les jours consécutifs
// aux mêmes horaires). Ex : "Lun-Ven 11:00-23:00 · Sam-Dim 12:00-00:00 · fermé Dim".
const WEEK_DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

function summarizeWeeklyHours(weekly) {
  if (!weekly || typeof weekly !== "object") return null;
  const sig = (d) => {
    const day = weekly[d.key];
    if (!day || day.closed || !day.open || !day.close) return "closed";
    return `${day.open}-${day.close}`;
  };
  const segments = [];
  let start = 0;
  for (let i = 1; i <= WEEK_DAYS.length; i += 1) {
    if (i === WEEK_DAYS.length || sig(WEEK_DAYS[i]) !== sig(WEEK_DAYS[start])) {
      const s = sig(WEEK_DAYS[start]);
      const range = start === i - 1 ? WEEK_DAYS[start].label : `${WEEK_DAYS[start].label}-${WEEK_DAYS[i - 1].label}`;
      segments.push(s === "closed" ? `${range} fermé` : `${range} ${s}`);
      start = i;
    }
  }
  return segments.join(" · ").slice(0, 120);
}

// ─── Profil restaurant (édité par le restaurateur) ────────────────────────────
app.patch("/api/restaurant/portal/profile", requireAuth, requireRestaurant, validateBody(Schemas.portalProfile), wrapAsync(async (req, res) => {
  const body = req.body;
  const data = {};
  if (body.shortDescription !== undefined) data.shortDescription = body.shortDescription;
  if (body.openingHours !== undefined) data.openingHours = body.openingHours;
  if (body.deliveryTime !== undefined) data.deliveryTime = body.deliveryTime;
  if (body.address !== undefined) data.address = body.address;
  if (body.ownerPhone !== undefined) data.ownerPhone = body.ownerPhone || null;
  if (body.image !== undefined) data.image = body.image;
  if (body.heroColor !== undefined) data.heroColor = body.heroColor;
  // Horaires par jour : on stocke la structure et on compose un résumé lisible
  // (openingHours) affiché sur la fiche resto et la page QR.
  if (body.weeklyHours !== undefined) {
    data.weeklyHours = body.weeklyHours;
    const summary = summarizeWeeklyHours(body.weeklyHours);
    if (summary) data.openingHours = summary;
  }

  const restaurant = await prisma.restaurant.update({
    where: { id: req.restaurantAuth.id },
    data,
    include: { menuItems: true },
  });
  broadcastRestaurant(req.restaurantAuth.id, "profile-updated", {});
  res.json(serializeRestaurant(restaurant));
}));

// ─── Upload d'image (plats / vitrine) ─────────────────────────────────────────
app.post("/api/restaurant/portal/upload-image", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  await new Promise((resolve, reject) => {
    upload.single("image")(req, res, (error) => (error ? reject(error) : resolve()));
  });
  if (!req.file) {
    throw new ApiError(400, "Aucun fichier image envoye.", "UPLOAD_MISSING_FILE");
  }
  const normalizeMime = (value) => (value === "image/pjpeg" ? "image/jpeg" : value);
  const detectedMimeType = detectImageTypeFromFile(req.file.path);
  if (!detectedMimeType || normalizeMime(detectedMimeType) !== normalizeMime(req.file.mimetype)) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, "Le fichier envoye n'est pas une image valide.", "UPLOAD_INVALID_IMAGE");
  }
  const publicBaseUrl = getRequestPublicBaseUrl(req);
  res.status(201).json({
    url: `${publicBaseUrl.replace(/\/$/, "")}/uploads/${req.file.filename}`,
    filename: req.file.filename,
  });
}));

// ─── Menu ─────────────────────────────────────────────────────────────────────
app.get("/api/restaurant/portal/menu", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId: req.restaurantAuth.id, deletedAt: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.menuCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  res.json({ items, categories: categories.map(serializeMenuCategory) });
}));

app.post("/api/restaurant/portal/menu-items", requireAuth, requireRestaurant, validateBody(Schemas.portalMenuItem), wrapAsync(async (req, res) => {
  const body = req.body;
  const item = await prisma.menuItem.create({
    data: {
      id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
      restaurantId: req.restaurantAuth.id,
      name: body.name,
      description: body.description || "",
      price: Number(body.price),
      category: body.category,
      image: body.image || "",
      badge: body.badge || null,
      calories: body.calories ?? null,
      stock: Number(body.stock || 0),
      isAvailable: body.isAvailable ?? true,
      options: body.options || [],
    },
  });
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", { menuItemId: item.id });
  res.status(201).json(item);
}));

app.put("/api/restaurant/portal/menu-items/:id", requireAuth, requireRestaurant, validateBody(Schemas.portalMenuItem), wrapAsync(async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(404, "Plat introuvable.", "MENU_ITEM_NOT_FOUND");
  }
  const body = req.body;
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: {
      name: body.name,
      description: body.description || "",
      price: Number(body.price),
      category: body.category,
      image: body.image || "",
      badge: body.badge || null,
      calories: body.calories ?? null,
      stock: Number(body.stock || 0),
      isAvailable: body.isAvailable ?? true,
      options: body.options || [],
    },
  });
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", { menuItemId: item.id });
  res.json(item);
}));

app.patch("/api/restaurant/portal/menu-items/:id/availability", requireAuth, requireRestaurant, validateBody(z.object({ isAvailable: z.boolean() })), wrapAsync(async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(404, "Plat introuvable.", "MENU_ITEM_NOT_FOUND");
  }
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { isAvailable: Boolean(req.body.isAvailable) },
  });
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", { menuItemId: item.id });
  res.json(item);
}));

app.patch("/api/restaurant/portal/menu-items/:id/stock", requireAuth, requireRestaurant, validateBody(z.object({ stock: z.number().int().min(0) })), wrapAsync(async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(404, "Plat introuvable.", "MENU_ITEM_NOT_FOUND");
  }
  const item = await prisma.menuItem.update({
    where: { id: req.params.id },
    data: { stock: Number(req.body.stock || 0) },
  });
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", { menuItemId: item.id });
  res.json(item);
}));

app.delete("/api/restaurant/portal/menu-items/:id", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id, deletedAt: null },
  });
  if (!existing) {
    throw new ApiError(404, "Plat introuvable.", "MENU_ITEM_NOT_FOUND");
  }
  await prisma.menuItem.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", { menuItemId: req.params.id });
  res.status(204).send();
}));

app.post("/api/restaurant/portal/menu-categories", requireAuth, requireRestaurant, validateBody(Schemas.createMenuCategory), wrapAsync(async (req, res) => {
  const existing = await prisma.menuCategory.findUnique({ where: { name: req.body.name } });
  if (existing) {
    return res.json(serializeMenuCategory(existing));
  }
  const category = await prisma.menuCategory.create({
    data: { name: req.body.name, sortOrder: req.body.sortOrder ?? 0, isActive: req.body.isActive ?? true },
  });
  res.status(201).json(serializeMenuCategory(category));
}));

// Liste des catégories du restaurant avec le nombre de plats, ordonnées.
app.get("/api/restaurant/portal/categories", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId: req.restaurantAuth.id, deletedAt: null },
      select: { category: true },
    }),
    prisma.menuCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const counts = {};
  for (const item of items) {
    const c = item.category || "Divers";
    counts[c] = (counts[c] || 0) + 1;
  }
  const known = new Map(categories.map((c) => [c.name, c.sortOrder]));
  // Union des catégories déclarées (MenuCategory) et de celles réellement utilisées.
  const names = new Set([...categories.map((c) => c.name), ...Object.keys(counts)]);
  const list = [...names]
    .map((name) => ({ name, count: counts[name] || 0, sortOrder: known.has(name) ? known.get(name) : 999 }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  res.json(list);
}));

// Renomme une catégorie : met à jour tous les plats du restaurant qui la portent.
app.patch("/api/restaurant/portal/categories/rename", requireAuth, requireRestaurant, validateBody(Schemas.renameCategory), wrapAsync(async (req, res) => {
  const from = String(req.body.from);
  const to = String(req.body.to).trim();
  if (!to) throw new ApiError(400, "Nouveau nom requis.", "CATEGORY_NAME_REQUIRED");
  await prisma.menuItem.updateMany({
    where: { restaurantId: req.restaurantAuth.id, category: from, deletedAt: null },
    data: { category: to },
  });
  // Assure une entrée MenuCategory pour la nouvelle (pour l'ordre/datalist).
  const existing = await prisma.menuCategory.findUnique({ where: { name: to } });
  if (!existing) {
    await prisma.menuCategory.create({ data: { name: to, sortOrder: 0, isActive: true } }).catch(() => {});
  }
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", {});
  res.json({ ok: true });
}));

// Réordonne les catégories (sortOrder global sur MenuCategory).
app.patch("/api/restaurant/portal/categories/reorder", requireAuth, requireRestaurant, validateBody(Schemas.reorderCategories), wrapAsync(async (req, res) => {
  const order = req.body.order || [];
  for (let i = 0; i < order.length; i += 1) {
    const name = String(order[i]);
    await prisma.menuCategory.upsert({
      where: { name },
      update: { sortOrder: i },
      create: { name, sortOrder: i, isActive: true },
    });
  }
  broadcastRestaurant(req.restaurantAuth.id, "menu-updated", {});
  res.json({ ok: true });
}));

// Statistiques agrégées par jour sur une période (semaine / mois).
app.get("/api/restaurant/portal/stats", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const range = req.query.range === "month" ? "month" : "week";
  const days = range === "month" ? 30 : 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const orders = await prisma.order.findMany({
    where: { restaurantId: req.restaurantAuth.id, createdAt: { gte: start }, status: { not: "Cancelled" } },
    select: { total: true, channel: true, items: true, createdAt: true },
  });

  // Clé de jour en heure LOCALE serveur (le restaurateur raisonne en jour local,
  // pas en UTC — sinon les commandes du soir basculent sur le mauvais jour).
  const localKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Prépare les buckets par jour.
  const buckets = [];
  const byKey = {};
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localKey(d);
    const bucket = { date: key, revenue: 0, orders: 0, onsite: 0, delivery: 0 };
    byKey[key] = bucket;
    buckets.push(bucket);
  }

  const dishCounts = {};
  let totalRevenue = 0;
  for (const o of orders) {
    const key = localKey(o.createdAt);
    const bucket = byKey[key];
    if (bucket) {
      bucket.revenue += o.total || 0;
      bucket.orders += 1;
      if (o.channel === "QR_ONSITE") bucket.onsite += 1;
      else bucket.delivery += 1;
    }
    totalRevenue += o.total || 0;
    for (const item of o.items || []) {
      const name = item.name || "?";
      dishCounts[name] = (dishCounts[name] || 0) + (item.quantity || 1);
    }
  }

  const topDishes = Object.entries(dishCounts)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  buckets.forEach((b) => (b.revenue = Number(b.revenue.toFixed(2))));
  res.json({
    range,
    days,
    daily: buckets,
    totals: {
      revenue: Number(totalRevenue.toFixed(2)),
      orders: orders.length,
      averageBasket: orders.length ? Number((totalRevenue / orders.length).toFixed(2)) : 0,
    },
    topDishes,
  });
}));

// ─── Commandes / KDS ──────────────────────────────────────────────────────────
app.get("/api/restaurant/portal/orders", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const scope = String(req.query.scope || "active");
  const where = { restaurantId: req.restaurantAuth.id };
  if (scope === "active") {
    where.status = { in: RESTAURANT_ACTIVE_ORDER_STATUSES };
  } else if (scope === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    where.createdAt = { gte: start };
  }
  const orders = await prisma.order.findMany({
    where,
    include: { restaurant: true, courier: true, user: true },
    orderBy: { createdAt: scope === "active" ? "asc" : "desc" },
    take: scope === "active" ? 200 : 100,
  });
  res.json(
    orders.map((order) => ({
      ...serializeOrder(order),
      customerName: order.user?.name || null,
      customerPhone: order.user?.phone || null,
    }))
  );
}));

app.patch("/api/restaurant/portal/orders/:id/status", requireAuth, requireRestaurant, validateBody(Schemas.portalOrderStatus), wrapAsync(async (req, res) => {
  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id },
  });
  if (!existing) {
    throw new ApiError(404, "Commande introuvable.", "ORDER_NOT_FOUND");
  }
  const nextStatus = req.body.status;
  const noteSuffix = req.body.reason ? `Restaurant: ${String(req.body.reason).trim()}` : null;
  const nextNotes = noteSuffix ? [existing.notes, noteSuffix].filter(Boolean).join(" | ") : existing.notes;

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: nextStatus, notes: nextNotes },
    include: { restaurant: true, courier: true },
  });

  if (order.status === "Delivered") {
    await creditLoyaltyPointsForOrder(order.id);
  }
  if (existing.tableId) {
    await refreshTableStatus(existing.tableId);
  }
  await emitOrderRealtime(order.id, "order/status-updated");
  await notifyOrderStatus(order);
  res.json(serializeOrder(order));
}));

// ─── Tables / plan de salle ───────────────────────────────────────────────────
app.get("/api/restaurant/portal/tables", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: req.restaurantAuth.id },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  // Commandes actives par table pour l'affichage du plan de salle.
  const activeOrders = await prisma.order.findMany({
    where: {
      restaurantId: req.restaurantAuth.id,
      tableId: { not: null },
      status: { in: RESTAURANT_ACTIVE_ORDER_STATUSES },
    },
    include: { restaurant: true, courier: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  const ordersByTable = {};
  for (const order of activeOrders) {
    (ordersByTable[order.tableId] ||= []).push({
      ...serializeOrder(order),
      customerName: order.user?.name || null,
    });
  }
  res.json(
    tables.map((table) => ({
      ...serializeTable(table, req.restaurantAuth),
      activeOrders: ordersByTable[table.id] || [],
    }))
  );
}));

app.post("/api/restaurant/portal/tables", requireAuth, requireRestaurant, validateBody(Schemas.createTable), wrapAsync(async (req, res) => {
  const duplicate = await prisma.restaurantTable.findFirst({
    where: { restaurantId: req.restaurantAuth.id, label: req.body.label },
  });
  if (duplicate) {
    throw new ApiError(409, "Une table porte deja ce libelle.", "TABLE_LABEL_TAKEN");
  }
  const table = await prisma.restaurantTable.create({
    data: {
      restaurantId: req.restaurantAuth.id,
      label: req.body.label,
      zone: req.body.zone || null,
      seats: req.body.seats ?? 2,
      sortOrder: req.body.sortOrder ?? 0,
      qrToken: generateOpaqueToken("tbl"),
    },
  });
  broadcastRestaurant(req.restaurantAuth.id, "table-updated", { tableId: table.id });
  res.status(201).json(serializeTable(table, req.restaurantAuth));
}));

app.put("/api/restaurant/portal/tables/:id", requireAuth, requireRestaurant, validateBody(Schemas.updateTable), wrapAsync(async (req, res) => {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id },
  });
  if (!existing) {
    throw new ApiError(404, "Table introuvable.", "TABLE_NOT_FOUND");
  }
  if (req.body.label && req.body.label !== existing.label) {
    const dup = await prisma.restaurantTable.findFirst({
      where: { restaurantId: req.restaurantAuth.id, label: req.body.label, id: { not: existing.id } },
    });
    if (dup) {
      throw new ApiError(409, "Une table porte deja ce libelle.", "TABLE_LABEL_TAKEN");
    }
  }
  const table = await prisma.restaurantTable.update({
    where: { id: req.params.id },
    data: {
      label: req.body.label ?? existing.label,
      zone: req.body.zone === undefined ? existing.zone : req.body.zone,
      seats: req.body.seats ?? existing.seats,
      sortOrder: req.body.sortOrder ?? existing.sortOrder,
    },
  });
  broadcastRestaurant(req.restaurantAuth.id, "table-updated", { tableId: table.id });
  res.json(serializeTable(table, req.restaurantAuth));
}));

app.patch("/api/restaurant/portal/tables/:id/status", requireAuth, requireRestaurant, validateBody(Schemas.tableStatus), wrapAsync(async (req, res) => {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id },
  });
  if (!existing) {
    throw new ApiError(404, "Table introuvable.", "TABLE_NOT_FOUND");
  }
  const table = await prisma.restaurantTable.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  broadcastRestaurant(req.restaurantAuth.id, "table-updated", { tableId: table.id });
  res.json(serializeTable(table, req.restaurantAuth));
}));

app.delete("/api/restaurant/portal/tables/:id", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const existing = await prisma.restaurantTable.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id },
  });
  if (!existing) {
    throw new ApiError(404, "Table introuvable.", "TABLE_NOT_FOUND");
  }
  await prisma.restaurantTable.delete({ where: { id: req.params.id } });
  broadcastRestaurant(req.restaurantAuth.id, "table-updated", { tableId: req.params.id });
  res.status(204).send();
}));

app.get("/api/restaurant/portal/tables/:id/qr", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const table = await prisma.restaurantTable.findFirst({
    where: { id: req.params.id, restaurantId: req.restaurantAuth.id },
  });
  if (!table) {
    throw new ApiError(404, "Table introuvable.", "TABLE_NOT_FOUND");
  }
  // S'assure que le restaurant a un qrCodeToken (base des liens QR de table).
  let restaurant = req.restaurantAuth;
  if (!restaurant.qrCodeToken) {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { qrCodeToken: generateOpaqueToken("qr") },
    });
  }
  const qrUrl = getRestaurantTableQrUrl(restaurant, table);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 360 });
  res.json({ tableLabel: table.label, qrUrl, qrDataUrl });
}));

// QR global du restaurant (carte / à emporter).
app.get("/api/restaurant/portal/qr", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  let restaurant = req.restaurantAuth;
  if (!restaurant.qrCodeToken) {
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { qrCodeToken: generateOpaqueToken("qr") },
    });
  }
  const qrUrl = getRestaurantQrLandingUrl(restaurant.qrCodeToken);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 360 });
  res.json({ qrCodeToken: restaurant.qrCodeToken, qrUrl, qrDataUrl });
}));

// ─── Tableau de bord (KPIs temps réel) ────────────────────────────────────────
app.get("/api/restaurant/portal/dashboard", requireAuth, requireRestaurant, wrapAsync(async (req, res) => {
  const restaurantId = req.restaurantAuth.id;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, activeOrders, tables, menuItems] = await Promise.all([
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfDay } },
      select: { id: true, total: true, subtotal: true, status: true, channel: true, items: true, createdAt: true, updatedAt: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, status: { in: RESTAURANT_ACTIVE_ORDER_STATUSES } },
      select: { id: true, status: true, channel: true, createdAt: true },
    }),
    prisma.restaurantTable.findMany({ where: { restaurantId }, select: { status: true } }),
    prisma.menuItem.findMany({ where: { restaurantId, deletedAt: null }, select: { name: true, stock: true, isAvailable: true } }),
  ]);

  const validToday = todayOrders.filter((o) => o.status !== "Cancelled");
  const revenue = validToday.reduce((sum, o) => sum + (o.total || 0), 0);
  const onsite = validToday.filter((o) => o.channel === "QR_ONSITE");
  const delivery = validToday.filter((o) => o.channel === "DELIVERY");
  const averageBasket = validToday.length ? revenue / validToday.length : 0;
  const pendingAcceptance = activeOrders.filter((o) => o.status === "Confirmed" || o.status === "AwaitingCourier").length;
  const inPreparation = activeOrders.filter((o) => o.status === "Preparing").length;
  const ready = activeOrders.filter((o) => o.status === "Ready").length;

  // Temps de préparation moyen (approx : createdAt → updatedAt) des commandes
  // du jour arrivées au moins jusqu'à "prête".
  const preparedToday = validToday.filter((o) => ["Ready", "OnTheWay", "Delivered"].includes(o.status));
  const avgPrepMinutes = preparedToday.length
    ? preparedToday.reduce((sum, o) => sum + (new Date(o.updatedAt) - new Date(o.createdAt)), 0) / preparedToday.length / 60000
    : 0;

  // Top plats du jour (par quantité).
  const dishCounts = {};
  for (const order of validToday) {
    for (const item of order.items || []) {
      const key = item.name || item.menuItemId || "?";
      dishCounts[key] = (dishCounts[key] || 0) + (item.quantity || 1);
    }
  }
  const topDishes = Object.entries(dishCounts)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  res.json({
    generatedAt: new Date().toISOString(),
    revenueToday: Number(revenue.toFixed(2)),
    ordersToday: validToday.length,
    ordersOnsite: onsite.length,
    ordersDelivery: delivery.length,
    averageBasket: Number(averageBasket.toFixed(2)),
    pendingAcceptance,
    inPreparation,
    ready,
    avgPrepMinutes: Number(avgPrepMinutes.toFixed(1)),
    tables: {
      total: tables.length,
      free: tables.filter((t) => t.status === "FREE").length,
      occupied: tables.filter((t) => t.status !== "FREE").length,
      billRequested: tables.filter((t) => t.status === "BILL_REQUESTED").length,
    },
    lowStock: menuItems.filter((m) => m.isAvailable && m.stock <= 5).map((m) => ({ name: m.name, stock: m.stock })),
    topDishes,
  });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) {
    return;
  }

  const publicError = getPublicError(error);
  errorResponse(res, publicError.status, publicError.message, publicError.code, publicError.details);
});

server.listen(PORT, () => {
  console.log(`SpeedZ backend running on http://localhost:${PORT}`);
});
