import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { AdminDialog } from "./components/AdminDialog";
import "./index.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4100").replace(/\/$/, "");
const WS_URL = API_URL.replace(/^http/i, "ws");
const brandLogoUrl = "/logo.png";
const translations = {
  fr: {
    dashboard_admin: "Dashboard Admin",
    login_title: "FoodDelyvry Control Room",
    login_subtitle: "Connexion JWT vers le backend Node.js, PostgreSQL et Prisma.",
    email: "Email",
    password: "Mot de passe",
    login: "Se connecter",
    seed_account: "Compte seed admin",
    operations_center: "Operations Center",
    sidebar_copy: "Pilotage des restaurants, menus et commandes en temps reel.",
    overview: "Vue d'ensemble",
    restaurants: "Restaurants",
    orders: "Commandes",
    customers_nav: "Clients",
    couriers_nav: "Livreurs",
    applications_nav: "Demandes",
    categories_nav: "Categories repas",
    promotions_nav: "Promotions",
    reports_nav: "Rapports",
    new_restaurant: "Nouveau restaurant",
    logout: "Deconnexion",
    dashboard: "Tableau de bord",
    hero_title: "Interface admin plus fluide et plus organisee",
    hero_subtitle: "Vue synthese, edition rapide des restaurants, gestion des menus et suivi des commandes.",
    refresh: "Actualiser",
    add_restaurant: "Ajouter un restaurant",
    language: "Langue",
    french: "Francais",
    arabic: "العربية",
    summary: "Resume operationnel",
    summary_subtitle: "Lecture rapide de l'etat de la plateforme.",
    active_restaurant: "Restaurant actif",
    delivered_orders: "Commandes livrees",
    preparing: "En preparation",
    on_the_way: "En route",
    none: "Aucun",
    restaurant_catalog: "Catalogue restaurants",
    restaurant_catalog_subtitle: "Selection rapide, recherche et visualisation claire du parc actif.",
    search_restaurant: "Rechercher un restaurant...",
    no_restaurant_selected: "Aucun restaurant selectionne",
    no_restaurant_selected_msg: "Choisissez un restaurant dans la colonne de gauche pour l'editer.",
    current_menu: "Menu actuel",
    dishes: "plats",
    edit: "Modifier",
    new_dish: "Nouveau plat",
    edit_dish: "Modifier le plat",
    save_changes: "Enregistrer les changements",
    orders_flow: "Flux commandes",
    orders_flow_subtitle: "Suivi du pipeline en preparation, en route et livre.",
    no_order_filter: "Aucune commande pour ce filtre",
    no_order_filter_msg: "Essayez un autre statut ou actualisez les donnees.",
    popup: "Popup",
    close: "Fermer",
    short_description: "Description courte",
    address: "Adresse",
    hours: "Horaires",
    latitude: "Latitude",
    longitude: "Longitude",
    tags: "Tags separes par des virgules",
    weekly_schedule: "Horaires de la semaine",
    closed: "Ferme",
    publish_restaurant: "Publier le restaurant",
    category: "Categorie",
    name: "Nom",
    description: "Description",
    base_preparation: "Base preparation",
    dish_name: "Nom du plat",
    dish_category: "Categorie du repas",
    item_options: "Options du repas",
    option_group_name: "Nom du groupe",
    option_required: "Obligatoire",
    option_multiple: "Choix multiples",
    add_option_group: "Ajouter un groupe d'options",
    add_option_choice: "Ajouter un choix",
    choice_name: "Nom du choix",
    price_delta: "Supplement prix",
    option_config_hint: "Configurez chaque groupe: obligatoire ou multiple, puis ajoutez les choix avec leur supplement en DA.",
    option_choice_hint: "Exemple: Taille, Sauce, Supplements",
    choice_price_hint: "Supplement en DA",
    remove_group: "Supprimer le groupe",
    remove_choice: "Supprimer le choix",
    price: "Prix",
    badge: "Badge",
    calories: "Calories",
    menu_photo: "Photo du plat",
    add_to_menu: "Ajouter au menu",
    update_dish: "Mettre a jour le plat",
    delete_dish: "Supprimer le plat",
    in_stock: "Stock",
    availability: "Disponibilite",
    available: "Disponible",
    unavailable: "Indisponible",
    customers_title: "Comptes clients",
    couriers_title: "Gestion des livreurs",
    create_courier: "Ajouter un livreur",
    applications_title: "Demandes d'inscription",
    applications_subtitle: "Candidatures restaurants et livreurs envoyees depuis l'application.",
    pending: "En attente",
    accepted: "Acceptee",
    rejected: "Refusee",
    contact: "Contacter",
    linked_entity: "Entite creee",
    open_created_restaurant: "Ouvrir le restaurant cree",
    activate_restaurant: "Convertir en restaurant actif",
    draft_restaurant: "Restaurant brouillon",
    email_notifications: "Notifications email",
    no_applications: "Aucune demande pour le moment",
    categories_title: "Categories des repas",
    create_category: "Ajouter une categorie",
    category_name: "Nom de la categorie",
    sort_order: "Ordre d'affichage",
    no_categories: "Aucune categorie",
    phone: "Telephone",
    vehicle: "Vehicule",
    scooter: "Moto",
    car: "Voiture",
    ebike: "Velo electrique",
    zone: "Zone",
    promotions_title: "Promotions et reductions",
    reports_title: "Rapports et statistiques avancees",
    create_promotion: "Creer une promotion",
    code: "Code",
    title: "Titre",
    value: "Valeur",
    min_order: "Commande minimum",
    starts_at: "Debut",
    ends_at: "Fin",
    percentage: "Pourcentage",
    fixed: "Montant fixe",
    assign_courier: "Assigner livreur",
    active: "Actif",
    inactive: "Inactif",
    average_basket: "Panier moyen",
    low_stock: "Stocks faibles",
    operations_modules: "Modules operationnels",
    operations_modules_subtitle: "Vue rapide des grands domaines de gestion de la plateforme.",
    logistics: "Logistique",
    finance: "Finance",
    customers: "Clients",
    inventory: "Inventaire",
    promotions: "Promotions",
    active_promotions: "promotions actives",
    tracked_deliveries: "livraisons suivies",
    customer_accounts: "comptes clients",
    inventory_items: "articles en catalogue",
    all: "Tous",
    delivered: "Livrees",
    confirmed: "Confirmee",
  },
  ar: {
    dashboard_admin: "لوحة الإدارة",
    login_title: "غرفة تحكم FoodDelyvry",
    login_subtitle: "اتصال JWT مع Backend Node.js و PostgreSQL و Prisma.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    login: "تسجيل الدخول",
    seed_account: "حساب الإدارة التجريبي",
    operations_center: "مركز العمليات",
    sidebar_copy: "إدارة المطاعم والقوائم والطلبات في الوقت الحقيقي.",
    overview: "نظرة عامة",
    restaurants: "المطاعم",
    orders: "الطلبات",
    customers_nav: "العملاء",
    couriers_nav: "الموصلون",
    applications_nav: "طلبات الانضمام",
    categories_nav: "فئات الوجبات",
    promotions_nav: "العروض",
    reports_nav: "التقارير",
    new_restaurant: "مطعم جديد",
    logout: "تسجيل الخروج",
    dashboard: "لوحة التحكم",
    hero_title: "واجهة إدارة أكثر سلاسة وتنظيما",
    hero_subtitle: "عرض سريع، تعديل المطاعم، إدارة القوائم ومتابعة الطلبات.",
    refresh: "تحديث",
    add_restaurant: "إضافة مطعم",
    language: "اللغة",
    french: "Francais",
    arabic: "العربية",
    summary: "الملخص التشغيلي",
    summary_subtitle: "قراءة سريعة لحالة المنصة.",
    active_restaurant: "المطعم النشط",
    delivered_orders: "الطلبات المسلمة",
    preparing: "قيد التحضير",
    on_the_way: "في الطريق",
    none: "لا يوجد",
    restaurant_catalog: "كتالوج المطاعم",
    restaurant_catalog_subtitle: "اختيار سريع وبحث وعرض واضح للمطاعم النشطة.",
    search_restaurant: "ابحث عن مطعم...",
    no_restaurant_selected: "لم يتم اختيار مطعم",
    no_restaurant_selected_msg: "اختر مطعما من العمود الأيسر لتعديله.",
    current_menu: "القائمة الحالية",
    dishes: "أطباق",
    edit: "تعديل",
    new_dish: "طبق جديد",
    edit_dish: "تعديل الطبق",
    save_changes: "حفظ التغييرات",
    orders_flow: "تدفق الطلبات",
    orders_flow_subtitle: "متابعة التحضير والتوصيل والتسليم.",
    no_order_filter: "لا توجد طلبات لهذا الفلتر",
    no_order_filter_msg: "جرّب حالة أخرى أو حدّث البيانات.",
    popup: "نافذة",
    close: "إغلاق",
    short_description: "وصف قصير",
    address: "العنوان",
    hours: "ساعات العمل",
    latitude: "خط العرض",
    longitude: "خط الطول",
    tags: "الوسوم مفصولة بفواصل",
    weekly_schedule: "ساعات العمل خلال الأسبوع",
    closed: "مغلق",
    publish_restaurant: "نشر المطعم",
    category: "الفئة",
    name: "الاسم",
    description: "الوصف",
    base_preparation: "وقت التحضير الأساسي",
    dish_name: "اسم الطبق",
    dish_category: "فئة الوجبة",
    item_options: "خيارات الوجبة",
    option_group_name: "اسم المجموعة",
    option_required: "إجباري",
    option_multiple: "اختيارات متعددة",
    add_option_group: "إضافة مجموعة خيارات",
    add_option_choice: "إضافة اختيار",
    choice_name: "اسم الاختيار",
    price_delta: "زيادة السعر",
    option_config_hint: "اضبط كل مجموعة: إجباري أو متعدد، ثم أضف الاختيارات مع الزيادة بالسعر بالدينار.",
    option_choice_hint: "مثال: الحجم، الصلصة، الإضافات",
    choice_price_hint: "زيادة السعر بالدينار",
    remove_group: "حذف المجموعة",
    remove_choice: "حذف الاختيار",
    price: "السعر",
    badge: "شارة",
    calories: "السعرات",
    menu_photo: "صورة الطبق",
    add_to_menu: "إضافة إلى القائمة",
    update_dish: "تحديث الطبق",
    delete_dish: "حذف الطبق",
    in_stock: "المخزون",
    availability: "التوفر",
    available: "متاح",
    unavailable: "غير متاح",
    customers_title: "حسابات العملاء",
    couriers_title: "إدارة الموصلين",
    create_courier: "إضافة موصل",
    applications_title: "طلبات الانضمام",
    applications_subtitle: "طلبات المطاعم والموصلين المرسلة من التطبيق.",
    pending: "قيد الانتظار",
    accepted: "مقبولة",
    rejected: "مرفوضة",
    contact: "تواصل",
    linked_entity: "تم إنشاء العنصر",
    open_created_restaurant: "فتح المطعم المنشأ",
    activate_restaurant: "تحويل إلى مطعم نشط",
    draft_restaurant: "مطعم مسودة",
    email_notifications: "إشعارات البريد",
    no_applications: "لا توجد طلبات حالياً",
    categories_title: "فئات الوجبات",
    create_category: "إضافة فئة",
    category_name: "اسم الفئة",
    sort_order: "ترتيب الظهور",
    no_categories: "لا توجد فئات",
    phone: "الهاتف",
    vehicle: "المركبة",
    scooter: "دراجة نارية",
    car: "سيارة",
    ebike: "دراجة كهربائية",
    zone: "المنطقة",
    promotions_title: "العروض والتخفيضات",
    reports_title: "التقارير والإحصاءات المتقدمة",
    create_promotion: "إنشاء عرض",
    code: "الرمز",
    title: "العنوان",
    value: "القيمة",
    min_order: "الحد الأدنى",
    starts_at: "البداية",
    ends_at: "النهاية",
    percentage: "نسبة مئوية",
    fixed: "مبلغ ثابت",
    assign_courier: "تعيين موصل",
    active: "نشط",
    inactive: "غير نشط",
    average_basket: "متوسط السلة",
    low_stock: "مخزون منخفض",
    operations_modules: "الوحدات التشغيلية",
    operations_modules_subtitle: "نظرة سريعة على مجالات إدارة المنصة.",
    logistics: "اللوجستيك",
    finance: "المالية",
    customers: "العملاء",
    inventory: "المخزون",
    promotions: "العروض",
    active_promotions: "عروض نشطة",
    tracked_deliveries: "عمليات توصيل متتبعة",
    customer_accounts: "حسابات عملاء",
    inventory_items: "عناصر في الكتالوج",
    all: "الكل",
    delivered: "تم التسليم",
    confirmed: "مؤكدة",
  },
};

const statusLabels = {
  fr: {
    All: "Tous",
    Confirmed: "Confirmed",
    Preparing: "Preparing",
    "On the way": "On the way",
    Delivered: "Delivered",
    Cancelled: "Cancelled",
  },
  ar: {
    All: "الكل",
    Confirmed: "مؤكدة",
    Preparing: "قيد التحضير",
    "On the way": "في الطريق",
    Delivered: "تم التسليم",
    Cancelled: "ملغاة",
  },
};

const weekdayDefinitions = [
  { key: "mon", fr: "Lundi", ar: "الاثنين" },
  { key: "tue", fr: "Mardi", ar: "الثلاثاء" },
  { key: "wed", fr: "Mercredi", ar: "الأربعاء" },
  { key: "thu", fr: "Jeudi", ar: "الخميس" },
  { key: "fri", fr: "Vendredi", ar: "الجمعة" },
  { key: "sat", fr: "Samedi", ar: "السبت" },
  { key: "sun", fr: "Dimanche", ar: "الأحد" },
];

const mealCategories = ["Burgers", "Pizza", "Sushi", "Healthy", "Desserts", "Drinks"];

function createDefaultWeeklyHours() {
  return weekdayDefinitions.reduce((accumulator, day) => {
    accumulator[day.key] = { enabled: true, open: "08:00", close: "22:00" };
    return accumulator;
  }, {});
}

function formatWeeklyHours(weeklyHours, language) {
  return weekdayDefinitions
    .map((day) => {
      const config = weeklyHours?.[day.key];
      if (!config) return null;
      const label = language === "ar" ? day.ar : day.fr;
      if (!config.enabled) {
        return `${label}: ${language === "ar" ? "مغلق" : "Ferme"}`;
      }
      return `${label}: ${config.open} - ${config.close}`;
    })
    .filter(Boolean)
    .join(" | ");
}

