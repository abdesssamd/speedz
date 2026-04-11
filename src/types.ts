export type Category = string;
export type Language = "fr" | "ar";
export type Gender = "FEMALE" | "MALE" | "OTHER" | "UNSPECIFIED";
export type AuthMethod = "WHATSAPP" | "SMS";

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type DeliveryTier = {
  label: string;
  maxDistanceKm: number;
  fee: number;
};

export type MenuOptionChoice = {
  id: string;
  name: string;
  priceDelta: number;
};

export type MenuOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  choices: MenuOptionChoice[];
};

export type MenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  badge?: string;
  calories?: number;
  stock?: number;
  isAvailable?: boolean;
  ingredientIds?: string[];
  options: MenuOptionGroup[];
};

export type RestaurantIngredient = {
  id: string;
  restaurantId: string;
  name: string;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  quantityLabel: string;
};

export type RestaurantTable = {
  id: string;
  restaurantId: string;
  label: string;
  seats: number;
  qrValue: string;
};

export type Restaurant = {
  id: string;
  name: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  category: Category;
  shortDescription: string;
  address: string;
  openingHours: string;
  deliveryTime: string;
  rating: number;
  reviewCount: number;
  image: string;
  heroColor: string;
  coordinates: Coordinates;
  tags: string[];
  pointsPerEuro: number;
  validationStatus?: "PENDING" | "VALIDATED" | "REJECTED";
  billingPlanType?: "FIXED_PER_ORDER" | "PERCENTAGE_PER_ORDER" | "MONTHLY_SUBSCRIPTION";
  billingFixedFee?: number | null;
  billingPercentage?: number | null;
  monthlySubscriptionFee?: number | null;
  apiToken?: string | null;
  qrCodeToken?: string | null;
  qrCodeUrl?: string | null;
  validatedAt?: string | null;
  printerLastSeenAt?: string | null;
  menu: MenuItem[];
};

export type RestaurantBillingSummary = {
  restaurantId: string;
  planLabel: string;
  periodLabel: string;
  amountDue: number;
  ordersCount: number;
  projectedNextDue: number;
};

export type RestaurantAccount = {
  restaurantId: string;
  contactName: string;
  contactEmail: string;
  status: "ACTIVE" | "PENDING";
  qrValue: string;
  menuQrValue: string;
  billing: RestaurantBillingSummary;
  ingredients: RestaurantIngredient[];
  tables: RestaurantTable[];
};

export type SelectedOption = {
  groupId: string;
  groupName: string;
  choiceId: string;
  choiceName: string;
  priceDelta: number;
};

export type CartItem = {
  id: string;
  restaurantId: string;
  menuItemId: string;
  name: string;
  image: string;
  quantity: number;
  basePrice: number;
  selectedOptions: SelectedOption[];
  specialInstructions?: string;
};

export type OrderStatus = "Confirmed" | "Preparing" | "On the way" | "Delivered";

export type PaymentMethod = "Card" | "Cash" | "Apple Pay";

export type Order = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discountAmount?: number;
  total: number;
  deliveryDistanceKm: number;
  pointsEarned: number;
  address: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  channel?: "DELIVERY" | "QR_ONSITE";
  tableLabel?: string | null;
  printerPrintedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  status: OrderStatus;
  estimatedDeliveryLabel: string;
  courier?: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    status: string;
    currentLat?: number | null;
    currentLng?: number | null;
  } | null;
};

export type Promotion = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderTotal: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  restaurantId?: string | null;
  usageCount?: number;
};

export type LoyaltyEntry = {
  id: string;
  orderId: string;
  restaurantName: string;
  points: number;
  createdAt: string;
  description: string;
};

export type UserProfile = {
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone: string;
  defaultAddress: string;
  gender?: Gender;
  authMethod?: AuthMethod;
  isPhoneVerified?: boolean;
  onboardingCompleted?: boolean;
};

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
  coordinates?: Coordinates;
};

export type NotificationPreferences = {
  orderUpdates: boolean;
  promotions: boolean;
  loyalty: boolean;
};

export type LocationState = {
  granted: boolean;
  coordinates: Coordinates;
  label: string;
  source: "device" | "fallback";
  errorMessage?: string;
};

export type NotificationTone = "success" | "error" | "info";

export type InAppNotification = {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
};

export type DeliveryQuote = {
  distanceKm: number;
  fee: number;
  tierLabel: string;
  estimatedMinutes: number;
  estimatedLabel: string;
};

export type CartSummary = {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
  deliveryDistanceKm: number;
  deliveryTierLabel: string;
  pointsToEarn: number;
  estimatedDeliveryLabel: string;
  promotion: Promotion | null;
};

export type CheckoutDraft = {
  address: string;
  paymentMethod: PaymentMethod;
  notes: string;
};

export type PartnerApplicationType = "RESTAURANT" | "COURIER";

export type PartnerApplicationInput = {
  type: PartnerApplicationType;
  applicantName: string;
  email: string;
  phone: string;
  city: string;
  businessName?: string;
  restaurantCategory?: string;
  address?: string;
  billingPlanType?: "FIXED_PER_ORDER" | "PERCENTAGE_PER_ORDER" | "MONTHLY_SUBSCRIPTION";
  billingFixedFee?: number | string;
  billingPercentage?: number | string;
  monthlySubscriptionFee?: number | string;
  vehicle?: string;
  zone?: string;
  payPerDelivery?: number | string;
  payPerKm?: number | string;
  notes?: string;
};

export type PartnerApplicationResponse = {
  ok: true;
  applicationId: string;
};

export type CourierCompensation = {
  base: number;
  perKm: number;
  estimatedTotal: number;
};

export type CourierJob = {
  id: string;
  status: string;
  channel: "DELIVERY" | "QR_ONSITE";
  restaurantName: string;
  pickupAddress: string;
  pickupCoordinates?: Coordinates;
  destinationAddress: string;
  destinationCoordinates?: Coordinates;
  deliveryDistanceKm: number;
  pickupDistanceKm?: number | null;
  total: number;
  itemsCount: number;
  createdAt: string;
  compensation: CourierCompensation;
  customer?: {
    name: string;
    phone: string;
    address: string;
  } | null;
};

export type CourierDashboard = {
  courier: {
    id: string;
    name: string;
    phone: string;
    vehicle: string;
    status: string;
    zoneLabel?: string | null;
    currentLat?: number | null;
    currentLng?: number | null;
    activeOrders: number;
    deliveredOrders: number;
    payPerDelivery: number;
    payPerKm: number;
  };
  availableJobs: CourierJob[];
  activeJobs: CourierJob[];
  history: CourierJob[];
};
