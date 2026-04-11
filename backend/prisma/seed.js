require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const defaultMenuCategories = [
  { name: "Burgers", sortOrder: 1 },
  { name: "Pizza", sortOrder: 2 },
  { name: "Sushi", sortOrder: 3 },
  { name: "Healthy", sortOrder: 4 },
  { name: "Desserts", sortOrder: 5 },
  { name: "Drinks", sortOrder: 6 },
];

const restaurants = [
  {
    id: "r1",
    name: "Smash & Melt",
    category: "Burgers",
    shortDescription: "Burgers smash, sauces maison et accompagnements minute.",
    address: "22 Rue du Faubourg Montmartre, 75009 Paris",
    openingHours: "11:30 - 23:00",
    deliveryTime: "18-28 min",
    rating: 4.8,
    reviewCount: 482,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    heroColor: "#F97316",
    latitude: 48.8729,
    longitude: 2.3436,
    tags: ["Best-seller", "Livraison rapide", "Nouveau pain brioche"],
    pointsPerEuro: 9,
    ownerName: "Julie Martin",
    ownerEmail: "julie@smashmelt.test",
    ownerPhone: "+33 6 10 20 30 40",
    validationStatus: "VALIDATED",
    billingPlanType: "FIXED_PER_ORDER",
    billingFixedFee: 1.8,
    apiToken: "fd_restaurant_r1_seed",
    qrCodeToken: "qr_r1_seed",
    validatedAt: new Date("2026-01-10T09:00:00.000Z"),
    menuItems: [
      {
        id: "m1",
        name: "Double Smash Signature",
        description: "Deux steaks de boeuf, cheddar, pickles, oignons confits et sauce smoke.",
        price: 13.9,
        category: "Burgers",
        image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80",
        badge: "Top vente",
        calories: 780,
        stock: 24,
        isAvailable: true,
        options: [
          {
            id: "bread",
            name: "Pain",
            required: true,
            multiple: false,
            choices: [
              { id: "classic-bun", name: "Bun classique", priceDelta: 0 },
              { id: "brioche", name: "Brioche", priceDelta: 1 }
            ]
          }
        ]
      },
      {
        id: "m2",
        name: "Chicken Crunch Deluxe",
        description: "Poulet croustillant, salade iceberg, pickles et mayo pimentee.",
        price: 12.5,
        category: "Burgers",
        image: "https://images.unsplash.com/photo-1606755962773-0f1ed1b1c5e8?auto=format&fit=crop&w=900&q=80",
        badge: "Epice",
        calories: 690,
        stock: 17,
        isAvailable: true,
        options: []
      }
    ]
  },
  {
    id: "r2",
    name: "Casa Napoli",
    category: "Pizza",
    shortDescription: "Pizzas napolitaines au feu de bois et ingredients italiens.",
    address: "7 Rue de Chateaudun, 75009 Paris",
    openingHours: "12:00 - 22:45",
    deliveryTime: "24-35 min",
    rating: 4.7,
    reviewCount: 368,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    heroColor: "#DC2626",
    latitude: 48.8751,
    longitude: 2.3401,
    tags: ["Cuisson bois", "1 pizza achetee = 2x points mardi"],
    pointsPerEuro: 11,
    ownerName: "Marco Rossi",
    ownerEmail: "marco@casanapoli.test",
    ownerPhone: "+33 6 20 30 40 50",
    validationStatus: "VALIDATED",
    billingPlanType: "PERCENTAGE_PER_ORDER",
    billingPercentage: 12,
    apiToken: "fd_restaurant_r2_seed",
    qrCodeToken: "qr_r2_seed",
    validatedAt: new Date("2026-01-11T09:00:00.000Z"),
    menuItems: [
      {
        id: "m3",
        name: "Margherita Premium",
        description: "Sauce San Marzano, mozzarella fior di latte, basilic frais.",
        price: 12.9,
        category: "Pizza",
        image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=900&q=80",
        badge: "Classique",
        calories: 860,
        stock: 19,
        isAvailable: true,
        options: []
      }
    ]
  },
  {
    id: "r3",
    name: "Sushi Atelier",
    category: "Sushi",
    shortDescription: "Plateaux frais, rolls signatures et sauces premium.",
    address: "31 Rue La Fayette, 75009 Paris",
    openingHours: "11:45 - 22:30",
    deliveryTime: "28-38 min",
    rating: 4.9,
    reviewCount: 521,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80",
    heroColor: "#0F766E",
    latitude: 48.8754,
    longitude: 2.3457,
    tags: ["Poisson du jour", "Note 4.9"],
    pointsPerEuro: 12,
    ownerName: "Aya Nakamura",
    ownerEmail: "aya@sushiatelier.test",
    ownerPhone: "+33 6 30 40 50 60",
    validationStatus: "VALIDATED",
    billingPlanType: "MONTHLY_SUBSCRIPTION",
    monthlySubscriptionFee: 199,
    apiToken: "fd_restaurant_r3_seed",
    qrCodeToken: "qr_r3_seed",
    validatedAt: new Date("2026-01-12T09:00:00.000Z"),
    menuItems: [
      {
        id: "m5",
        name: "Salmon Lovers Box",
        description: "Assortiment de sashimi, nigiri et california au saumon.",
        price: 19.5,
        category: "Sushi",
        image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&w=900&q=80",
        badge: "Premium",
        calories: 540,
        stock: 14,
        isAvailable: true,
        options: []
      }
    ]
  },
  {
    id: "r4",
    name: "Green Bowl Lab",
    category: "Healthy",
    shortDescription: "Bowls frais, protein-rich et desserts legerement sucres.",
    address: "55 Rue des Martyrs, 75009 Paris",
    openingHours: "10:30 - 21:30",
    deliveryTime: "16-24 min",
    rating: 4.6,
    reviewCount: 214,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
    heroColor: "#16A34A",
    latitude: 48.8827,
    longitude: 2.3382,
    tags: ["Healthy", "Vegetarien friendly", "Moins de 25 min"],
    pointsPerEuro: 8,
    ownerName: "Leila Bernard",
    ownerEmail: "leila@greenbowl.test",
    ownerPhone: "+33 6 40 50 60 70",
    validationStatus: "VALIDATED",
    billingPlanType: "FIXED_PER_ORDER",
    billingFixedFee: 1.25,
    apiToken: "fd_restaurant_r4_seed",
    qrCodeToken: "qr_r4_seed",
    validatedAt: new Date("2026-01-13T09:00:00.000Z"),
    menuItems: [
      {
        id: "m7",
        name: "Power Protein Bowl",
        description: "Riz complet, legumes croquants, avocat, edamame et sauce sesame.",
        price: 14.4,
        category: "Healthy",
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
        badge: "Healthy",
        calories: 520,
        stock: 11,
        isAvailable: true,
        options: []
      }
    ]
  }
];