const emptyRestaurant = {
  id: "",
  name: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  category: "Burgers",
  shortDescription: "",
  address: "",
  openingHours: "",
  deliveryTime: "",
  rating: 4.5,
  reviewCount: 0,
  image: "",
  heroColor: "#EA580C",
  coordinates: { latitude: 0, longitude: 0 },
  tags: "",
  pointsPerEuro: 10,
  weeklyHours: createDefaultWeeklyHours(),
};

const emptyMenuItem = {
  name: "",
  description: "",
  price: "",
  category: mealCategories[0],
  image: "",
  badge: "",
  calories: "",
  stock: 0,
  isAvailable: true,
  options: [],
};

const orderStatuses = ["Confirmed", "Preparing", "On the way", "Delivered", "Cancelled"];

async function apiRequest(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || "Erreur API";
    if (
      typeof window !== "undefined" &&
      (response.status === 401 ||
        response.status === 403 ||
        String(message).toLowerCase().includes("token"))
    ) {
      window.dispatchEvent(
        new CustomEvent("admin-auth-invalid", {
          detail: { message: "Session admin invalide ou expiree. Merci de vous reconnecter." },
        })
      );
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} Da`;
}

function ImagePreview({ src, alt }) {
  if (!src) return null;
  return <img src={src} alt={alt} className="admin-image-preview" />;
}

function formatBillingPlan(entry) {
  if (!entry) return "-";
  if (entry.billingPlanType === "PERCENTAGE_PER_ORDER") {
    return `${Number(entry.billingPercentage || 0)}% / commande`;
  }
  if (entry.billingPlanType === "MONTHLY_SUBSCRIPTION") {
    return `${formatMoney(entry.monthlySubscriptionFee || 0)} / mois`;
  }
  return `${formatMoney(entry.billingFixedFee || 0)} / commande`;
}

function createEmptyChoice() {
  return {
    id: `choice-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    name: "",
    priceDelta: 0,
  };
}

