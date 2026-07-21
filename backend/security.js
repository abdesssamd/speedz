/**
 * middleware/security.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Regroupe :
 *  1. CORS restrictif avec whitelist
 *  2. Headers de sécurité (Helmet)
 *  3. Validation des entrées avec Zod
 *  4. Rate limiting sur les routes sensibles
 * ─────────────────────────────────────────────────────────────────────────────
 */

const helmet = require("helmet");
const cors = require("cors");
const { z } = require("zod");
const rateLimit = require("express-rate-limit");

// ─────────────────────────────────────────────────────────────────────────────
// 1. CORS — Liste blanche d'origines autorisées
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse les origines autorisées depuis la variable d'environnement.
 * Format : ALLOWED_ORIGINS=https://app.speedz.dz,https://admin.speedz.dz
 *
 * En développement (NODE_ENV !== "production"), on accepte aussi localhost.
 */
const PROD_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEV_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^exp:\/\//,       // Expo Go en développement
];

function isOriginAllowed(origin) {
  // Requêtes sans origin (ex: Postman, appel serveur-à-serveur) — à ajuster selon votre politique
  if (!origin) return process.env.NODE_ENV !== "production";

  if (PROD_ORIGINS.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    return DEV_ORIGINS.some((pattern) => pattern.test(origin));
  }
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origine non autorisée : ${origin}`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Api-Token", "X-Csrf-Token"],
  credentials: true,
  maxAge: 86400, // 24h — cache la réponse preflight
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Headers de sécurité — Helmet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helmet positionne automatiquement :
 *  - Content-Security-Policy
 *  - X-Frame-Options: DENY
 *  - X-Content-Type-Options: nosniff
 *  - Strict-Transport-Security (HSTS)
 *  - Referrer-Policy
 *  - X-XSS-Protection
 *  - Permissions-Policy
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],    // nécessaire pour la page QR HTML inline
      imgSrc: ["'self'", "data:", "https:"],       // images externes autorisées (menus, restaurants)
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,           // 1 an
    includeSubDomains: true,
    preload: true,
  },
  // Désactiver en dev si vous utilisez ngrok ou un proxy HTTP
  ...(process.env.NODE_ENV !== "production" && { hsts: false }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Limites strictes sur les routes d'authentification pour empêcher :
 *  - Le flood WhatsApp (request-code)
 *  - Le brute-force OTP (verify-code) — 1 million combinaisons en quelques s
 */
const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,  // fenêtre de 10 minutes
  max: 5,                      // 5 tentatives max par IP par fenêtre
  standardHeaders: true,       // Retourne `RateLimit-*` headers (RFC 6585)
  legacyHeaders: false,
  message: {
    message: "Trop de tentatives. Réessayez dans 10 minutes.",
    retryAfter: 600,
  },
  skipSuccessfulRequests: false,
});

/**
 * Limite plus souple pour les routes API générales
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 300,                    // 300 req/min par IP (par IP réelle grâce à trust proxy)
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes. Ralentissez." },
  // Exclut les fichiers statiques, les endpoints de polling de l'agent d'impression
  // (orders/heartbeat interrogés en boucle) et les lectures publiques du menu QR,
  // qui sont légitimement à haute fréquence et ne doivent pas déclencher de 429.
  skip: (req) => {
    const p = req.path;
    if (p.startsWith("/uploads")) return true;
    if (p.startsWith("/api/restaurant/printer/")) return true;
    if (p === "/api/restaurant/orders" || p === "/api/restaurant/billing" || p === "/api/restaurant/menu") return true;
    if (req.method === "GET" && p.startsWith("/api/public/qr/")) return true;
    return false;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Schémas de validation Zod
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schémas réutilisables pour les champs communs
 */
const Shared = {
  phone: z.string()
    .min(8, "Numéro trop court")
    .max(20, "Numéro trop long")
    .regex(/^\+?[\d\s\-()]+$/, "Format téléphone invalide"),

  email: z.string()
    .email("Email invalide")
    .max(254, "Email trop long")
    .toLowerCase(),

  otp: z.string()
    .length(6, "Le code OTP doit avoir exactement 6 chiffres")
    .regex(/^\d{6}$/, "Le code OTP doit être numérique"),

  nonEmptyString: z.string().min(1, "Champ requis").max(500, "Valeur trop longue").trim(),

  positiveNumber: z.number().positive("Doit être positif"),

  uuid: z.string().min(1, "ID requis"),
};

/**
 * Schémas par endpoint
 */
const Schemas = {
  // POST /api/auth/request-code
  requestCode: z.object({
    phone: Shared.phone,
    method: z.enum(["WHATSAPP", "SMS"]).optional().default("WHATSAPP"),
  }),

  // POST /api/auth/request-email-code
  requestEmailCode: z.object({
    email: Shared.email,
    fullName: z.string().max(100).optional().default(""),
  }),

  // POST /api/auth/verify-code
  verifyCode: z.object({
    challengeId: Shared.uuid,
    code: Shared.otp,
  }),

  // POST /api/auth/verify-email-code
  verifyEmailCode: z.object({
    challengeId: Shared.uuid,
    code: Shared.otp,
    email: Shared.email,
    fullName: z.string().min(2, "Nom requis").max(100),
    phone: Shared.phone,
  }),

  // POST /api/auth/register-profile
  registerProfile: z.object({
    challengeId: Shared.uuid,
    firstName: z.string().min(1).max(50).trim(),
    lastName: z.string().min(1).max(50).trim(),
    gender: z.enum(["FEMALE", "MALE", "OTHER", "UNSPECIFIED"]).optional().default("UNSPECIFIED"),
    email: Shared.email.optional(),
    addresses: z.array(
      z.object({
        label: z.string().min(1).max(100),
        address: z.string().min(5).max(300),
        coordinates: z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }).optional(),
      })
    ).min(1, "Au moins une adresse est requise"),
  }),

  // POST /api/auth/login
  login: z.object({
    email: Shared.email,
    password: z.string().min(6, "Mot de passe trop court").max(200),
  }),

  updateAdminProfile: z.object({
    firstName: z.string().min(1).max(50).trim(),
    lastName: z.string().min(1).max(50).trim(),
    name: z.string().min(2).max(120).trim(),
    email: Shared.email,
    phone: Shared.phone.optional().or(z.literal("")).nullable(),
  }),

  updateAdminPassword: z.object({
    currentPassword: z.string().min(6).max(200),
    newPassword: z.string().min(8).max(200),
  }),

  // POST /api/cart/quote
  cartQuote: z.object({
    restaurantId: Shared.nonEmptyString,
    cart: z.array(z.object({
      menuItemId: z.string().min(1),
      name: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
      basePrice: z.number().min(0),
      selectedOptions: z.array(z.object({
        groupId: z.string(),
        groupName: z.string(),
        choiceId: z.string(),
        choiceName: z.string(),
        priceDelta: z.number(),
      })).optional().default([]),
    })).min(1, "Panier vide"),
    userCoordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    promoCode: z.string().max(30).optional(),
    orderChannel: z.enum(["DELIVERY", "QR_ONSITE"]).optional(),
  }),

  // POST /api/orders
  createOrder: z.object({
    restaurantId: Shared.nonEmptyString,
    cart: z.array(z.object({
      menuItemId: z.string().min(1),
      name: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
      basePrice: z.number().min(0).max(100000),
      selectedOptions: z.array(z.object({
        groupId: z.string(),
        groupName: z.string(),
        choiceId: z.string(),
        choiceName: z.string(),
        priceDelta: z.number(),
      })).optional().default([]),
    })).min(1),
    draft: z.object({
      address: z.string().min(5).max(400),
      paymentMethod: z.enum(["Cash", "Card", "Online"]),
      notes: z.string().max(500).optional(),
    }),
    userCoordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    promoCode: z.string().max(30).optional(),
    orderChannel: z.enum(["DELIVERY", "QR_ONSITE"]).optional(),
    tableLabel: z.string().max(50).optional(),
  }),

  // POST /api/applications
  createApplication: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("RESTAURANT"),
      applicantName: z.string().min(2).max(100).trim(),
      email: Shared.email,
      phone: Shared.phone,
      city: z.string().min(2).max(100),
      businessName: z.string().min(2).max(200),
      restaurantCategory: z.string().min(1).max(100),
      address: z.string().min(5).max(300),
      // Plan de facturation défini par l'admin dans le back-office, pas à l'inscription.
      billingPlanType: z.enum(["FIXED_PER_ORDER", "PERCENTAGE_PER_ORDER", "MONTHLY_SUBSCRIPTION"]).optional().default("FIXED_PER_ORDER"),
      billingFixedFee: z.number().min(0).optional(),
      billingPercentage: z.number().min(0).max(100).optional(),
      monthlySubscriptionFee: z.number().min(0).optional(),
      notes: z.string().max(1000).optional(),
    }),
    z.object({
      type: z.literal("COURIER"),
      applicantName: z.string().min(2).max(100).trim(),
      email: Shared.email,
      phone: Shared.phone,
      city: z.string().min(2).max(100),
      vehicle: z.string().min(2).max(100),
      zone: z.string().max(100).optional(),
      // Mot de passe choisi à l'inscription (hashé côté serveur, jamais stocké en clair).
      password: z.string().min(6).max(100).optional(),
      payPerDelivery: z.number().min(0).optional(),
      payPerKm: z.number().min(0).optional(),
      notes: z.string().max(1000).optional(),
    }),
  ]),

  // POST /api/courier/auth — connexion livreur : téléphone + mot de passe
  courierAuth: z.object({
    phone: Shared.phone,
    password: z.string().min(6).max(100),
  }),

  // POST /api/admin/notifications/push — campagne push admin
  // Cibles : ALL, CLIENTS, COURIERS, CLIENT (un client précis via userId),
  // COURIER_ZONE (les livreurs d'une zone via zoneLabel).
  adminPushNotification: z
    .object({
      audience: z.enum(["ALL", "CLIENTS", "COURIERS", "CLIENT", "COURIER_ZONE"]),
      title: z.string().min(2).max(100).trim(),
      body: z.string().min(2).max(300).trim(),
      userId: z.string().min(1).max(64).optional(),
      zoneLabel: z.string().min(1).max(100).optional(),
    })
    .refine((data) => data.audience !== "CLIENT" || !!data.userId, {
      message: "userId requis pour cibler un client précis",
      path: ["userId"],
    })
    .refine((data) => data.audience !== "COURIER_ZONE" || !!data.zoneLabel, {
      message: "zoneLabel requis pour cibler une zone",
      path: ["zoneLabel"],
    }),

  // POST /api/admin/promotions
  createPromotion: z.object({
    code: z.string().min(3).max(30).trim().toUpperCase(),
    title: z.string().min(3).max(100).trim(),
    description: z.string().max(300).optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]),
    value: z.number().min(0).max(100000),
    minOrderTotal: z.number().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
    startsAt: z.string().datetime({ message: "Date de début invalide (format ISO 8601 requis)" }),
    endsAt: z.string().datetime({ message: "Date de fin invalide" }),
    restaurantId: z.string().optional().nullable(),
  }).refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endsAt"],
  }),

  // POST /api/admin/couriers
  createCourier: z.object({
    name: z.string().min(2).max(100).trim(),
    phone: Shared.phone,
    vehicle: z.string().min(2).max(100),
    status: z.enum(["AVAILABLE", "ON_DELIVERY", "OFFLINE"]).optional(),
    payPerDelivery: z.number().min(0).optional(),
    payPerKm: z.number().min(0).optional(),
    zoneLabel: z.string().max(100).optional(),
    // Rattachement à un restaurant (livreur propre). Absent/null = flotte SpeedZ.
    restaurantId: z.string().nullable().optional(),
  }),

  // Admin: update menu item
  updateMenuItem: z.object({
    name: z.string().min(1).max(200).trim().optional(),
    description: z.string().max(1000).optional(),
    price: z.number().min(0).max(100000).optional(),
    category: z.string().max(100).optional(),
    image: z.string().max(2000).optional(),
    badge: z.string().max(50).nullable().optional(),
    calories: z.number().int().nullable().optional(),
    stock: z.number().int().min(0).optional(),
    isAvailable: z.boolean().optional(),
    options: z.array(z.unknown()).optional(),
  }),

  // Admin: create/update menu category
  createMenuCategory: z.object({
    name: z.string().min(1).max(100).trim(),
    sortOrder: z.number().int().min(0).optional().default(0),
    isActive: z.boolean().optional().default(true),
  }),

  updateMenuCategory: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),

  // Admin: update courier
  updateCourier: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    phone: Shared.phone.optional(),
    vehicle: z.string().min(2).max(100).optional(),
    status: z.enum(["AVAILABLE", "ON_DELIVERY", "OFFLINE"]).optional(),
    payPerDelivery: z.number().min(0).optional(),
    payPerKm: z.number().min(0).optional(),
    zoneLabel: z.string().max(100).nullable().optional(),
    restaurantId: z.string().nullable().optional(),
    currentLat: z.number().nullable().optional(),
    currentLng: z.number().nullable().optional(),
  }),

  // Admin: update customer
  updateCustomer: z.object({
    name: z.string().min(1).max(200).trim().optional(),
    email: Shared.email.optional(),
    phone: Shared.phone.optional(),
    defaultAddress: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
  }),

  // Admin: update promotion
  updatePromotion: z.object({
    code: z.string().min(3).max(30).trim().toUpperCase().optional(),
    title: z.string().min(3).max(100).trim().optional(),
    description: z.string().max(300).nullable().optional(),
    type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
    value: z.number().min(0).max(100000).optional(),
    minOrderTotal: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime({ message: "Date de debut invalide" }).optional(),
    endsAt: z.string().datetime({ message: "Date de fin invalide" }).optional(),
    restaurantId: z.string().nullable().optional(),
  }),

  // Admin: configuration de livraison (au km ou par zone)
  // Admin: programme de fidélité global (points administrés par l'admin)
  loyaltyConfig: z.object({
    enabled: z.boolean(),
    pointsPerEuro: z.number().min(0).max(1000),
    minOrderTotal: z.number().min(0).max(100000),
  }),

  deliveryConfig: z.object({
    mode: z.enum(["PER_KM", "PER_ZONE"]),
    perKm: z.object({
      baseFee: z.number().min(0).max(100000),
      pricePerKm: z.number().min(0).max(100000),
      freeUnderKm: z.number().min(0).max(1000),
    }),
    zones: z.array(z.object({
      label: z.string().min(1).max(60),
      maxDistanceKm: z.number().min(0).max(100000),
      fee: z.number().min(0).max(100000),
    })).min(1, "Au moins une zone est requise").max(12),
  }),

  // Emplacements de publicité : app client (SPLASH, HOME_BANNER) et app livreur
  // (COURIER_SPLASH, COURIER_BANNER).
  // Admin: create ad (publicité)
  createAd: z.object({
    title: z.string().min(2).max(120).trim(),
    imageUrl: z.string().min(5).max(2000),
    placement: z.enum(["SPLASH", "HOME_BANNER", "COURIER_SPLASH", "COURIER_BANNER"]),
    isActive: z.boolean().optional().default(true),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    restaurantId: z.string().nullable().optional(),
  }),

  // Admin: update ad
  updateAd: z.object({
    title: z.string().min(2).max(120).trim().optional(),
    imageUrl: z.string().min(5).max(2000).optional(),
    placement: z.enum(["SPLASH", "HOME_BANNER", "COURIER_SPLASH", "COURIER_BANNER"]).optional(),
    isActive: z.boolean().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    restaurantId: z.string().nullable().optional(),
  }),

  // POS: synchronisation du menu depuis le logiciel de caisse (caisse → SpeedZ)
  syncMenu: z.object({
    categories: z
      .array(
        z.object({
          name: z.string().min(1).max(100).trim(),
          sortOrder: z.number().int().min(0).optional(),
          isActive: z.boolean().optional(),
        })
      )
      .optional(),
    items: z
      .array(
        z.object({
          externalId: z.union([z.string(), z.number()]).transform((v) => String(v)),
          name: z.string().min(1).max(200).trim(),
          description: z.string().max(1000).optional(),
          price: z.coerce.number().min(0).max(1000000),
          category: z.string().max(100).optional(),
          image: z.string().max(2000).optional(),
          isAvailable: z.boolean().optional(),
          stock: z.coerce.number().int().min(0).optional(),
          deleted: z.boolean().optional(),
        })
      )
      .max(2000),
  }),

  // Admin: enregistrer un versement d'un restaurant
  createSettlement: z.object({
    amount: z.coerce.number().positive("Montant invalide").max(10000000),
    method: z.string().max(60).trim().optional(),
    note: z.string().max(500).trim().optional(),
    paidAt: z.string().datetime().optional(),
  }),

  // Admin: update order status
  updateOrderStatus: z.object({
    status: z.string().min(1, "Statut requis"),
    reason: z.string().max(500).optional(),
  }),

  // Admin: assign courier to order
  assignCourier: z.object({
    courierId: z.string().nullable(),
  }),

  // ─── Portail restaurateur (web) ─────────────────────────────────────────────
  // Création/màj d'un plat depuis l'espace restaurant.
  portalMenuItem: z.object({
    name: z.string().min(1).max(200).trim(),
    description: z.string().max(1000).optional().default(""),
    price: z.number().min(0).max(100000),
    category: z.string().min(1).max(100),
    image: z.string().max(2000).optional().default(""),
    badge: z.string().max(50).nullable().optional(),
    calories: z.number().int().nullable().optional(),
    stock: z.number().int().min(0).optional().default(0),
    isAvailable: z.boolean().optional().default(true),
    options: z.array(z.unknown()).optional().default([]),
  }),

  // Transition de statut d'une commande côté restaurant (KDS).
  portalOrderStatus: z.object({
    status: z.enum(["Accepted", "Preparing", "Ready", "OnTheWay", "Delivered", "Cancelled"]),
    reason: z.string().max(500).optional(),
  }),

  // Création/màj d'une table (plan de salle).
  createTable: z.object({
    label: z.string().min(1).max(40).trim(),
    zone: z.string().max(60).nullable().optional(),
    seats: z.number().int().min(1).max(50).optional().default(2),
    sortOrder: z.number().int().min(0).optional().default(0),
  }),

  updateTable: z.object({
    label: z.string().min(1).max(40).trim().optional(),
    zone: z.string().max(60).nullable().optional(),
    seats: z.number().int().min(1).max(50).optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),

  tableStatus: z.object({
    status: z.enum(["FREE", "OCCUPIED", "ORDER_IN_PROGRESS", "BILL_REQUESTED"]),
  }),

  // Édition du profil restaurant depuis le portail.
  portalProfile: z.object({
    shortDescription: z.string().max(500).optional(),
    openingHours: z.string().max(120).optional(),
    deliveryTime: z.string().max(60).optional(),
    address: z.string().max(300).optional(),
    ownerPhone: z.string().max(40).nullable().optional(),
    image: z.string().max(2000).optional(),
    heroColor: z.string().max(30).optional(),
    weeklyHours: z
      .record(
        z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
        z.object({
          closed: z.boolean().optional().default(false),
          open: z.string().max(5).optional(),
          close: z.string().max(5).optional(),
        })
      )
      .optional(),
  }),

  renameCategory: z.object({
    from: z.string().min(1).max(100),
    to: z.string().min(1).max(100).trim(),
  }),

  reorderCategories: z.object({
    order: z.array(z.string().min(1).max(100)).max(100),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Middleware de validation — factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crée un middleware Express qui valide req.body contre un schéma Zod.
 *
 * En cas d'échec :
 *  - Retourne 422 avec la liste des erreurs formatées
 *
 * En cas de succès :
 *  - Remplace req.body par les données parsées/transformées (trimmed, lowercased…)
 *
 * @param {z.ZodSchema} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      return res.status(422).json({
        message: "Données invalides.",
        errors,
      });
    }
    // Remplace req.body par les données nettoyées (trimmed, types coercés, etc.)
    req.body = result.data;
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Middlewares applicables globalement
  corsMiddleware: cors(corsOptions),
  helmetMiddleware: helmet(helmetOptions),
  apiRateLimiter,
  authRateLimiter,

  // Factory de validation
  validateBody,

  // Schémas exportés (utiles pour les tests)
  Schemas,
};