async function main() {
  const adminPasswordHash = await bcrypt.hash("admin1234", 10);
  const customerPasswordHash = await bcrypt.hash("client1234", 10);

  await prisma.loyaltyEntry.deleteMany();
  await prisma.authChallenge.deleteMany();
  await prisma.userAddress.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.courier.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.user.deleteMany();

  for (const restaurant of restaurants) {
    const { menuItems, ...restaurantData } = restaurant;
    await prisma.restaurant.create({
      data: {
        ...restaurantData,
        tags: restaurantData.tags,
        menuItems: {
          create: menuItems.map((item) => ({
            ...item,
            options: item.options,
          })),
        },
      },
    });
  }

  const customer = await prisma.user.create({
    data: {
      email: "nina.morel@demo.app",
      passwordHash: customerPasswordHash,
      firstName: "Nina",
      lastName: "Morel",
      name: "Nina Morel",
      phone: "+33 6 24 15 88 19",
      defaultAddress: "12 Rue des Martyrs, 75009 Paris",
      gender: "FEMALE",
      authProvider: "WHATSAPP",
      phoneVerifiedAt: new Date("2026-01-05T12:00:00.000Z"),
      role: "CUSTOMER",
      notificationsOrderUpdates: false,
      notificationsPromotions: false,
      notificationsLoyalty: false,
    },
  });

  await prisma.userAddress.createMany({
    data: [
      {
        userId: customer.id,
        label: "Maison",
        address: "12 Rue des Martyrs, 75009 Paris",
        latitude: 48.8794,
        longitude: 2.3376,
        isDefault: true,
      },
      {
        userId: customer.id,
        label: "Bureau",
        address: "18 Boulevard Haussmann, 75009 Paris",
        latitude: 48.8739,
        longitude: 2.3322,
        isDefault: false,
      },
    ],
  });

  await prisma.favorite.create({
    data: {
      userId: customer.id,
      restaurantId: "r1",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@fooddelyvry.app",
      passwordHash: adminPasswordHash,
      firstName: "Admin",
      lastName: "FoodDelyvry",
      name: "Admin FoodDelyvry",
      role: "ADMIN",
      phone: "+33 1 00 00 00 00",
      defaultAddress: "Backoffice Paris",
      notificationsOrderUpdates: false,
      notificationsPromotions: false,
      notificationsLoyalty: false,
    },
  });

  await prisma.courier.createMany({
    data: [
      {
        name: "Yassine Benali",
        phone: "+33 6 11 22 33 44",
        vehicle: "Scooter",
        status: "AVAILABLE",
        payPerDelivery: 3.5,
        payPerKm: 0.85,
        currentLat: 48.875,
        currentLng: 2.341,
        zoneLabel: "Paris 9",
      },
      {
        name: "Sara Haddad",
        phone: "+33 6 55 66 77 88",
        vehicle: "Moto",
        status: "ON_DELIVERY",
        payPerDelivery: 4,
        payPerKm: 0.95,
        currentLat: 48.879,
        currentLng: 2.337,
        zoneLabel: "Paris Centre",
      },
    ],
  });

  await prisma.promotion.createMany({
    data: [
      {
        code: "WELCOME10",
        title: "Bienvenue -10%",
        description: "Reduction de bienvenue sur la premiere commande",
        type: "PERCENTAGE",
        value: 10,
        minOrderTotal: 20,
        isActive: true,
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-31T23:59:59.000Z"),
      },
      {
        code: "BURGER5",
        title: "5 EUR sur Smash & Melt",
        description: "Reduction fixe pour commandes burger",
        type: "FIXED",
        value: 5,
        minOrderTotal: 25,
        isActive: true,
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-12-31T23:59:59.000Z"),
        restaurantId: "r1",
      },
    ],
  });

  await prisma.menuCategory.createMany({
    data: defaultMenuCategories,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