function createEmptyOptionGroup() {
  return {
    id: `group-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    name: "",
    required: false,
    multiple: false,
    choices: [createEmptyChoice()],
  };
}

function getStatusTone(status) {
  if (status === "Delivered") return "success";
  if (status === "On the way") return "info";
  if (status === "Preparing") return "warning";
  if (status === "Cancelled") return "neutral";
  return "neutral";
}

function FormField({ label, hint, error, className = "", children }) {
  const control = isValidElement(children)
    ? cloneElement(children, {
        "aria-invalid": error ? "true" : undefined,
      })
    : children;

  return (
    <label className={`form-field ${error ? "has-error" : ""} ${className}`.trim()}>
      <span className="form-label">{label}</span>
      {hint ? <span className="form-hint">{hint}</span> : null}
      {control}
      {error ? <span className="error-text">{error}</span> : null}
    </label>
  );
}

function FormSection({ title, hint, children }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <h4>{title}</h4>
        {hint ? <p>{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || "").trim());
}

function isValidPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8;
}

function isNumeric(value) {
  return value !== "" && !Number.isNaN(Number(value));
}

function validateLoginForm({ email, password }) {
  const errors = {};
  if (!String(email || "").trim()) {
    errors.email = "L'email est obligatoire.";
  } else if (!isValidEmail(email)) {
    errors.email = "Saisissez un email valide.";
  }

  if (!String(password || "").trim()) {
    errors.password = "Le mot de passe est obligatoire.";
  } else if (String(password).length < 4) {
    errors.password = "Le mot de passe est trop court.";
  }
  return errors;
}

function validateRestaurantFormData(data) {
  const errors = {};
  if (!String(data.name || "").trim()) errors.name = "Le nom du restaurant est obligatoire.";
  if (!String(data.category || "").trim()) errors.category = "La categorie est obligatoire.";
  if (!String(data.address || "").trim()) errors.address = "L'adresse est obligatoire.";
  if (data.ownerEmail && !isValidEmail(data.ownerEmail)) errors.ownerEmail = "Email restaurant invalide.";
  if (data.ownerPhone && !isValidPhone(data.ownerPhone)) errors.ownerPhone = "Numero de telephone invalide.";
  if (data.coordinates?.latitude !== "" && data.coordinates?.latitude !== undefined && Number.isNaN(Number(data.coordinates.latitude))) {
    errors.latitude = "Latitude invalide.";
  }
  if (data.coordinates?.longitude !== "" && data.coordinates?.longitude !== undefined && Number.isNaN(Number(data.coordinates.longitude))) {
    errors.longitude = "Longitude invalide.";
  }
  return errors;
}

function validateMenuItemFormData(data) {
  const errors = {};
  if (!String(data.name || "").trim()) errors.name = "Le nom du plat est obligatoire.";
  if (!String(data.category || "").trim()) errors.category = "La categorie est obligatoire.";
  if (!isNumeric(data.price) || Number(data.price) <= 0) errors.price = "Le prix doit etre superieur a 0.";
  if (data.stock !== "" && Number(data.stock) < 0) errors.stock = "Le stock ne peut pas etre negatif.";
  if (data.calories !== "" && data.calories != null && Number.isNaN(Number(data.calories))) errors.calories = "Calories invalides.";
  return errors;
}

function validateCourierFormData(data) {
  const errors = {};
  if (!String(data.name || "").trim()) errors.name = "Le nom du livreur est obligatoire.";
  if (!isValidPhone(data.phone)) errors.phone = "Numero de telephone invalide.";
  if (!String(data.vehicle || "").trim()) errors.vehicle = "Le vehicule est obligatoire.";
  if (data.currentLat !== "" && data.currentLat != null && Number.isNaN(Number(data.currentLat))) errors.currentLat = "Latitude invalide.";
  if (data.currentLng !== "" && data.currentLng != null && Number.isNaN(Number(data.currentLng))) errors.currentLng = "Longitude invalide.";
  return errors;
}

function validateCategoryFormData(data) {
  const errors = {};
  if (!String(data.name || "").trim()) errors.name = "Le nom de categorie est obligatoire.";
  if (data.sortOrder !== "" && Number(data.sortOrder) < 0) errors.sortOrder = "L'ordre doit etre positif.";
  return errors;
}

function validatePromotionFormData(data) {
  const errors = {};
  if (!String(data.code || "").trim()) errors.code = "Le code promotion est obligatoire.";
  if (!String(data.title || "").trim()) errors.title = "Le titre est obligatoire.";
  if (!isNumeric(data.value) || Number(data.value) <= 0) errors.value = "La valeur doit etre superieure a 0.";
  if (data.minOrderTotal !== "" && Number(data.minOrderTotal) < 0) errors.minOrderTotal = "Le minimum de commande est invalide.";
  return errors;
}

function sameErrors(left, right) {
  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

export default function App() {
  const [language, setLanguage] = useState(localStorage.getItem("admin_language") || "fr");
  const [token, setToken] = useState(localStorage.getItem("admin_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("admin_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [email, setEmail] = useState("admin@fooddelyvry.app");
  const [password, setPassword] = useState("admin1234");
  const [loginErrors, setLoginErrors] = useState({});
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [emailOutbox, setEmailOutbox] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [reports, setReports] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [liveInbox, setLiveInbox] = useState({ orders: 0, applications: 0 });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurant);
  const [menuItemForm, setMenuItemForm] = useState(emptyMenuItem);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [restaurantImageFile, setRestaurantImageFile] = useState(null);
  const [menuImageFile, setMenuImageFile] = useState(null);
  const [courierForm, setCourierForm] = useState({
    name: "",
    phone: "",
    vehicle: "",
    status: "AVAILABLE",
    zoneLabel: "",
    currentLat: "",
    currentLng: "",
  });
  const [promotionForm, setPromotionForm] = useState({
    code: "",
    title: "",
    description: "",
    type: "PERCENTAGE",
    value: "",
    minOrderTotal: "",
    startsAt: "",
    endsAt: "",
    restaurantId: "",
    isActive: true,
  });
  const [menuCategoryForm, setMenuCategoryForm] = useState({
    name: "",
    sortOrder: "",
    isActive: true,
  });
  const [restaurantQrData, setRestaurantQrData] = useState(null);
  const [restaurantCreateErrors, setRestaurantCreateErrors] = useState({});
  const [restaurantEditErrors, setRestaurantEditErrors] = useState({});
  const [menuItemErrors, setMenuItemErrors] = useState({});
  const [courierErrors, setCourierErrors] = useState({});
  const [categoryErrors, setCategoryErrors] = useState({});
  const [promotionErrors, setPromotionErrors] = useState({});
  const requestInFlightRef = useRef(false);
  const hasHydratedLiveFeedRef = useRef(false);
  const previousOrdersRef = useRef([]);
  const previousApplicationsRef = useRef([]);
  const realtimeSocketRef = useRef(null);
  const realtimeRetryRef = useRef(null);
  const isRTL = language === "ar";
  const t = (key) => translations[language]?.[key] || translations.fr[key] || key;
  const availableMealCategories = menuCategories.length
    ? menuCategories.filter((category) => category.isActive).map((category) => category.name)
    : mealCategories;

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const haystack = `${restaurant.name} ${restaurant.category} ${restaurant.address}`.toLowerCase();
      return haystack.includes(restaurantSearch.toLowerCase());
    });
  }, [restaurantSearch, restaurants]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = orderFilter === "All" ? true : order.status === orderFilter;
      if (!matchesStatus) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        order.id,
        order.customerName,
        order.customerEmail,
        order.customerPhone,
        order.address,
        order.restaurantName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [orderFilter, orderSearch, orders]);

  const dashboardStats = useMemo(() => {
    const delivered = orders.filter((order) => order.status === "Delivered").length;
    const inProgress = orders.filter((order) => order.status !== "Delivered").length;
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const menuItemsCount = restaurants.reduce((sum, restaurant) => sum + restaurant.menu.length, 0);

    return [
      { label: "Restaurants", value: restaurants.length, caption: "catalogue actif", accent: "orange" },
      { label: "Menus", value: menuItemsCount, caption: "plats publies", accent: "blue" },
      { label: "Commandes", value: inProgress, caption: "en cours", accent: "gold" },
      { label: "CA", value: formatMoney(revenue), caption: `${delivered} livrees`, accent: "green" },
    ];
  }, [orders, restaurants]);

  const operationsModules = useMemo(() => {
    const deliveredCount = orders.filter((order) => order.status === "Delivered").length;
    const onTheWayCount = orders.filter((order) => order.status === "On the way").length;
    const customerCount = new Set(orders.map((order) => order.customerEmail || order.address)).size;
    const menuItemsCount = restaurants.reduce((sum, restaurant) => sum + restaurant.menu.length, 0);
    const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    return [
      { label: t("orders"), value: orders.length, caption: `${deliveredCount} ${t("delivered_orders").toLowerCase()}` },
      { label: t("logistics"), value: onTheWayCount, caption: t("tracked_deliveries") },
      { label: t("customers"), value: customerCount, caption: t("customer_accounts") },
      { label: t("finance"), value: formatMoney(revenue), caption: "CA" },
      { label: t("inventory"), value: menuItemsCount, caption: t("inventory_items") },
      { label: t("promotions"), value: 0, caption: t("active_promotions") },
    ];
  }, [orders, restaurants, language]);

  const pendingApplicationsCount = useMemo(
    () => applications.filter((application) => application.status === "PENDING").length,
    [applications]
  );

  const inProgressOrdersCount = useMemo(
    () => orders.filter((order) => !["Delivered", "Cancelled"].includes(order.status)).length,
    [orders]
  );

  function playPendingOrderAlert() {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextRef = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextRef) {
      return;
    }

    const context = new AudioContextRef();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(660, context.currentTime + 0.11);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.28);
    oscillator.onended = () => {
      context.close().catch(() => undefined);
    };
  }

  function formatOrderCreatedAt(value) {
    if (!value) {
      return "--:--";
    }

    const date = new Date(value);
    return date.toLocaleString(language === "ar" ? "ar-DZ" : "fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function resetCourierForm() {
    setCourierForm({
      name: "",
      phone: "",
      vehicle: "",
      status: "AVAILABLE",
      zoneLabel: "",
      currentLat: "",
      currentLng: "",
    });
    setSelectedCourier(null);
    setCourierErrors({});
  }

  function resetCategoryModal() {
    setMenuCategoryForm({ name: "", sortOrder: "", isActive: true });
    setSelectedCategory(null);
    setCategoryErrors({});
  }

  function resetPromotionModal() {
    setPromotionForm({
      code: "",
      title: "",
      description: "",
      type: "PERCENTAGE",
      value: "",
      minOrderTotal: "",
      startsAt: "",
      endsAt: "",
      restaurantId: "",
      isActive: true,
    });
    setSelectedPromotion(null);
    setPromotionErrors({});
  }

  useEffect(() => {
    if (!availableMealCategories.includes(menuItemForm.category)) {
      setMenuItemForm((current) => ({
        ...current,
        category: availableMealCategories[0] || mealCategories[0],
      }));
    }
  }, [availableMealCategories, menuItemForm.category]);

  useEffect(() => {
    localStorage.setItem("admin_language", language);
  }, [language]);

  useEffect(() => {
    if (Object.keys(loginErrors).length) {
      const nextErrors = validateLoginForm({ email, password });
      if (!sameErrors(loginErrors, nextErrors)) {
        setLoginErrors(nextErrors);
      }
    }
  }, [email, password, loginErrors]);

  useEffect(() => {
    if (Object.keys(restaurantCreateErrors).length) {
      const nextErrors = validateRestaurantFormData(restaurantForm);
      if (!sameErrors(restaurantCreateErrors, nextErrors)) {
        setRestaurantCreateErrors(nextErrors);
      }
    }
  }, [restaurantForm, restaurantCreateErrors]);

  useEffect(() => {
    if (Object.keys(restaurantEditErrors).length && selectedRestaurant) {
      const nextErrors = validateRestaurantFormData(selectedRestaurant);
      if (!sameErrors(restaurantEditErrors, nextErrors)) {
        setRestaurantEditErrors(nextErrors);
      }
    }
  }, [selectedRestaurant, restaurantEditErrors]);

  useEffect(() => {
    const source = selectedMenuItem ?? menuItemForm;
    if (Object.keys(menuItemErrors).length) {
      const nextErrors = validateMenuItemFormData(source);
      if (!sameErrors(menuItemErrors, nextErrors)) {
        setMenuItemErrors(nextErrors);
      }
    }
  }, [menuItemForm, selectedMenuItem, menuItemErrors]);

  useEffect(() => {
    const source = selectedCourier ?? courierForm;
    if (Object.keys(courierErrors).length) {
      const nextErrors = validateCourierFormData(source);
      if (!sameErrors(courierErrors, nextErrors)) {
        setCourierErrors(nextErrors);
      }
    }
  }, [courierForm, selectedCourier, courierErrors]);

  useEffect(() => {
    if (Object.keys(categoryErrors).length) {
      const nextErrors = validateCategoryFormData(menuCategoryForm);
      if (!sameErrors(categoryErrors, nextErrors)) {
        setCategoryErrors(nextErrors);
      }
    }
  }, [menuCategoryForm, categoryErrors]);

  useEffect(() => {
    const source = selectedPromotion ?? promotionForm;
    if (Object.keys(promotionErrors).length) {
      const nextErrors = validatePromotionFormData(source);
      if (!sameErrors(promotionErrors, nextErrors)) {
        setPromotionErrors(nextErrors);
      }
    }
  }, [promotionForm, selectedPromotion, promotionErrors]);

  useEffect(() => {
    setRestaurantQrData(null);
  }, [selectedRestaurantId]);

  useEffect(() => {
    function handleInvalidAuth(event) {
      setToken("");
      setUser(null);
      setRestaurants([]);
      setOrders([]);
      setCustomers([]);
      setCouriers([]);
      setApplications([]);
      setEmailOutbox([]);
      setMenuCategories([]);
      setPromotions([]);
      setReports(null);
      setSelectedRestaurantId("");
      setRestaurantQrData(null);
      setLiveInbox({ orders: 0, applications: 0 });
      setLastSyncAt("");
      previousOrdersRef.current = [];
      previousApplicationsRef.current = [];
      hasHydratedLiveFeedRef.current = false;
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      setStatusMessage("");
      setErrorMessage(event.detail?.message || "Session admin invalide ou expiree. Merci de vous reconnecter.");
    }

    window.addEventListener("admin-auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("admin-auth-invalid", handleInvalidAuth);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadAdminData();
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadAdminData({ silent: true, background: true });
    }, 10000);

    const handleWindowFocus = () => {
      loadAdminData({ silent: true, background: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAdminData({ silent: true, background: true });
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      const socket = new WebSocket(`${WS_URL}/ws?role=admin`);
      realtimeSocketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data));

          if (message.type?.startsWith("order/")) {
            if (message.type === "order/created" && activeView !== "orders") {
              setLiveInbox((current) => ({ ...current, orders: current.orders + 1 }));
              playPendingOrderAlert();
            }

            loadAdminData({ silent: true, background: true });
          }
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        realtimeSocketRef.current = null;
        if (disposed) {
          return;
        }

        realtimeRetryRef.current = window.setTimeout(connect, 2500);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (realtimeRetryRef.current) {
        window.clearTimeout(realtimeRetryRef.current);
      }
      realtimeSocketRef.current?.close();
      realtimeSocketRef.current = null;
    };
  }, [token, activeView]);

  useEffect(() => {
    if (activeView === "orders") {
      setLiveInbox((current) => (current.orders ? { ...current, orders: 0 } : current));
    }
    if (activeView === "applications") {
      setLiveInbox((current) => (current.applications ? { ...current, applications: 0 } : current));
    }
  }, [activeView]);

  async function loadAdminData({ silent = false, background = false } = {}) {
    if (!token || requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;
    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const [restaurantData, orderData, customerData, courierData, applicationData, emailData, categoryData, promotionData, reportData] = await Promise.all([
        apiRequest("/api/admin/restaurants", {}, token),
        apiRequest("/api/admin/orders", {}, token),
        apiRequest("/api/admin/customers", {}, token),
        apiRequest("/api/admin/couriers", {}, token),
        apiRequest("/api/admin/applications", {}, token),
        apiRequest("/api/admin/email-outbox", {}, token),
        apiRequest("/api/admin/menu-categories", {}, token),
        apiRequest("/api/admin/promotions", {}, token),
        apiRequest("/api/admin/reports/summary", {}, token),
      ]);

      const previousOrders = previousOrdersRef.current;
      const previousApplications = previousApplicationsRef.current;
      const freshOrders = orderData.filter((order) => !previousOrders.some((entry) => entry.id === order.id)).length;
      const freshPendingOrders = orderData.filter(
        (order) =>
          !previousOrders.some((entry) => entry.id === order.id) &&
          !["Delivered", "Cancelled"].includes(order.status)
      ).length;
      const freshApplications = applicationData.filter(
        (application) => !previousApplications.some((entry) => entry.id === application.id)
      ).length;

      setRestaurants(restaurantData);
      setOrders(orderData);
      setCustomers(customerData);
      setCouriers(courierData);
      setApplications(applicationData);
      setEmailOutbox(emailData);
      setMenuCategories(categoryData);
      setPromotions(promotionData);
      setReports(reportData);
      previousOrdersRef.current = orderData;
      previousApplicationsRef.current = applicationData;
      setLastSyncAt(new Date().toLocaleTimeString(language === "ar" ? "ar-DZ" : "fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }));

      if (background && hasHydratedLiveFeedRef.current) {
        setLiveInbox((current) => ({
          orders: activeView === "orders" ? 0 : current.orders + freshOrders,
          applications: activeView === "applications" ? 0 : current.applications + freshApplications,
        }));

        if (freshPendingOrders > 0) {
          playPendingOrderAlert();
        }

        if ((freshOrders || freshApplications) && !silent) {
          setStatusMessage(
            [
              freshOrders ? `${freshOrders} nouvelle${freshOrders > 1 ? "s" : ""} commande${freshOrders > 1 ? "s" : ""}` : "",
              freshApplications
                ? `${freshApplications} nouvelle${freshApplications > 1 ? "s" : ""} demande${freshApplications > 1 ? "s" : ""}`
                : "",
            ]
              .filter(Boolean)
              .join(" • ")
          );
        }
      } else if (!hasHydratedLiveFeedRef.current) {
        hasHydratedLiveFeedRef.current = true;
      }

      if (restaurantData[0] && !selectedRestaurantId) {
        setSelectedRestaurantId(restaurantData[0].id);
      }
      if (!silent) {
        setErrorMessage("");
      }
    } catch (error) {
      if (!silent) {
        setErrorMessage(error.message);
      }
    } finally {
      requestInFlightRef.current = false;
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }

  async function uploadImage(file) {
    if (!file) {
      return null;
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_URL}/api/admin/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload.message || "Upload image impossible";
      if (
        response.status === 401 ||
        response.status === 403 ||
        String(message).toLowerCase().includes("token")
      ) {
        window.dispatchEvent(
          new CustomEvent("admin-auth-invalid", {
            detail: { message: "Session admin invalide ou expiree. Merci de vous reconnecter." },
          })
        );
      }

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload.url;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setErrorMessage("");
    const errors = validateLoginForm({ email, password });
    setLoginErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      const payload = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(payload.token);
      setUser(payload.user);
      localStorage.setItem("admin_token", payload.token);
      localStorage.setItem("admin_user", JSON.stringify(payload.user));
      setStatusMessage("Connexion admin reussie.");
      setLoginErrors({});
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }

  async function handleCreateRestaurant(event) {
    event.preventDefault();
    setErrorMessage("");
    const errors = validateRestaurantFormData(restaurantForm);
    setRestaurantCreateErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      const uploadedImageUrl = await uploadImage(restaurantImageFile);
      const createdRestaurant = await apiRequest(
        "/api/admin/restaurants",
        {
          method: "POST",
          body: JSON.stringify({
            ...restaurantForm,
            openingHours: formatWeeklyHours(restaurantForm.weeklyHours, language),
            image: uploadedImageUrl || restaurantForm.image,
            tags: restaurantForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            coordinates: {
              latitude: Number(restaurantForm.coordinates.latitude),
              longitude: Number(restaurantForm.coordinates.longitude),
            },
            rating: Number(restaurantForm.rating),
            reviewCount: Number(restaurantForm.reviewCount),
            pointsPerEuro: Number(restaurantForm.pointsPerEuro),
          }),
        },
        token
      );
      setRestaurantForm(emptyRestaurant);
      setRestaurantImageFile(null);
      if (createdRestaurant.generatedAccess?.email) {
        setStatusMessage(
          `Restaurant ajoute. Acces envoye a ${createdRestaurant.generatedAccess.email} avec mot de passe temporaire ${createdRestaurant.generatedAccess.temporaryPassword}.`
        );
      } else {
        setStatusMessage("Restaurant ajoute.");
      }
      setActiveView("restaurants");
      setShowCreateModal(false);
      setRestaurantCreateErrors({});
      setSelectedRestaurantId(createdRestaurant.id);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleUpdateRestaurant(event) {
    event.preventDefault();
    if (!selectedRestaurant) {
      return;
    }
    setErrorMessage("");
    const errors = validateRestaurantFormData(selectedRestaurant);
    setRestaurantEditErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      const uploadedImageUrl = await uploadImage(restaurantImageFile);
      await apiRequest(
        `/api/admin/restaurants/${selectedRestaurant.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...selectedRestaurant,
            image: uploadedImageUrl || selectedRestaurant.image,
            tags: selectedRestaurant.tags,
            coordinates: selectedRestaurant.coordinates,
          }),
        },
        token
      );
      setStatusMessage("Restaurant mis a jour.");
      setRestaurantImageFile(null);
      setShowEditModal(false);
      setRestaurantEditErrors({});
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleAddMenuItem(event) {
    event.preventDefault();
    if (!selectedRestaurantId) {
      return;
    }
    setErrorMessage("");
    const errors = validateMenuItemFormData(menuItemForm);
    setMenuItemErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      const uploadedImageUrl = await uploadImage(menuImageFile);
      await apiRequest(
        `/api/admin/restaurants/${selectedRestaurantId}/menu-items`,
        {
          method: "POST",
          body: JSON.stringify({
            ...menuItemForm,
            image: uploadedImageUrl || menuItemForm.image,
            price: Number(menuItemForm.price),
            calories: menuItemForm.calories ? Number(menuItemForm.calories) : null,
            stock: Number(menuItemForm.stock || 0),
            isAvailable: Boolean(menuItemForm.isAvailable),
            options: (menuItemForm.options || [])
              .map((group) => ({
                ...group,
                choices: (group.choices || [])
                  .filter((choice) => choice.name?.trim())
                  .map((choice) => ({
                    ...choice,
                    priceDelta: Number(choice.priceDelta || 0),
                  })),
              }))
              .filter((group) => group.name?.trim() && group.choices.length),
          }),
        },
        token
      );
      setMenuItemForm(emptyMenuItem);
      setMenuImageFile(null);
      setSelectedMenuItem(null);
      setStatusMessage("Plat ajoute.");
      setShowMenuModal(false);
      setMenuItemErrors({});
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleUpdateMenuItem(event) {
    event.preventDefault();
    if (!selectedMenuItem) {
      return;
    }

    setErrorMessage("");
    const errors = validateMenuItemFormData(selectedMenuItem);
    setMenuItemErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      const uploadedImageUrl = await uploadImage(menuImageFile);
      await apiRequest(
        `/api/admin/menu-items/${selectedMenuItem.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            ...selectedMenuItem,
            image: uploadedImageUrl || selectedMenuItem.image,
            price: Number(selectedMenuItem.price),
            calories: selectedMenuItem.calories ? Number(selectedMenuItem.calories) : null,
            stock: Number(selectedMenuItem.stock || 0),
            isAvailable: Boolean(selectedMenuItem.isAvailable),
            options: (selectedMenuItem.options || [])
              .map((group) => ({
                ...group,
                choices: (group.choices || [])
                  .filter((choice) => choice.name?.trim())
                  .map((choice) => ({
                    ...choice,
                    priceDelta: Number(choice.priceDelta || 0),
                  })),
              }))
              .filter((group) => group.name?.trim() && group.choices.length),
          }),
        },
        token
      );
      setMenuImageFile(null);
      setSelectedMenuItem(null);
      setStatusMessage("Plat mis a jour.");
      setShowMenuModal(false);
      setMenuItemErrors({});
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleOrderStatus(orderId, status) {
    setErrorMessage("");
    try {
      await apiRequest(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token
      );
      setStatusMessage("Statut commande mis a jour.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCancelOrder(order) {
    const reason = window.prompt("Motif d'annulation ou de rejet de la commande :", "");
    if (reason === null) {
      return;
    }

    try {
      await apiRequest(
        `/api/admin/orders/${order.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "Cancelled", reason }),
        },
        token
      );
      setStatusMessage("Commande annulee avec motif enregistre.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function handleCallNumber(phone) {
    if (!phone) {
      setErrorMessage("Aucun numero disponible pour cet appel.");
      return;
    }
    window.open(`tel:${phone}`, "_self");
  }

  function handlePrintKitchenTicket(order) {
    const ticketWindow = window.open("", "_blank", "width=420,height=720");
    if (!ticketWindow) {
      setErrorMessage("Impossible d'ouvrir la fenetre d'impression.");
      return;
    }

    const itemsMarkup = (order.items || [])
      .map((item) => {
        const optionsMarkup = (item.selectedOptions || [])
          .map((option) => `<li>+ ${option.groupName}: ${option.choiceName}</li>`)
          .join("");
        const noteMarkup = item.specialInstructions ? `<p><strong>Note:</strong> ${item.specialInstructions}</p>` : "";
        return `
          <div style="padding:10px 0;border-bottom:1px dashed #cbd5e1;">
            <strong>${item.quantity} x ${item.name}</strong>
            ${optionsMarkup ? `<ul style="margin:6px 0 0 16px;padding:0;">${optionsMarkup}</ul>` : ""}
            ${noteMarkup}
          </div>
        `;
      })
      .join("");

    ticketWindow.document.write(`
      <html>
        <head>
          <title>Ticket cuisine ${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #111827; }
            h1,h2,p { margin: 0 0 10px; }
            .meta { margin-bottom: 14px; font-size: 14px; color: #475569; }
            .total { margin-top: 16px; font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${order.restaurantName}</h1>
          <p class="meta">Commande ${order.id}</p>
          <p class="meta">Creee a ${formatOrderCreatedAt(order.createdAt)}</p>
          <p class="meta">${order.channel === "QR_ONSITE" ? `Sur place ${order.tableLabel || ""}` : order.address}</p>
          ${itemsMarkup}
          ${order.notes ? `<p style="margin-top:14px;"><strong>Commentaire client:</strong> ${order.notes}</p>` : ""}
          <p class="total">Total: ${formatMoney(order.total)}</p>
        </body>
      </html>
    `);
    ticketWindow.document.close();
    ticketWindow.focus();
    ticketWindow.print();
  }

  async function handleMenuStock(itemId, stock) {
    try {
      await apiRequest(
        `/api/admin/menu-items/${itemId}/stock`,
        { method: "PATCH", body: JSON.stringify({ stock }) },
        token
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleMenuAvailability(itemId, isAvailable) {
    try {
      await apiRequest(
        `/api/admin/menu-items/${itemId}/availability`,
        { method: "PATCH", body: JSON.stringify({ isAvailable }) },
        token
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleDeleteMenuItem(itemId) {
    try {
      await apiRequest(`/api/admin/menu-items/${itemId}`, { method: "DELETE" }, token);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCustomerToggle(customer) {
    try {
      await apiRequest(
        `/api/admin/customers/${customer.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...customer, isActive: !customer.isActive }),
        },
        token
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCourierStatus(courier, status) {
    try {
      await apiRequest(
        `/api/admin/couriers/${courier.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...courier, status }),
        },
        token
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateCourier(event) {
    event.preventDefault();
    const errors = validateCourierFormData(courierForm);
    setCourierErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      await apiRequest(
        "/api/admin/couriers",
        {
          method: "POST",
          body: JSON.stringify(courierForm),
        },
        token
      );
      resetCourierForm();
      setStatusMessage("Livreur ajoute.");
      setShowCourierModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleUpdateCourier(event) {
    event.preventDefault();
    if (!selectedCourier) {
      return;
    }
    const errors = validateCourierFormData(selectedCourier);
    setCourierErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      await apiRequest(
        `/api/admin/couriers/${selectedCourier.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...selectedCourier,
            currentLat: selectedCourier.currentLat !== "" ? Number(selectedCourier.currentLat) : null,
            currentLng: selectedCourier.currentLng !== "" ? Number(selectedCourier.currentLng) : null,
          }),
        },
        token
      );
      resetCourierForm();
      setStatusMessage("Livreur mis a jour.");
      setShowCourierModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreateMenuCategory(event) {
    event.preventDefault();
    const errors = validateCategoryFormData(menuCategoryForm);
    setCategoryErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      await apiRequest(
        "/api/admin/menu-categories",
        {
          method: "POST",
          body: JSON.stringify({
            name: menuCategoryForm.name,
            sortOrder: Number(menuCategoryForm.sortOrder || 0),
            isActive: Boolean(menuCategoryForm.isActive),
          }),
        },
        token
      );
      resetCategoryModal();
      setStatusMessage("Categorie ajoutee.");
      setShowCategoryModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleMenuCategoryUpdate(category, patch) {
    const payload = {
      ...category,
      ...patch,
    };
    const errors = validateCategoryFormData(payload);
    setCategoryErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      await apiRequest(
        `/api/admin/menu-categories/${category.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token
      );
      resetCategoryModal();
      setStatusMessage("Categorie mise a jour.");
      setShowCategoryModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function handleCategoryModalSubmit(event) {
    event.preventDefault();
    if (selectedCategory) {
      handleMenuCategoryUpdate(selectedCategory, {
        name: menuCategoryForm.name,
        sortOrder: Number(menuCategoryForm.sortOrder || 0),
        isActive: Boolean(menuCategoryForm.isActive),
      });
      return;
    }

    handleCreateMenuCategory(event);
  }

  async function handleDeleteMenuCategory(categoryId) {
    try {
      await apiRequest(`/api/admin/menu-categories/${categoryId}`, { method: "DELETE" }, token);
      setStatusMessage("Categorie supprimee.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleApplicationStatus(applicationId, status) {
    try {
      await apiRequest(
        `/api/admin/applications/${applicationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token
      );
      setStatusMessage("Statut demande mis a jour.");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleActivateApplicationRestaurant(applicationId) {
    try {
      const restaurant = await apiRequest(
        `/api/admin/applications/${applicationId}/activate-restaurant`,
        { method: "POST" },
        token
      );
      setStatusMessage("Restaurant converti en actif.");
      setSelectedRestaurantId(restaurant.id);
      setActiveView("restaurants");
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function openCreatedRestaurant(application) {
    if (!application.linkedEntityId) {
      return;
    }

    setSelectedRestaurantId(application.linkedEntityId);
    setActiveView("restaurants");
  }

  async function handleFetchRestaurantQr(restaurantId) {
    try {
      const payload = await apiRequest(`/api/admin/restaurants/${restaurantId}/qr-code`, {}, token);
      setRestaurantQrData(payload);
      setStatusMessage("QR code restaurant genere.");
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleAssignCourier(orderId, courierId) {
    try {
      await apiRequest(
        `/api/admin/orders/${orderId}/assign-courier`,
        { method: "PATCH", body: JSON.stringify({ courierId }) },
        token
      );
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleCreatePromotion(event) {
    event.preventDefault();
    const errors = validatePromotionFormData(promotionForm);
    setPromotionErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }
    try {
      await apiRequest(
        "/api/admin/promotions",
        {
          method: "POST",
          body: JSON.stringify({
            ...promotionForm,
            value: Number(promotionForm.value || 0),
            minOrderTotal: Number(promotionForm.minOrderTotal || 0),
            restaurantId: promotionForm.restaurantId || null,
          }),
        },
        token
      );
      resetPromotionModal();
      setStatusMessage("Promotion ajoutee.");
      setShowPromotionModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  async function handleUpdatePromotion(event) {
    event.preventDefault();
    if (!selectedPromotion) {
      return;
    }
    const errors = validatePromotionFormData(selectedPromotion);
    setPromotionErrors(errors);
    if (Object.keys(errors).length) {
      return;
    }

    try {
      await apiRequest(
        `/api/admin/promotions/${selectedPromotion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...selectedPromotion,
            value: Number(selectedPromotion.value || 0),
            minOrderTotal: Number(selectedPromotion.minOrderTotal || 0),
            restaurantId: selectedPromotion.restaurantId || null,
          }),
        },
        token
      );
      resetPromotionModal();
      setStatusMessage("Promotion mise a jour.");
      setShowPromotionModal(false);
      await loadAdminData();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }

  function openCreateCourierModal() {
    resetCourierForm();
    setShowCourierModal(true);
  }

  function openEditCourierModal(courier) {
    setCourierErrors({});
    setSelectedCourier({
      ...courier,
      currentLat: courier.currentLat ?? "",
      currentLng: courier.currentLng ?? "",
    });
    setShowCourierModal(true);
  }

  function openCreateCategoryModal() {
    resetCategoryModal();
    setShowCategoryModal(true);
  }

  function openEditCategoryModal(category) {
    setCategoryErrors({});
    setSelectedCategory({ ...category });
    setMenuCategoryForm({
      name: category.name,
      sortOrder: String(category.sortOrder ?? ""),
      isActive: Boolean(category.isActive),
    });
    setShowCategoryModal(true);
  }

  function openCreatePromotionModal() {
    resetPromotionModal();
    setShowPromotionModal(true);
  }

  function openEditPromotionModal(promotion) {
    setPromotionErrors({});
    setSelectedPromotion({
      ...promotion,
      value: String(promotion.value ?? ""),
      minOrderTotal: String(promotion.minOrderTotal ?? ""),
      startsAt: promotion.startsAt ? promotion.startsAt.slice(0, 16) : "",
      endsAt: promotion.endsAt ? promotion.endsAt.slice(0, 16) : "",
      restaurantId: promotion.restaurantId || "",
    });
    setShowPromotionModal(true);
  }

  function updateSelectedRestaurant(field, value) {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === selectedRestaurantId ? { ...restaurant, [field]: value } : restaurant
      )
    );
  }

  function updateSelectedRestaurantCoordinates(field, value) {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === selectedRestaurantId
          ? { ...restaurant, coordinates: { ...restaurant.coordinates, [field]: Number(value) } }
          : restaurant
      )
    );
  }

  function updateMenuFormOptionGroup(groupId, field, value) {
    setMenuItemForm((current) => ({
      ...current,
      options: (current.options || []).map((group) => (group.id === groupId ? { ...group, [field]: value } : group)),
    }));
  }

  function updateMenuFormChoice(groupId, choiceId, field, value) {
    setMenuItemForm((current) => ({
      ...current,
      options: (current.options || []).map((group) =>
        group.id === groupId
          ? {
              ...group,
              choices: (group.choices || []).map((choice) =>
                choice.id === choiceId ? { ...choice, [field]: field === "priceDelta" ? Number(value) : value } : choice
              ),
            }
          : group
      ),
    }));
  }

  function addMenuFormOptionGroup() {
    setMenuItemForm((current) => ({
      ...current,
      options: [...(current.options || []), createEmptyOptionGroup()],
    }));
  }

  function removeMenuFormOptionGroup(groupId) {
    setMenuItemForm((current) => ({
      ...current,
      options: (current.options || []).filter((group) => group.id !== groupId),
    }));
  }

  function addMenuFormChoice(groupId) {
    setMenuItemForm((current) => ({
      ...current,
      options: (current.options || []).map((group) =>
        group.id === groupId ? { ...group, choices: [...(group.choices || []), createEmptyChoice()] } : group
      ),
    }));
  }

  function removeMenuFormChoice(groupId, choiceId) {
    setMenuItemForm((current) => ({
      ...current,
      options: (current.options || []).map((group) =>
        group.id === groupId
          ? { ...group, choices: (group.choices || []).filter((choice) => choice.id !== choiceId) }
          : group
      ),
    }));
  }

  function updateSelectedMenuOptionGroup(groupId, field, value) {
    setSelectedMenuItem((current) =>
      current
        ? {
            ...current,
            options: (current.options || []).map((group) => (group.id === groupId ? { ...group, [field]: value } : group)),
          }
        : current
    );
  }

  function updateSelectedMenuChoice(groupId, choiceId, field, value) {
    setSelectedMenuItem((current) =>
      current
        ? {
            ...current,
            options: (current.options || []).map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    choices: (group.choices || []).map((choice) =>
                      choice.id === choiceId ? { ...choice, [field]: field === "priceDelta" ? Number(value) : value } : choice
                    ),
                  }
                : group
            ),
          }
        : current
    );
  }

  function addSelectedMenuOptionGroup() {
    setSelectedMenuItem((current) =>
      current ? { ...current, options: [...(current.options || []), createEmptyOptionGroup()] } : current
    );
  }

  function removeSelectedMenuOptionGroup(groupId) {
    setSelectedMenuItem((current) =>
      current ? { ...current, options: (current.options || []).filter((group) => group.id !== groupId) } : current
    );
  }

  function addSelectedMenuChoice(groupId) {
    setSelectedMenuItem((current) =>
      current
        ? {
            ...current,
            options: (current.options || []).map((group) =>
              group.id === groupId ? { ...group, choices: [...(group.choices || []), createEmptyChoice()] } : group
            ),
          }
        : current
    );
  }

  function removeSelectedMenuChoice(groupId, choiceId) {
    setSelectedMenuItem((current) =>
      current
        ? {
            ...current,
            options: (current.options || []).map((group) =>
              group.id === groupId
                ? { ...group, choices: (group.choices || []).filter((choice) => choice.id !== choiceId) }
                : group
            ),
          }
        : current
    );
  }

  if (!token) {
    return (
      <main className="auth-shell" dir={isRTL ? "rtl" : "ltr"}>
        <section className="auth-card">
          <div className="auth-glow" />
          <div className="topbar-actions">
            <button className="ghost small" onClick={() => setLanguage("fr")}>{t("french")}</button>
            <button className="ghost small" onClick={() => setLanguage("ar")}>{t("arabic")}</button>
          </div>
          <img className="brand-logo auth-brand-logo" src={brandLogoUrl} alt="FoodDelyvry" />
          <p className="eyebrow">{t("dashboard_admin")}</p>
          <h1>{t("login_title")}</h1>
          <p className="muted">{t("login_subtitle")}</p>
          <form onSubmit={handleLogin} className="stack form-layout">
            <FormField label={t("email")} hint="Exemple: admin@fooddelyvry.app" error={loginErrors.email}>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@fooddelyvry.app"
                type="email"
                required
              />
            </FormField>
            <FormField label={t("password")} hint="Utilisez le mot de passe admin de seed pour le developpement." error={loginErrors.password}>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin1234"
                type="password"
                required
              />
            </FormField>
            <button type="submit">{t("login")}</button>
          </form>
          <div className="auth-foot">
            <p className="hint">{t("seed_account")}</p>
            <strong>admin@fooddelyvry.app / admin1234</strong>
          </div>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell" dir={isRTL ? "rtl" : "ltr"}>
      <aside className="sidebar">
        <div className="brand-block">
          <div className="sidebar-brand-row">
            <img className="brand-logo sidebar-brand-logo" src={brandLogoUrl} alt="FoodDelyvry" />
          </div>
          <p className="eyebrow">{t("operations_center")}</p>
          <h1>FoodDelyvry</h1>
          <p className="sidebar-copy">{t("sidebar_copy")}</p>
        </div>

        <nav className="side-nav">
          {[
            { id: "overview", label: t("overview") },
            { id: "restaurants", label: t("restaurants") },
            { id: "orders", label: t("orders") },
            { id: "customers", label: t("customers_nav") },
            { id: "couriers", label: t("couriers_nav") },
            { id: "applications", label: t("applications_nav") },
            { id: "categories", label: t("categories_nav") },
            { id: "promotions", label: t("promotions_nav") },
            { id: "reports", label: t("reports_nav") },
            { id: "create", label: t("new_restaurant") },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id || (item.id === "create" && showCreateModal) ? "active" : ""}`}
              onClick={() => {
                if (item.id === "create") {
                  setRestaurantCreateErrors({});
                  setShowCreateModal(true);
                  return;
                }
                setActiveView(item.id);
              }}
            >
              <span>{item.label}</span>
              {item.id === "orders" && liveInbox.orders ? <span className="nav-badge">{liveInbox.orders}</span> : null}
              {item.id === "applications" && liveInbox.applications ? (
                <span className="nav-badge">{liveInbox.applications}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="side-card">
          <div className="inline-actions">
            <button className="ghost small" onClick={() => setLanguage("fr")}>{t("french")}</button>
            <button className="ghost small" onClick={() => setLanguage("ar")}>{t("arabic")}</button>
          </div>
          <span className="chip chip-dark">{user?.role}</span>
          <h3>{user?.name}</h3>
          <p>{user?.email}</p>
          <button className="ghost full" onClick={handleLogout}>{t("logout")}</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="hero-panel">
          <div>
            <p className="eyebrow">{t("dashboard")}</p>
            <h2>{t("hero_title")}</h2>
            <p className="muted">{t("hero_subtitle")}</p>
          </div>
          <div className="hero-actions">
            <div className="live-chip">
              <span className={`live-dot ${isRefreshing ? "busy" : ""}`} />
              <span>
                Live
                {lastSyncAt ? ` • ${lastSyncAt}` : ""}
              </span>
            </div>
            <button className="ghost" onClick={() => loadAdminData()}>{t("refresh")}</button>
            <button className="primary-alt" onClick={() => {
              setRestaurantCreateErrors({});
              setShowCreateModal(true);
            }}>{t("add_restaurant")}</button>
          </div>
        </header>

        {statusMessage ? <p className="success">{statusMessage}</p> : null}
        {errorMessage ? <p className="error">{errorMessage}</p> : null}

        <section className="stats-grid">
          {dashboardStats.map((stat) => (
            <article key={stat.label} className={`stat-card ${stat.accent}`}>
              <p>{stat.label}</p>
              <strong>{stat.value}</strong>
              <span>{stat.caption}</span>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <div className="main-column">
            {(activeView === "overview" || activeView === "restaurants") && (
              <article className="panel large-panel">
                <div className="panel-head">
                  <div>
                    <h3>Catalogue restaurants</h3>
                    <p>{t("restaurant_catalog_subtitle")}</p>
                  </div>
                  <input
                    className="search-input"
                    value={restaurantSearch}
                    onChange={(event) => setRestaurantSearch(event.target.value)}
                    placeholder={t("search_restaurant")}
                  />
                </div>

                <div className="restaurant-board">
                  <div className="restaurant-list">
                    {filteredRestaurants.map((restaurant) => (
                      <button
                        key={restaurant.id}
                        className={`restaurant-tile ${selectedRestaurantId === restaurant.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedRestaurantId(restaurant.id);
                          setActiveView("restaurants");
                        }}
                      >
                        <div className="restaurant-tile-top">
                          <strong>{restaurant.name}</strong>
                          <span className="mini-chip">{restaurant.category}</span>
                        </div>
                        <p>{restaurant.shortDescription}</p>
                        <div className="restaurant-tile-meta">
                          <span>{restaurant.deliveryTime}</span>
                          <span>{restaurant.menu.length} {t("dishes")}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="detail-panel">
                    {selectedRestaurant ? (
                      <>
                        <div
                          className="detail-hero"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${selectedRestaurant.heroColor}, #111827)`,
                          }}
                        >
                          <div>
                            <p className="detail-category">{selectedRestaurant.category}</p>
                            <h3>{selectedRestaurant.name}</h3>
                            <p>{selectedRestaurant.address}</p>
                          </div>
                          <div className="detail-badges">
                            <span>★ {selectedRestaurant.rating}</span>
                            <span>{selectedRestaurant.reviewCount} avis</span>
                            <span>{selectedRestaurant.coordinates.latitude}, {selectedRestaurant.coordinates.longitude}</span>
                          </div>
                        </div>

                        <form onSubmit={handleUpdateRestaurant} className="stack compact-stack form-layout">
                          <div className="order-metrics">
                            <span>{selectedRestaurant.validationStatus || "PENDING"}</span>
                            <span>{formatBillingPlan(selectedRestaurant)}</span>
                            <span>{selectedRestaurant.ownerEmail || "owner@n/a"}</span>
                          </div>
                          <FormSection title="Informations principales" hint="Les libelles sont places au-dessus pour une lecture verticale plus rapide.">
                            <div className="split form-grid">
                              <FormField label={t("name")} error={restaurantEditErrors.name}>
                                <input
                                  value={selectedRestaurant.name}
                                  onChange={(event) => updateSelectedRestaurant("name", event.target.value)}
                                  placeholder="La Table du Marche"
                                  required
                                />
                              </FormField>
                              <FormField label={t("category")} error={restaurantEditErrors.category}>
                                <input
                                  value={selectedRestaurant.category}
                                  onChange={(event) => updateSelectedRestaurant("category", event.target.value)}
                                  placeholder="Burgers, Pizza, Sushi..."
                                  required
                                />
                              </FormField>
                            </div>
                            <FormField label={t("short_description")} hint="Resume clair du concept ou des specialites.">
                              <textarea
                                value={selectedRestaurant.shortDescription}
                                onChange={(event) => updateSelectedRestaurant("shortDescription", event.target.value)}
                                placeholder="Cuisine rapide, portions genereuses et livraison soignee."
                              />
                            </FormField>
                          </FormSection>
                          <FormSection title="Operations" hint="Groupez les informations de service pour garder le formulaire compact.">
                            <div className="split form-grid">
                              <FormField label={t("base_preparation")}>
                                <input
                                  value={selectedRestaurant.deliveryTime}
                                  onChange={(event) => updateSelectedRestaurant("deliveryTime", event.target.value)}
                                  placeholder="25-35 min"
                                />
                              </FormField>
                              <FormField label={t("hours")} hint="Exemple: 09:00 - 23:00">
                                <input
                                  value={selectedRestaurant.openingHours}
                                  onChange={(event) => updateSelectedRestaurant("openingHours", event.target.value)}
                                  placeholder="09:00 - 23:00"
                                />
                              </FormField>
                            </div>
                          </FormSection>
                          <FormSection title="Contact et localisation" hint="Les coordonnees GPS sont groupees pour limiter les erreurs.">
                            <div className="split form-grid">
                            <FormField label={t("latitude")} error={restaurantEditErrors.latitude}>
                                <input
                                  value={selectedRestaurant.coordinates.latitude}
                                  onChange={(event) => updateSelectedRestaurantCoordinates("latitude", event.target.value)}
                                  placeholder="36.7525"
                                  inputMode="decimal"
                                />
                              </FormField>
                            <FormField label={t("longitude")} error={restaurantEditErrors.longitude}>
                                <input
                                  value={selectedRestaurant.coordinates.longitude}
                                  onChange={(event) => updateSelectedRestaurantCoordinates("longitude", event.target.value)}
                                  placeholder="3.0420"
                                  inputMode="decimal"
                                />
                              </FormField>
                            </div>
                            <div className="split form-grid">
                              <FormField label="Contact restaurant">
                                <input
                                  value={selectedRestaurant.ownerName || ""}
                                  onChange={(event) => updateSelectedRestaurant("ownerName", event.target.value)}
                                  placeholder="Karim Benali"
                                />
                              </FormField>
                              <FormField label="Email restaurant" error={restaurantEditErrors.ownerEmail}>
                                <input
                                  value={selectedRestaurant.ownerEmail || ""}
                                  onChange={(event) => updateSelectedRestaurant("ownerEmail", event.target.value)}
                                  placeholder="restaurant@exemple.com"
                                  type="email"
                                />
                              </FormField>
                            </div>
                          </FormSection>
                          <button type="submit">Enregistrer les changements</button>
                        </form>

                        <div className="menu-preview">
                          <div className="panel-subhead">
                            <h4>QR code restaurant</h4>
                            <div className="inline-actions">
                              <button type="button" className="ghost small" onClick={() => handleFetchRestaurantQr(selectedRestaurant.id)}>
                                Generer QR
                              </button>
                            </div>
                          </div>
                          <p>Acces direct au menu digital et marquage "QR / Sur place" pour les commandes.</p>
                          <p><strong>Plan:</strong> {formatBillingPlan(selectedRestaurant)}</p>
                          <p><strong>Token API:</strong> {selectedRestaurant.apiToken || "Genere a la validation admin"}</p>
                          <p><strong>QR URL:</strong> {restaurantQrData?.qrUrl || selectedRestaurant.qrCodeUrl || "-"}</p>
                          {restaurantQrData?.qrDataUrl ? (
                            <img src={restaurantQrData.qrDataUrl} alt={`QR ${selectedRestaurant.name}`} className="menu-preview-image" />
                          ) : null}
                        </div>

                        <div className="menu-preview">
                          <div className="panel-subhead">
                            <h4>Menu actuel</h4>
                            <div className="inline-actions">
                              <span>{selectedRestaurant.menu.length} {t("dishes")}</span>
                              <button className="ghost small" onClick={() => {
                                setRestaurantEditErrors({});
                                setShowEditModal(true);
                              }}>Modifier</button>
                              <button
                                className="ghost small selected"
                                onClick={() => {
                                  setSelectedMenuItem(null);
                                  setMenuItemForm(emptyMenuItem);
                                  setMenuImageFile(null);
                                  setMenuItemErrors({});
                                  setShowMenuModal(true);
                                }}
                              >
                                {t("new_dish")}
                              </button>
                            </div>
                          </div>
                          {selectedRestaurant.menu.map((item) => (
                            <div key={item.id} className="menu-row">
                              <div className="menu-row-main">
                                <img src={item.image} alt={item.name} className="menu-thumb" />
                                <div>
                                  <strong>{item.name}</strong>
                                  <p>{item.description}</p>
                                  <p className="menu-secondary">
                                    {item.badge || item.category} • {t("in_stock")}: {item.stock} • {item.isAvailable ? t("available") : t("unavailable")}
                                  </p>
                                </div>
                              </div>
                              <div className="menu-actions">
                                <span>{formatMoney(item.price)}</span>
                                <button className="ghost small" onClick={() => handleMenuStock(item.id, Math.max(0, item.stock - 1))}>-1</button>
                                <button className="ghost small" onClick={() => handleMenuStock(item.id, item.stock + 1)}>+1</button>
                                <button className="ghost small" onClick={() => handleMenuAvailability(item.id, !item.isAvailable)}>
                                  {item.isAvailable ? t("unavailable") : t("available")}
                                </button>
                                <button
                                  className="ghost small"
                                  onClick={() => {
                                    setSelectedMenuItem({
                                      ...item,
                                      options: (item.options || []).map((group) => ({
                                        ...group,
                                        choices: [...(group.choices || [])],
                                      })),
                                    });
                                    setMenuImageFile(null);
                                    setMenuItemErrors({});
                                    setShowMenuModal(true);
                                  }}
                                >
                                  {t("edit")}
                                </button>
                                <button className="ghost small" onClick={() => handleDeleteMenuItem(item.id)}>{t("delete_dish")}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="empty-slot">
                        <h3>Aucun restaurant selectionne</h3>
                        <p>{t("no_restaurant_selected_msg")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )}

            {(activeView === "overview" || activeView === "orders") && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>Flux commandes</h3>
                    <p>{t("orders_flow_subtitle")}</p>
                  </div>
                  <span className="mini-chip strong">{inProgressOrdersCount} en cours</span>
                  {liveInbox.orders ? <span className="alert-badge pulse">{liveInbox.orders} nouvelle(s)</span> : null}
                </div>
                <div className="panel-subhead orders-toolbar">
                  <input
                    className="search-input orders-search"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Rechercher par ID, client, telephone..."
                  />
                  <div className="filter-row">
                    {["All", ...orderStatuses].map((status) => (
                      <button
                        key={status}
                        className={`filter-pill ${orderFilter === status ? "active" : ""}`}
                        onClick={() => setOrderFilter(status)}
                      >
                        {statusLabels[language]?.[status] || status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="orders-grid">
                  {filteredOrders.length ? (
                    filteredOrders.map((order) => (
                      <div key={order.id} className="order-card">
                        <div className="order-head">
                          <div>
                            <strong>{order.restaurantName}</strong>
                            <p>{order.customerName || order.address}</p>
                          </div>
                          <span className={`status-pill ${getStatusTone(order.status)}`}>{order.status}</span>
                        </div>
                        <div className="order-metrics">
                          <span>#{order.id.slice(-8)}</span>
                          <span>{formatOrderCreatedAt(order.createdAt)}</span>
                          <span className="metric-strong">{formatMoney(order.total)}</span>
                          <span>{order.estimatedDeliveryLabel}</span>
                          <span>{order.items.length} article(s)</span>
                          <span>{order.courier?.name || t("assign_courier")}</span>
                          <span className="metric-delivery">{order.channel === "QR_ONSITE" ? "QR / Sur place" : "Livraison"}</span>
                        </div>
                        <div className="button-row quick-actions">
                          <button className="ghost small" onClick={() => setExpandedOrderId((current) => (current === order.id ? "" : order.id))}>
                            {expandedOrderId === order.id ? "Masquer details" : "Voir details"}
                          </button>
                          <button className="ghost small" onClick={() => handleCallNumber(order.customerPhone)}>
                            ☎ Client
                          </button>
                          <button
                            className="ghost small"
                            onClick={() => handleCallNumber(order.courier?.phone)}
                            disabled={!order.courier?.phone}
                          >
                            ☎ Livreur
                          </button>
                          <button className="ghost small" onClick={() => handlePrintKitchenTicket(order)}>
                            🖨 Ticket
                          </button>
                          <button className="ghost small danger-outline" onClick={() => handleCancelOrder(order)}>
                            Annuler / rejeter
                          </button>
                        </div>
                        {expandedOrderId === order.id ? (
                          <div className="order-details">
                            {(order.items || []).map((item, itemIndex) => (
                              <div key={`${order.id}-${item.menuItemId || item.id || itemIndex}`} className="detail-line">
                                <div>
                                  <strong>{item.quantity} x {item.name}</strong>
                                  <p>{formatMoney(item.basePrice || item.price || 0)}</p>
                                </div>
                                <div className="detail-copy">
                                  {(item.selectedOptions || []).length ? (
                                    <p>
                                      <strong>Options:</strong> {(item.selectedOptions || [])
                                        .map((option) => `${option.groupName}: ${option.choiceName}`)
                                        .join(" • ")}
                                    </p>
                                  ) : null}
                                  {item.specialInstructions ? (
                                    <p><strong>Commentaire:</strong> {item.specialInstructions}</p>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                            {order.notes ? <p><strong>Note commande:</strong> {order.notes}</p> : null}
                          </div>
                        ) : null}
                        <select
                          className="inline-select"
                          value={order.courier?.id || ""}
                          onChange={(event) => handleAssignCourier(order.id, event.target.value)}
                        >
                          <option value="">{t("assign_courier")}</option>
                          {couriers.map((courier) => (
                            <option key={courier.id} value={courier.id}>
                              {courier.name}
                            </option>
                          ))}
                        </select>
                        <div className="button-row">
                          {orderStatuses.map((status) => (
                            <button
                              key={status}
                              className={`ghost small ${order.status === status ? "selected" : ""}`}
                              onClick={() => handleOrderStatus(order.id, status)}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-slot">
                      <h3>Aucune commande pour ce filtre</h3>
                      <p>{t("no_order_filter_msg")}</p>
                    </div>
                  )}
                </div>
              </article>
            )}

            {activeView === "overview" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("operations_modules")}</h3>
                    <p>{t("operations_modules_subtitle")}</p>
                  </div>
                </div>
                <div className="module-grid">
                  {operationsModules.map((module) => (
                    <div key={module.label} className="module-card">
                      <p>{module.label}</p>
                      <strong>{module.value}</strong>
                      <span>{module.caption}</span>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {activeView === "customers" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("customers_title")}</h3>
                    <p>{t("customers")}</p>
                  </div>
                </div>
                <div className="orders-grid">
                  {customers.map((customer) => (
                    <div key={customer.id} className="order-card">
                      <div className="order-head">
                        <div>
                          <strong>{customer.name}</strong>
                          <p>{customer.email}</p>
                        </div>
                        <span className={`status-pill ${customer.isActive ? "success" : "neutral"}`}>
                          {customer.isActive ? t("active") : t("inactive")}
                        </span>
                      </div>
                      <div className="order-metrics">
                        <span>{customer.ordersCount} cmd</span>
                        <span>{customer.loyaltyPoints} pts</span>
                        <span>{customer.favoritesCount} fav</span>
                      </div>
                      <button className="ghost small" onClick={() => handleCustomerToggle(customer)}>
                        {customer.isActive ? t("inactive") : t("active")}
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {activeView === "applications" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("applications_title")}</h3>
                    <p>{t("applications_subtitle")}</p>
                  </div>
                  <span className="mini-chip strong">{pendingApplicationsCount} en attente</span>
                  {liveInbox.applications ? (
                    <span className="alert-badge pulse soft">{liveInbox.applications} nouvelle(s)</span>
                  ) : null}
                </div>
                <div className="orders-grid">
                  {applications.length ? (
                    applications.map((application) => (
                      <div key={application.id} className="order-card">
                        <div className="order-head">
                          <div>
                            <strong>{application.applicantName}</strong>
                            <p>{application.type === "RESTAURANT" ? t("restaurants") : t("couriers_nav")}</p>
                          </div>
                          <span className={`status-pill ${
                            application.status === "ACCEPTED"
                              ? "success"
                              : application.status === "REJECTED"
                              ? "neutral"
                              : "warning"
                          }`}>
                            {application.status === "ACCEPTED"
                              ? t("accepted")
                              : application.status === "REJECTED"
                              ? t("rejected")
                              : t("pending")}
                          </span>
                        </div>
                        <div className="order-metrics">
                          <span>{formatOrderCreatedAt(application.createdAt || application.updatedAt)}</span>
                          <span>{application.email}</span>
                          <span>{application.phone}</span>
                          <span>{application.city}</span>
                          <span>{application.businessName || application.vehicle || t("none")}</span>
                        </div>
                        <div className="application-details">
                          {application.restaurantCategory ? <p>{application.restaurantCategory}</p> : null}
                          {application.address ? <p>{application.address}</p> : null}
                          {application.zone ? <p>{application.zone}</p> : null}
                          {application.type === "RESTAURANT" ? <p><strong>Plan:</strong> {formatBillingPlan(application)}</p> : null}
                          {application.generatedApiToken ? <p><strong>Token API:</strong> {application.generatedApiToken}</p> : null}
                          {application.qrCodeUrl ? <p><strong>URL QR:</strong> {application.qrCodeUrl}</p> : null}
                          {application.notes ? <p>{application.notes}</p> : null}
                          {application.linkedEntityLabel ? (
                            <p>
                              <strong>{t("linked_entity")}:</strong> {application.linkedEntityLabel}
                            </p>
                          ) : null}
                          {application.linkedEntityType === "RESTAURANT" ? (
                            <p>
                              <strong>{t("draft_restaurant")}:</strong> {application.linkedEntityId ? "Oui" : "Non"}
                            </p>
                          ) : null}
                        </div>
                        <div className="button-row">
                          <button className="ghost small" onClick={() => handleApplicationStatus(application.id, "PENDING")}>
                            {t("pending")}
                          </button>
                          <button className="ghost small" onClick={() => handleApplicationStatus(application.id, "ACCEPTED")}>
                            {t("accepted")}
                          </button>
                          <button className="ghost small" onClick={() => handleApplicationStatus(application.id, "REJECTED")}>
                            {t("rejected")}
                          </button>
                          <a className="ghost small action-link" href={`mailto:${application.email}?subject=FoodDelyvry`}>
                            {t("contact")}
                          </a>
                          {application.linkedEntityType === "RESTAURANT" ? (
                            <button className="ghost small" onClick={() => openCreatedRestaurant(application)}>
                              {t("open_created_restaurant")}
                            </button>
                          ) : null}
                          {application.linkedEntityType === "RESTAURANT" ? (
                            <button className="ghost small" onClick={() => handleActivateApplicationRestaurant(application.id)}>
                              {t("activate_restaurant")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-slot">
                      <h3>{t("no_applications")}</h3>
                      <p>{t("applications_subtitle")}</p>
                    </div>
                  )}
                </div>
                <div className="panel-head vertical">
                  <div>
                    <h3>{t("email_notifications")}</h3>
                    <p>{t("applications_subtitle")}</p>
                  </div>
                </div>
                <div className="orders-grid">
                  {emailOutbox.length ? (
                    emailOutbox.slice(0, 8).map((email) => (
                      <div key={email.id} className="order-card">
                        <div className="order-head">
                          <div>
                            <strong>{email.subject}</strong>
                            <p>{email.to}</p>
                          </div>
                          <span className="status-pill info">{email.status}</span>
                        </div>
                        <div className="application-details">
                          <p>{email.text}</p>
                          <p>{email.createdAt}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-slot">
                      <h3>{t("email_notifications")}</h3>
                      <p>{t("none")}</p>
                    </div>
                  )}
                </div>
              </article>
            )}

            {activeView === "categories" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("categories_title")}</h3>
                    <p>{t("dish_category")}</p>
                  </div>
                  <button className="primary-alt" onClick={openCreateCategoryModal}>{t("create_category")}</button>
                </div>
                <div className="category-admin-grid">
                  <div className="empty-slot form-placeholder">
                    <h3>{t("create_category")}</h3>
                    <p>Utilisez la fenetre surgissante pour ajouter ou modifier une categorie.</p>
                    <button className="ghost" onClick={openCreateCategoryModal}>{t("create_category")}</button>
                  </div>

                  <div className="category-list">
                    {menuCategories.length ? (
                      menuCategories.map((category) => (
                        <div key={category.id} className="category-row-card">
                          <div className="tableish-row">
                            <strong>{category.name}</strong>
                            <span className="mini-chip">#{category.sortOrder}</span>
                          </div>
                          <div className="button-row">
                            <span className={`status-pill ${category.isActive ? "success" : "neutral"}`}>
                              {category.isActive ? t("active") : t("inactive")}
                            </span>
                            <button className="ghost small" onClick={() => openEditCategoryModal(category)}>{t("edit")}</button>
                            <button className="ghost small" onClick={() => handleDeleteMenuCategory(category.id)}>{t("delete")}</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-slot">
                        <h3>{t("no_categories")}</h3>
                        <p>{t("create_category")}</p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )}

            {activeView === "couriers" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("couriers_title")}</h3>
                    <p>{t("logistics")}</p>
                  </div>
                  <button className="primary-alt" onClick={openCreateCourierModal}>{t("create_courier")}</button>
                </div>
                <div className="orders-grid">
                  {couriers.map((courier) => (
                    <div key={courier.id} className="order-card">
                      <div className="order-head">
                        <div>
                          <strong>{courier.name}</strong>
                          <p>{courier.phone} • {courier.vehicle}</p>
                        </div>
                        <span className={`status-pill ${courier.status === "AVAILABLE" ? "success" : courier.status === "ON_DELIVERY" ? "info" : "neutral"}`}>
                          {courier.status}
                        </span>
                      </div>
                      <div className="order-metrics">
                        <span>{courier.zoneLabel || "-"}</span>
                        <span>{courier.activeOrders} active</span>
                        <span>{courier.deliveredOrders} delivered</span>
                      </div>
                      <div className="button-row">
                        <button className="ghost small" onClick={() => openEditCourierModal(courier)}>{t("edit")}</button>
                        <button className="ghost small" onClick={() => handleCourierStatus(courier, "AVAILABLE")}>AVAILABLE</button>
                        <button className="ghost small" onClick={() => handleCourierStatus(courier, "ON_DELIVERY")}>ON_DELIVERY</button>
                        <button className="ghost small" onClick={() => handleCourierStatus(courier, "OFFLINE")}>OFFLINE</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {activeView === "promotions" && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("promotions_title")}</h3>
                    <p>{t("promotions")}</p>
                  </div>
                  <button className="primary-alt" onClick={openCreatePromotionModal}>{t("create_promotion")}</button>
                </div>
                <div className="orders-grid">
                  {promotions.map((promotion) => (
                    <div key={promotion.id} className="order-card">
                      <div className="order-head">
                        <div>
                          <strong>{promotion.title}</strong>
                          <p>{promotion.code}</p>
                        </div>
                        <span className={`status-pill ${promotion.isActive ? "success" : "neutral"}`}>
                          {promotion.isActive ? t("active") : t("inactive")}
                        </span>
                      </div>
                      <div className="order-metrics">
                        <span>{promotion.type}</span>
                        <span>{promotion.value}</span>
                        <span>{promotion.usageCount} uses</span>
                      </div>
                      <div className="button-row">
                        <span>{promotion.restaurantName || t("restaurants")}</span>
                        <button className="ghost small" onClick={() => openEditPromotionModal(promotion)}>{t("edit")}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {activeView === "reports" && reports && (
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <h3>{t("reports_title")}</h3>
                    <p>{t("analytics")}</p>
                  </div>
                </div>
                <div className="module-grid">
                  <div className="module-card"><p>CA</p><strong>{formatMoney(reports.totals.revenue)}</strong><span>{reports.totals.orders} orders</span></div>
                  <div className="module-card"><p>{t("average_basket")}</p><strong>{formatMoney(reports.totals.averageBasket)}</strong><span>{t("finance")}</span></div>
                  <div className="module-card"><p>{t("low_stock")}</p><strong>{reports.totals.lowStockItems}</strong><span>{t("inventory")}</span></div>
                </div>
                <div className="chart-grid">
                  <div className="chart-card">
                    <h4>Top Restaurants</h4>
                    <div className="bar-chart">
                      {reports.topRestaurants.map((entry) => (
                        <div key={entry.restaurantId} className="bar-row">
                          <span>{entry.name}</span>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{ width: `${reports.topRestaurants[0]?.revenue ? (entry.revenue / reports.topRestaurants[0].revenue) * 100 : 0}%` }}
                            />
                          </div>
                          <strong>{formatMoney(entry.revenue)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="chart-card">
                    <h4>Couriers</h4>
                    <div className="bar-chart">
                      {reports.courierPerformance.map((entry) => (
                        <div key={entry.id} className="bar-row">
                          <span>{entry.name}</span>
                          <div className="bar-track">
                            <div
                              className="bar-fill alt"
                              style={{ width: `${reports.courierPerformance[0]?.deliveredOrders ? (entry.deliveredOrders / Math.max(reports.courierPerformance[0].deliveredOrders, 1)) * 100 : 8}%` }}
                            />
                          </div>
                          <strong>{entry.deliveredOrders}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="orders-grid">
                  {reports.topRestaurants.map((entry) => (
                    <div key={entry.restaurantId} className="order-card">
                      <strong>{entry.name}</strong>
                      <div className="order-metrics">
                        <span>{entry.orders} orders</span>
                        <span>{formatMoney(entry.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>

          <aside className="side-column">
            <article className="panel">
              <div className="panel-head vertical">
                <div>
                  <h3>Resume operationnel</h3>
                  <p>{t("summary_subtitle")}</p>
                </div>
              </div>
              <div className="insight-list">
                <div className="insight-row">
                  <span>{t("active_restaurant")}</span>
                  <strong>{selectedRestaurant?.name || t("none")}</strong>
                </div>
                <div className="insight-row">
                  <span>{t("delivered_orders")}</span>
                  <strong>{orders.filter((order) => order.status === "Delivered").length}</strong>
                </div>
                <div className="insight-row">
                  <span>{t("preparing")}</span>
                  <strong>{orders.filter((order) => order.status === "Preparing").length}</strong>
                </div>
                <div className="insight-row">
                  <span>{t("on_the_way")}</span>
                  <strong>{orders.filter((order) => order.status === "On the way").length}</strong>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </section>

      <AdminDialog
        open={showCreateModal}
        title={t("new_restaurant")}
        subtitle="Creation rapide depuis la liste sans quitter le tableau de bord."
        onClose={() => {
          setRestaurantCreateErrors({});
          setShowCreateModal(false);
        }}
        size="lg"
      >
            <form onSubmit={handleCreateRestaurant} className="stack compact-stack form-layout">
              <FormSection title="Informations principales" hint="Commencez par les informations visibles dans le catalogue.">
                <div className="split form-grid">
                  <FormField label={t("name")} error={restaurantCreateErrors.name}>
                    <input value={restaurantForm.name} onChange={(event) => setRestaurantForm({ ...restaurantForm, name: event.target.value })} placeholder="La Table du Marche" required />
                  </FormField>
                  <FormField label={t("category")} hint="Exemple: Burgers, Pizza, Sushi" error={restaurantCreateErrors.category}>
                    <input value={restaurantForm.category} onChange={(event) => setRestaurantForm({ ...restaurantForm, category: event.target.value })} placeholder="Burgers" required />
                  </FormField>
                </div>
                <FormField label={t("short_description")} hint="Une phrase simple pour resumer l'identite du restaurant.">
                  <textarea value={restaurantForm.shortDescription} onChange={(event) => setRestaurantForm({ ...restaurantForm, shortDescription: event.target.value })} placeholder="Cuisine familiale, livraison rapide et plats signatures." />
                </FormField>
                <FormField label={t("address")} error={restaurantCreateErrors.address}>
                  <input value={restaurantForm.address} onChange={(event) => setRestaurantForm({ ...restaurantForm, address: event.target.value })} placeholder="12 Rue Didouche Mourad, Alger" required />
                </FormField>
              </FormSection>

              <FormSection title="Contact" hint="Ces donnees servent a envoyer les acces et joindre le restaurant.">
                <div className="split form-grid">
                  <FormField label="Contact restaurant">
                    <input value={restaurantForm.ownerName} onChange={(event) => setRestaurantForm({ ...restaurantForm, ownerName: event.target.value })} placeholder="Karim Benali" />
                  </FormField>
                  <FormField label={t("phone")} hint="Exemple: 06 00 00 00 00" error={restaurantCreateErrors.ownerPhone}>
                    <input value={restaurantForm.ownerPhone} onChange={(event) => setRestaurantForm({ ...restaurantForm, ownerPhone: event.target.value })} placeholder="06 00 00 00 00" type="tel" />
                  </FormField>
                </div>
                <FormField label="Email restaurant" hint="Le compte restaurant sera rattache a cette adresse." error={restaurantCreateErrors.ownerEmail}>
                  <input value={restaurantForm.ownerEmail} onChange={(event) => setRestaurantForm({ ...restaurantForm, ownerEmail: event.target.value })} placeholder="restaurant@exemple.com" type="email" />
                </FormField>
              </FormSection>

              <FormSection title="Visuels et planning" hint="Ajoutez une image et verifiez les horaires d'ouverture.">
                <FormField label="URL image restaurant" hint="Vous pouvez coller une URL au lieu d'uploader un fichier.">
                  <input
                    value={restaurantForm.image}
                    onChange={(event) => setRestaurantForm({ ...restaurantForm, image: event.target.value })}
                    placeholder="https://.../restaurant.jpg"
                  />
                </FormField>
                <FormField label="Photo du restaurant" hint="Format recommande: image paysage nette et legere.">
                  <input type="file" accept="image/*" onChange={(event) => setRestaurantImageFile(event.target.files?.[0] || null)} />
                </FormField>
                {restaurantImageFile ? <p className="upload-hint">{restaurantImageFile.name}</p> : null}
                <ImagePreview src={restaurantForm.image} alt={restaurantForm.name || "Apercu restaurant"} />
                <div className="stack schedule-block">
                <label className="field-label">{t("weekly_schedule")}</label>
                {weekdayDefinitions.map((day) => {
                  const currentDay = restaurantForm.weeklyHours[day.key];
                  return (
                    <div key={day.key} className="schedule-row">
                      <strong>{language === "ar" ? day.ar : day.fr}</strong>
                      <label className="toggle-inline">
                        <input
                          type="checkbox"
                          checked={!currentDay.enabled}
                          onChange={(event) =>
                            setRestaurantForm({
                              ...restaurantForm,
                              weeklyHours: {
                                ...restaurantForm.weeklyHours,
                                [day.key]: {
                                  ...currentDay,
                                  enabled: !event.target.checked,
                                },
                              },
                            })
                          }
                        />
                        <span>{t("closed")}</span>
                      </label>
                      <input
                        type="time"
                        value={currentDay.open}
                        disabled={!currentDay.enabled}
                        onChange={(event) =>
                          setRestaurantForm({
                            ...restaurantForm,
                            weeklyHours: {
                              ...restaurantForm.weeklyHours,
                              [day.key]: {
                                ...currentDay,
                                open: event.target.value,
                              },
                            },
                          })
                        }
                      />
                      <input
                        type="time"
                        value={currentDay.close}
                        disabled={!currentDay.enabled}
                        onChange={(event) =>
                          setRestaurantForm({
                            ...restaurantForm,
                            weeklyHours: {
                              ...restaurantForm.weeklyHours,
                              [day.key]: {
                                ...currentDay,
                                close: event.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  );
                })}
                </div>
              </FormSection>

              <FormSection title="Operations et geolocalisation" hint="Regroupez les donnees de service et de GPS pour gagner en lisibilite.">
                <FormField label={t("base_preparation")} hint="Exemple: 20-30 min">
                  <input value={restaurantForm.deliveryTime} onChange={(event) => setRestaurantForm({ ...restaurantForm, deliveryTime: event.target.value })} placeholder="20-30 min" />
                </FormField>
                <div className="split form-grid">
                  <FormField label={t("latitude")} error={restaurantCreateErrors.latitude}>
                    <input value={restaurantForm.coordinates.latitude} onChange={(event) => setRestaurantForm({ ...restaurantForm, coordinates: { ...restaurantForm.coordinates, latitude: event.target.value } })} placeholder="36.7525" inputMode="decimal" />
                  </FormField>
                  <FormField label={t("longitude")} error={restaurantCreateErrors.longitude}>
                    <input value={restaurantForm.coordinates.longitude} onChange={(event) => setRestaurantForm({ ...restaurantForm, coordinates: { ...restaurantForm.coordinates, longitude: event.target.value } })} placeholder="3.0420" inputMode="decimal" />
                  </FormField>
                </div>
                <FormField label="Tags" hint="Separez les mots-cles par des virgules.">
                  <input value={restaurantForm.tags} onChange={(event) => setRestaurantForm({ ...restaurantForm, tags: event.target.value })} placeholder="Burger, Family, Livraison rapide" />
                </FormField>
              </FormSection>
              <button type="submit">{t("publish_restaurant")}</button>
            </form>
      </AdminDialog>

      <AdminDialog
        open={showEditModal && selectedRestaurant}
        title={selectedRestaurant ? `${t("edit")} ${selectedRestaurant.name}` : t("edit")}
        subtitle="Modification en contexte avec retour automatique sur la liste mise a jour."
        onClose={() => {
          setRestaurantEditErrors({});
          setShowEditModal(false);
        }}
        size="lg"
      >
        {selectedRestaurant ? (
            <form onSubmit={handleUpdateRestaurant} className="stack compact-stack form-layout">
              <FormSection title="Identite du restaurant" hint="Modifiez les informations affichables sans quitter la fiche.">
                <div className="split form-grid">
                  <FormField label={t("name")} error={restaurantEditErrors.name}>
                    <input
                      value={selectedRestaurant.name}
                      onChange={(event) => updateSelectedRestaurant("name", event.target.value)}
                      placeholder="La Table du Marche"
                      required
                    />
                  </FormField>
                  <FormField label={t("category")} error={restaurantEditErrors.category}>
                    <input
                      value={selectedRestaurant.category}
                      onChange={(event) => updateSelectedRestaurant("category", event.target.value)}
                      placeholder="Burgers"
                      required
                    />
                  </FormField>
                </div>
                <FormField label={t("short_description")}>
                  <textarea
                    value={selectedRestaurant.shortDescription}
                    onChange={(event) => updateSelectedRestaurant("shortDescription", event.target.value)}
                    placeholder="Cuisine familiale, livraison rapide et plats signatures."
                  />
                </FormField>
                <FormField label="URL image restaurant">
                  <input
                    value={selectedRestaurant.image || ""}
                    onChange={(event) => updateSelectedRestaurant("image", event.target.value)}
                    placeholder="https://.../restaurant.jpg"
                  />
                </FormField>
                <FormField label="Photo du restaurant">
                  <input type="file" accept="image/*" onChange={(event) => setRestaurantImageFile(event.target.files?.[0] || null)} />
                </FormField>
                {restaurantImageFile ? <p className="upload-hint">{restaurantImageFile.name}</p> : null}
                <ImagePreview src={selectedRestaurant.image} alt={selectedRestaurant.name || "Apercu restaurant"} />
              </FormSection>
              <FormSection title="Operations" hint="Gardez les informations de service et de localisation ensemble.">
                <div className="split form-grid">
                  <FormField label={t("base_preparation")}>
                    <input
                      value={selectedRestaurant.deliveryTime}
                      onChange={(event) => updateSelectedRestaurant("deliveryTime", event.target.value)}
                      placeholder="20-30 min"
                    />
                  </FormField>
                  <FormField label={t("hours")} hint="Exemple: 09:00 - 23:00">
                    <input
                      value={selectedRestaurant.openingHours}
                      onChange={(event) => updateSelectedRestaurant("openingHours", event.target.value)}
                      placeholder="09:00 - 23:00"
                    />
                  </FormField>
                </div>
                <div className="split form-grid">
                  <FormField label={t("latitude")} error={restaurantEditErrors.latitude}>
                    <input
                      value={selectedRestaurant.coordinates.latitude}
                      onChange={(event) => updateSelectedRestaurantCoordinates("latitude", event.target.value)}
                      placeholder="36.7525"
                      inputMode="decimal"
                    />
                  </FormField>
                  <FormField label={t("longitude")} error={restaurantEditErrors.longitude}>
                    <input
                      value={selectedRestaurant.coordinates.longitude}
                      onChange={(event) => updateSelectedRestaurantCoordinates("longitude", event.target.value)}
                      placeholder="3.0420"
                      inputMode="decimal"
                    />
                  </FormField>
                </div>
              </FormSection>
              <button type="submit">Enregistrer les changements</button>
            </form>
        ) : null}
      </AdminDialog>

      <AdminDialog
        open={showMenuModal}
        title={selectedMenuItem ? t("edit_dish") : t("new_dish")}
        subtitle="Edition du menu sans quitter la fiche restaurant."
        onClose={() => {
          setMenuItemErrors({});
          setShowMenuModal(false);
        }}
        size="lg"
      >
            <form onSubmit={selectedMenuItem ? handleUpdateMenuItem : handleAddMenuItem} className="stack compact-stack form-layout">
              <FormSection title="Informations du plat" hint="Les champs principaux sont regroupes pour une saisie plus fluide.">
                <FormField label={t("dish_name")} error={menuItemErrors.name}>
                  <input
                    value={selectedMenuItem ? selectedMenuItem.name : menuItemForm.name}
                    onChange={(event) =>
                      selectedMenuItem
                        ? setSelectedMenuItem({ ...selectedMenuItem, name: event.target.value })
                        : setMenuItemForm({ ...menuItemForm, name: event.target.value })
                    }
                    placeholder="Burger signature"
                    required
                  />
                </FormField>
                <FormField label={t("description")} hint="Quelques mots pour donner envie et preciser les ingredients.">
                  <textarea
                    value={selectedMenuItem ? selectedMenuItem.description : menuItemForm.description}
                    onChange={(event) =>
                      selectedMenuItem
                        ? setSelectedMenuItem({ ...selectedMenuItem, description: event.target.value })
                        : setMenuItemForm({ ...menuItemForm, description: event.target.value })
                    }
                    placeholder="Pain artisanal, steak grille, cheddar fondu et sauce maison."
                  />
                </FormField>
                <div className="split form-grid">
                  <FormField label={t("price")} hint="Exemple: 1250" error={menuItemErrors.price}>
                    <input
                      value={selectedMenuItem ? selectedMenuItem.price : menuItemForm.price}
                      onChange={(event) =>
                        selectedMenuItem
                          ? setSelectedMenuItem({ ...selectedMenuItem, price: event.target.value })
                          : setMenuItemForm({ ...menuItemForm, price: event.target.value })
                      }
                      placeholder="1250"
                      inputMode="decimal"
                      required
                    />
                  </FormField>
                  <FormField label={t("dish_category")} error={menuItemErrors.category}>
                    <select
                      value={selectedMenuItem ? selectedMenuItem.category : menuItemForm.category}
                      onChange={(event) =>
                        selectedMenuItem
                          ? setSelectedMenuItem({ ...selectedMenuItem, category: event.target.value })
                          : setMenuItemForm({ ...menuItemForm, category: event.target.value })
                      }
                    >
                      {availableMealCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </FormSection>
              <FormSection title="Presentation et disponibilite" hint="Ajoutez les metadonnees utiles a l'affichage du menu.">
                <div className="split form-grid">
                  <FormField label={t("badge")} hint="Exemple: Best seller">
                    <input
                      value={selectedMenuItem ? selectedMenuItem.badge || "" : menuItemForm.badge}
                      onChange={(event) =>
                        selectedMenuItem
                          ? setSelectedMenuItem({ ...selectedMenuItem, badge: event.target.value })
                          : setMenuItemForm({ ...menuItemForm, badge: event.target.value })
                      }
                      placeholder="Best seller"
                    />
                  </FormField>
                  <FormField label={t("calories")} hint="Optionnel" error={menuItemErrors.calories}>
                    <input
                      value={selectedMenuItem ? selectedMenuItem.calories || "" : menuItemForm.calories}
                      onChange={(event) =>
                        selectedMenuItem
                          ? setSelectedMenuItem({ ...selectedMenuItem, calories: event.target.value })
                          : setMenuItemForm({ ...menuItemForm, calories: event.target.value })
                      }
                      placeholder="780"
                    />
                  </FormField>
                </div>
                <div className="split form-grid">
                  <FormField label={t("in_stock")} error={menuItemErrors.stock}>
                    <input
                      value={selectedMenuItem ? selectedMenuItem.stock || 0 : menuItemForm.stock}
                      onChange={(event) =>
                        selectedMenuItem
                          ? setSelectedMenuItem({ ...selectedMenuItem, stock: event.target.value })
                          : setMenuItemForm({ ...menuItemForm, stock: event.target.value })
                      }
                      placeholder="25"
                      type="number"
                    />
                  </FormField>
                  <FormField label={t("availability")}>
                    <label className="toggle-inline toggle-card">
                      <input
                        type="checkbox"
                        checked={selectedMenuItem ? Boolean(selectedMenuItem.isAvailable) : Boolean(menuItemForm.isAvailable)}
                        onChange={(event) =>
                          selectedMenuItem
                            ? setSelectedMenuItem({ ...selectedMenuItem, isAvailable: event.target.checked })
                            : setMenuItemForm({ ...menuItemForm, isAvailable: event.target.checked })
                        }
                      />
                      <span>{t("availability")}</span>
                    </label>
                  </FormField>
                </div>
                <FormField label={t("menu_photo")}>
                  <input type="file" accept="image/*" onChange={(event) => setMenuImageFile(event.target.files?.[0] || null)} />
                </FormField>
                <FormField label="URL image plat" hint="URL externe ou asset uploadé.">
                  <input
                    value={selectedMenuItem ? selectedMenuItem.image || "" : menuItemForm.image}
                    onChange={(event) =>
                      selectedMenuItem
                        ? setSelectedMenuItem({ ...selectedMenuItem, image: event.target.value })
                        : setMenuItemForm({ ...menuItemForm, image: event.target.value })
                    }
                    placeholder="https://.../dish.jpg"
                  />
                </FormField>
              </FormSection>
              {selectedMenuItem?.image ? <img src={selectedMenuItem.image} alt={selectedMenuItem.name} className="menu-preview-image" /> : null}
              {!selectedMenuItem?.image && menuItemForm.image ? <img src={menuItemForm.image} alt="Apercu plat" className="menu-preview-image" /> : null}
              {menuImageFile ? <p className="upload-hint">{menuImageFile.name}</p> : null}
                <div className="option-editor">
                  <div className="option-editor-head">
                    <strong>{t("item_options")}</strong>
                    <button
                    type="button"
                    className="ghost small"
                    onClick={selectedMenuItem ? addSelectedMenuOptionGroup : addMenuFormOptionGroup}
                    >
                      {t("add_option_group")}
                    </button>
                  </div>
                  <p className="field-hint">{t("option_config_hint")}</p>
                  {(selectedMenuItem ? selectedMenuItem.options || [] : menuItemForm.options || []).map((group) => (
                  <div key={group.id} className="option-group-card">
                    <div className="split">
                      <input
                        value={group.name}
                        onChange={(event) =>
                          selectedMenuItem
                            ? updateSelectedMenuOptionGroup(group.id, "name", event.target.value)
                            : updateMenuFormOptionGroup(group.id, "name", event.target.value)
                        }
                        placeholder={`${t("option_group_name")} • ${t("option_choice_hint")}`}
                      />
                      <button
                        type="button"
                        className="ghost small"
                        onClick={() =>
                          selectedMenuItem
                            ? removeSelectedMenuOptionGroup(group.id)
                            : removeMenuFormOptionGroup(group.id)
                        }
                      >
                        {t("remove_group")}
                      </button>
                    </div>
                    <div className="split option-switches">
                      <label className="toggle-inline toggle-card">
                        <input
                          type="checkbox"
                          checked={Boolean(group.required)}
                          onChange={(event) =>
                            selectedMenuItem
                              ? updateSelectedMenuOptionGroup(group.id, "required", event.target.checked)
                              : updateMenuFormOptionGroup(group.id, "required", event.target.checked)
                          }
                        />
                        <span>{t("option_required")}</span>
                      </label>
                      <label className="toggle-inline toggle-card">
                        <input
                          type="checkbox"
                          checked={Boolean(group.multiple)}
                          onChange={(event) =>
                            selectedMenuItem
                              ? updateSelectedMenuOptionGroup(group.id, "multiple", event.target.checked)
                              : updateMenuFormOptionGroup(group.id, "multiple", event.target.checked)
                          }
                        />
                        <span>{t("option_multiple")}</span>
                      </label>
                    </div>
                    <div className="choice-list">
                      {group.choices.map((choice) => (
                        <div key={choice.id} className="split choice-row">
                          <input
                            value={choice.name}
                            onChange={(event) =>
                              selectedMenuItem
                                ? updateSelectedMenuChoice(group.id, choice.id, "name", event.target.value)
                                : updateMenuFormChoice(group.id, choice.id, "name", event.target.value)
                            }
                            placeholder={t("choice_name")}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={choice.priceDelta}
                            onChange={(event) =>
                              selectedMenuItem
                                ? updateSelectedMenuChoice(group.id, choice.id, "priceDelta", event.target.value)
                                : updateMenuFormChoice(group.id, choice.id, "priceDelta", event.target.value)
                            }
                            placeholder={t("choice_price_hint")}
                          />
                          <button
                            type="button"
                            className="ghost small"
                            onClick={() =>
                              selectedMenuItem
                                ? removeSelectedMenuChoice(group.id, choice.id)
                                : removeMenuFormChoice(group.id, choice.id)
                            }
                          >
                            {t("remove_choice")}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="ghost small"
                      onClick={() =>
                        selectedMenuItem ? addSelectedMenuChoice(group.id) : addMenuFormChoice(group.id)
                      }
                    >
                      {t("add_option_choice")}
                    </button>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={!selectedRestaurantId}>
                {selectedMenuItem ? t("update_dish") : t("add_to_menu")}
              </button>
            </form>
      </AdminDialog>

      <AdminDialog
        open={showCourierModal}
        title={selectedCourier ? `${t("edit")} ${selectedCourier.name}` : t("create_courier")}
        subtitle="Creation et modification des livreurs dans une fenetre dediee."
        onClose={() => {
          resetCourierForm();
          setShowCourierModal(false);
        }}
      >
        <form onSubmit={selectedCourier ? handleUpdateCourier : handleCreateCourier} className="stack compact-stack form-layout">
          <FormSection title="Identite du livreur" hint="Les informations principales sont groupees pour aller plus vite.">
            <div className="split form-grid">
              <FormField label={t("name")} error={courierErrors.name}>
                <input
                  value={selectedCourier ? selectedCourier.name : courierForm.name}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, name: event.target.value })
                      : setCourierForm({ ...courierForm, name: event.target.value })
                  }
                  placeholder="Yacine Amrani"
                  required
                />
              </FormField>
              <FormField label={t("phone")} hint="Exemple: 06 00 00 00 00" error={courierErrors.phone}>
                <input
                  value={selectedCourier ? selectedCourier.phone : courierForm.phone}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, phone: event.target.value })
                      : setCourierForm({ ...courierForm, phone: event.target.value })
                  }
                  placeholder="06 00 00 00 00"
                  type="tel"
                  required
                />
              </FormField>
            </div>
          </FormSection>
          <FormSection title="Statut et zone" hint="Regroupez l'affectation et la disponibilite du livreur.">
            <div className="split form-grid">
              <FormField label={t("vehicle")} error={courierErrors.vehicle}>
                <select
                  className="inline-select"
                  value={selectedCourier ? selectedCourier.vehicle : courierForm.vehicle}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, vehicle: event.target.value })
                      : setCourierForm({ ...courierForm, vehicle: event.target.value })
                  }
                  required
                >
                  <option value="">{t("vehicle")}</option>
                  <option value="Scooter">{t("scooter")}</option>
                  <option value="Car">{t("car")}</option>
                  <option value="E-bike">{t("ebike")}</option>
                </select>
              </FormField>
              <FormField label="Statut">
                <select
                  className="inline-select"
                  value={selectedCourier ? selectedCourier.status : courierForm.status}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, status: event.target.value })
                      : setCourierForm({ ...courierForm, status: event.target.value })
                  }
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="ON_DELIVERY">ON_DELIVERY</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </FormField>
            </div>
            <FormField label={t("zone")}>
              <input
                value={selectedCourier ? selectedCourier.zoneLabel : courierForm.zoneLabel}
                onChange={(event) =>
                  selectedCourier
                    ? setSelectedCourier({ ...selectedCourier, zoneLabel: event.target.value })
                    : setCourierForm({ ...courierForm, zoneLabel: event.target.value })
                }
                placeholder="Centre-ville"
              />
            </FormField>
          </FormSection>
          <FormSection title="Position GPS" hint="Facultatif pour le suivi live du livreur.">
            <div className="split form-grid">
              <FormField label={t("latitude")} error={courierErrors.currentLat}>
                <input
                  value={selectedCourier ? selectedCourier.currentLat ?? "" : courierForm.currentLat}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, currentLat: event.target.value })
                      : setCourierForm({ ...courierForm, currentLat: event.target.value })
                  }
                  placeholder="36.7525"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t("longitude")} error={courierErrors.currentLng}>
                <input
                  value={selectedCourier ? selectedCourier.currentLng ?? "" : courierForm.currentLng}
                  onChange={(event) =>
                    selectedCourier
                      ? setSelectedCourier({ ...selectedCourier, currentLng: event.target.value })
                      : setCourierForm({ ...courierForm, currentLng: event.target.value })
                  }
                  placeholder="3.0420"
                  inputMode="decimal"
                />
              </FormField>
            </div>
          </FormSection>
          <button type="submit">{selectedCourier ? t("save_changes") : t("create_courier")}</button>
        </form>
      </AdminDialog>

      <AdminDialog
        open={showCategoryModal}
        title={selectedCategory ? `${t("edit")} ${selectedCategory.name}` : t("create_category")}
        subtitle="Gestion rapide des categories avec fermeture automatique apres validation."
        onClose={() => {
          resetCategoryModal();
          setShowCategoryModal(false);
        }}
      >
        <form onSubmit={handleCategoryModalSubmit} className="stack compact-stack form-layout">
          <FormSection title="Categorie du menu" hint="Utilisez un nom court et un ordre d'affichage clair.">
            <FormField label={t("category_name")} error={categoryErrors.name}>
              <input
                value={menuCategoryForm.name}
                onChange={(event) => setMenuCategoryForm({ ...menuCategoryForm, name: event.target.value })}
                placeholder="Burgers signatures"
                required
              />
            </FormField>
            <div className="split form-grid">
              <FormField label={t("sort_order")} error={categoryErrors.sortOrder}>
                <input
                  type="number"
                  value={menuCategoryForm.sortOrder}
                  onChange={(event) => setMenuCategoryForm({ ...menuCategoryForm, sortOrder: event.target.value })}
                  placeholder="1"
                />
              </FormField>
              <FormField label="Visibilite">
                <label className="toggle-inline toggle-card">
                  <input
                    type="checkbox"
                    checked={Boolean(menuCategoryForm.isActive)}
                    onChange={(event) => setMenuCategoryForm({ ...menuCategoryForm, isActive: event.target.checked })}
                  />
                  <span>{menuCategoryForm.isActive ? t("active") : t("inactive")}</span>
                </label>
              </FormField>
            </div>
          </FormSection>
          <button type="submit">{selectedCategory ? t("save_changes") : t("create_category")}</button>
        </form>
      </AdminDialog>

      <AdminDialog
        open={showPromotionModal}
        title={selectedPromotion ? `${t("edit")} ${selectedPromotion.title}` : t("create_promotion")}
        subtitle="Les offres s'ouvrent en modal et la liste se rafraichit apres sauvegarde."
        onClose={() => {
          resetPromotionModal();
          setShowPromotionModal(false);
        }}
      >
        <form onSubmit={selectedPromotion ? handleUpdatePromotion : handleCreatePromotion} className="stack compact-stack form-layout">
          <FormSection title="Identite de l'offre" hint="Renseignez un code clair et un titre lisible pour l'equipe.">
            <div className="split form-grid">
              <FormField label={t("code")} hint="Exemple: RAMADAN10" error={promotionErrors.code}>
                <input
                  value={selectedPromotion ? selectedPromotion.code : promotionForm.code}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, code: event.target.value })
                      : setPromotionForm({ ...promotionForm, code: event.target.value })
                  }
                  placeholder="RAMADAN10"
                  required
                />
              </FormField>
              <FormField label={t("title")} error={promotionErrors.title}>
                <input
                  value={selectedPromotion ? selectedPromotion.title : promotionForm.title}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, title: event.target.value })
                      : setPromotionForm({ ...promotionForm, title: event.target.value })
                  }
                  placeholder="Remise lancement"
                  required
                />
              </FormField>
            </div>
            <FormField label={t("description")}>
              <textarea
                value={selectedPromotion ? selectedPromotion.description : promotionForm.description}
                onChange={(event) =>
                  selectedPromotion
                    ? setSelectedPromotion({ ...selectedPromotion, description: event.target.value })
                    : setPromotionForm({ ...promotionForm, description: event.target.value })
                }
                placeholder="Offre valable sur la premiere commande ou pour une campagne temporaire."
              />
            </FormField>
          </FormSection>
          <FormSection title="Regles de l'offre" hint="Type, valeur et minimum de commande restent sur la meme ligne logique.">
            <div className="split form-grid">
              <FormField label="Type">
                <select
                  className="inline-select"
                  value={selectedPromotion ? selectedPromotion.type : promotionForm.type}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, type: event.target.value })
                      : setPromotionForm({ ...promotionForm, type: event.target.value })
                  }
                >
                  <option value="PERCENTAGE">{t("percentage")}</option>
                  <option value="FIXED">{t("fixed")}</option>
                </select>
              </FormField>
              <FormField label={t("value")} hint="Exemple: 10 ou 500" error={promotionErrors.value}>
                <input
                  value={selectedPromotion ? selectedPromotion.value : promotionForm.value}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, value: event.target.value })
                      : setPromotionForm({ ...promotionForm, value: event.target.value })
                  }
                  placeholder="10"
                  inputMode="decimal"
                />
              </FormField>
            </div>
            <div className="split form-grid">
              <FormField label={t("min_order")} hint="Laissez 0 pour aucune condition." error={promotionErrors.minOrderTotal}>
                <input
                  value={selectedPromotion ? selectedPromotion.minOrderTotal : promotionForm.minOrderTotal}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, minOrderTotal: event.target.value })
                      : setPromotionForm({ ...promotionForm, minOrderTotal: event.target.value })
                  }
                  placeholder="1500"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t("restaurants")}>
                <select
                  className="inline-select"
                  value={selectedPromotion ? selectedPromotion.restaurantId : promotionForm.restaurantId}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, restaurantId: event.target.value })
                      : setPromotionForm({ ...promotionForm, restaurantId: event.target.value })
                  }
                >
                  <option value="">{t("restaurants")}</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </FormSection>
          <FormSection title="Periode et statut" hint="Planifiez la validite puis activez ou non l'offre.">
            <div className="split form-grid">
              <FormField label={t("starts_at")}>
                <input
                  type="datetime-local"
                  value={selectedPromotion ? selectedPromotion.startsAt : promotionForm.startsAt}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, startsAt: event.target.value })
                      : setPromotionForm({ ...promotionForm, startsAt: event.target.value })
                  }
                />
              </FormField>
              <FormField label={t("ends_at")}>
                <input
                  type="datetime-local"
                  value={selectedPromotion ? selectedPromotion.endsAt : promotionForm.endsAt}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, endsAt: event.target.value })
                      : setPromotionForm({ ...promotionForm, endsAt: event.target.value })
                  }
                />
              </FormField>
            </div>
            <FormField label="Statut de l'offre">
              <label className="toggle-inline toggle-card">
                <input
                  type="checkbox"
                  checked={selectedPromotion ? Boolean(selectedPromotion.isActive) : Boolean(promotionForm.isActive)}
                  onChange={(event) =>
                    selectedPromotion
                      ? setSelectedPromotion({ ...selectedPromotion, isActive: event.target.checked })
                      : setPromotionForm({ ...promotionForm, isActive: event.target.checked })
                  }
                />
                <span>{(selectedPromotion ? selectedPromotion.isActive : promotionForm.isActive) ? t("active") : t("inactive")}</span>
              </label>
            </FormField>
          </FormSection>
          <button type="submit">{selectedPromotion ? t("save_changes") : t("create_promotion")}</button>
        </form>
      </AdminDialog>
    </main>
  );
}
