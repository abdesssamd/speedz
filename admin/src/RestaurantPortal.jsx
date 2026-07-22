import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  ChefHat,
  UtensilsCrossed,
  LayoutGrid,
  QrCode,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Printer,
  X,
  Clock,
  CheckCircle2,
  Bell,
  BellOff,
  RefreshCcw,
  TriangleAlert,
  Upload,
  KeyRound,
  Save,
  History,
  BarChart3,
  Tags,
  Printer as PrinterIcon,
  ArrowUp,
  ArrowDown,
  Bike,
  Search,
} from "lucide-react";
import { apiRequest, WS_URL, API_URL } from "./lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Espace restaurateur (portail web) — piloté par un compte User role=RESTAURANT.
// Toutes les données sont scopées côté backend au restaurant du compte.
// ─────────────────────────────────────────────────────────────────────────────

const money = (value) => `${Number(value || 0).toFixed(2)} Da`;

// Upload d'image via FormData (apiRequest force du JSON, on passe donc par fetch).
async function uploadImageFile(file, token) {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${API_URL}/api/restaurant/portal/upload-image`, {
    method: "POST",
    credentials: "include",
    headers: token && token !== "__cookie_session__" ? { Authorization: `Bearer ${token}` } : {},
    body,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.message || "Upload de l'image impossible.");
  }
  return payload.url;
}

const NAV = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "kds", label: "Commandes (Cuisine)", icon: ChefHat },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "stats", label: "Statistiques", icon: BarChart3 },
  { id: "floor", label: "Plan de salle", icon: LayoutGrid },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "settings", label: "Réglages", icon: Settings },
];

// Statuts affichés côté KDS regroupés en colonnes.
const KDS_COLUMNS = [
  { id: "new", title: "Nouvelles", statuses: ["Confirmed", "AwaitingCourier", "Accepted"] },
  { id: "prep", title: "En préparation", statuses: ["Preparing"] },
  { id: "ready", title: "Prêtes", statuses: ["Ready", "OnTheWay"] },
];

const TABLE_STATUS = {
  FREE: { label: "Libre", dot: "bg-emerald-500", ring: "border-emerald-200 dark:border-emerald-900" },
  OCCUPIED: { label: "Occupée", dot: "bg-amber-500", ring: "border-amber-200 dark:border-amber-900" },
  ORDER_IN_PROGRESS: { label: "Commande en cours", dot: "bg-blue-500", ring: "border-blue-200 dark:border-blue-900" },
  BILL_REQUESTED: { label: "Addition demandée", dot: "bg-red-500", ring: "border-red-200 dark:border-red-900" },
};

function minutesSince(iso) {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function RestaurantPortal({ token, user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [restaurant, setRestaurant] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [wsTick, setWsTick] = useState(0); // incrémenté à chaque event temps réel
  const [newOrderPing, setNewOrderPing] = useState(0);

  const restaurantId = restaurant?.id;

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const call = useCallback(
    (path, options) => apiRequest(path, options, token),
    [token]
  );

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const payload = await call("/api/restaurant/portal/me");
        if (cancelled) return;
        setRestaurant(payload.restaurant);
        setAccount(payload.account);
      } catch (err) {
        if (!cancelled) setError(err.message || "Impossible de charger l'espace restaurant.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [call]);

  // Temps réel : on écoute les events du restaurant et on rafraîchit les écrans.
  useEffect(() => {
    if (!restaurantId) return undefined;
    let socket;
    let closed = false;
    try {
      socket = new WebSocket(`${WS_URL}/ws?role=restaurant`);
    } catch {
      return undefined;
    }
    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const type = message?.type || "";
      const payload = message?.payload || {};
      const belongsToUs =
        payload.restaurantId === restaurantId || payload.order?.restaurantId === restaurantId;
      if (!belongsToUs) return;

      if (type === "order/created") {
        setNewOrderPing((n) => n + 1);
      }
      if (type.startsWith("order/") || type.startsWith("restaurant/")) {
        setWsTick((t) => t + 1);
      }
    };
    socket.onclose = () => {
      if (!closed) {
        // Reconnexion douce laissée à un futur incrément ; on ne boucle pas ici.
      }
    };
    return () => {
      closed = true;
      try {
        socket.close();
      } catch {
        /* noop */
      }
    };
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500">Chargement de l'espace restaurant…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-card text-center">
          <TriangleAlert className="mx-auto mb-3 text-amber-500" size={32} />
          <h2 className="text-lg font-bold mb-2">Espace indisponible</h2>
          <p className="text-slate-500 text-sm mb-5">{error}</p>
          <button
            onClick={onLogout}
            className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 text-sm font-semibold"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow text-orange-400 text-xs font-semibold uppercase tracking-wide">Espace restaurant</p>
          <h1 className="text-xl font-extrabold leading-tight mt-1">{restaurant?.name}</h1>
          <p className="sidebar-copy text-sm mt-1">{restaurant?.category}</p>
        </div>

        <nav className="side-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <span className="nav-icon">
                <item.icon size={16} />
              </span>
              <span>{item.label}</span>
              {item.id === "kds" && newOrderPing > 0 ? <span className="nav-badge">{newOrderPing}</span> : null}
            </button>
          ))}
        </nav>

        <button onClick={onLogout} className="sidebar-account-btn nav-item">
          <span className="nav-icon">
            <LogOut size={16} />
          </span>
          <span>Déconnexion</span>
        </button>
      </aside>

      <section className="min-w-0">
        {view === "dashboard" && <DashboardScreen call={call} wsTick={wsTick} onGoto={setView} />}
        {view === "kds" && (
          <KdsScreen
            call={call}
            wsTick={wsTick}
            newOrderPing={newOrderPing}
            clearPing={() => setNewOrderPing(0)}
            notify={notify}
          />
        )}
        {view === "menu" && <MenuScreen call={call} token={token} notify={notify} />}
        {view === "stats" && <StatsScreen call={call} />}
        {view === "floor" && <FloorScreen call={call} wsTick={wsTick} notify={notify} />}
        {view === "qr" && <QrScreen call={call} restaurant={restaurant} />}
        {view === "settings" && (
          <SettingsScreen
            call={call}
            restaurant={restaurant}
            account={account}
            onLogout={onLogout}
            notify={notify}
            onProfileUpdated={setRestaurant}
          />
        )}
      </section>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm shadow-card">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

// ─── En-tête d'écran réutilisable ─────────────────────────────────────────────
function ScreenHeader({ title, subtitle, actions }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50">{title}</h2>
        {subtitle ? <p className="text-slate-500 text-sm mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

function Card({ className = "", children }) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLEAU DE BORD
// ─────────────────────────────────────────────────────────────────────────────
function DashboardScreen({ call, wsTick, onGoto }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const payload = await call("/api/restaurant/portal/dashboard");
      setData(payload);
    } catch {
      /* silencieux : on garde l'ancien snapshot */
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load, wsTick]);

  // Rafraîchissement périodique de secours.
  useEffect(() => {
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return <div className="text-slate-500">Chargement des indicateurs…</div>;
  }

  const kpis = [
    { label: "CA du jour", value: money(data?.revenueToday), accent: "text-emerald-600" },
    { label: "Commandes", value: data?.ordersToday ?? 0, hint: `${data?.ordersOnsite ?? 0} sur place · ${data?.ordersDelivery ?? 0} livraison` },
    { label: "Panier moyen", value: money(data?.averageBasket) },
    { label: "Prépa. moyenne", value: `${data?.avgPrepMinutes ?? 0} min` },
  ];

  return (
    <div>
      <ScreenHeader
        title="Tableau de bord"
        subtitle="Pilotage temps réel de votre activité"
        actions={
          <button onClick={load} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm flex items-center gap-2">
            <RefreshCcw size={15} /> Actualiser
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-extrabold mt-2 ${kpi.accent || "text-slate-900 dark:text-slate-50"}`}>{kpi.value}</p>
            {kpi.hint ? <p className="text-slate-400 text-xs mt-1">{kpi.hint}</p> : null}
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Bell size={16} className="text-orange-500" /> À traiter maintenant
          </h3>
          <div className="space-y-2">
            <StatRow label="En attente d'acceptation" value={data?.pendingAcceptance ?? 0} alert={(data?.pendingAcceptance ?? 0) > 0} />
            <StatRow label="En préparation" value={data?.inPreparation ?? 0} />
            <StatRow label="Prêtes à servir" value={data?.ready ?? 0} />
          </div>
          <button onClick={() => onGoto("kds")} className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2.5 text-sm font-semibold">
            Ouvrir la cuisine
          </button>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <LayoutGrid size={16} className="text-blue-500" /> Salle
          </h3>
          <div className="space-y-2">
            <StatRow label="Tables occupées" value={data?.tables?.occupied ?? 0} />
            <StatRow label="Tables libres" value={data?.tables?.free ?? 0} />
            <StatRow label="Additions demandées" value={data?.tables?.billRequested ?? 0} alert={(data?.tables?.billRequested ?? 0) > 0} />
          </div>
          <button onClick={() => onGoto("floor")} className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold">
            Voir le plan de salle
          </button>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold mb-3">Top plats du jour</h3>
          {data?.topDishes?.length ? (
            <ul className="space-y-2">
              {data.topDishes.map((d, i) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="truncate"><span className="text-slate-400 mr-2">{i + 1}.</span>{d.name}</span>
                  <span className="font-semibold">×{d.quantity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">Aucune vente aujourd'hui.</p>
          )}

          {data?.lowStock?.length ? (
            <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3">
              <p className="text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                <TriangleAlert size={13} /> Stock faible
              </p>
              <p className="text-amber-700/80 dark:text-amber-400/80 text-xs mt-1">
                {data.lowStock.map((s) => `${s.name} (${s.stock})`).join(", ")}
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value, alert }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`inline-flex min-w-8 justify-center rounded-lg px-2 py-0.5 text-sm font-bold ${alert ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUISINE / KDS
// ─────────────────────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    /* audio non disponible */
  }
}

function KdsScreen({ call, wsTick, newOrderPing, clearPing, notify }) {
  const [tab, setTab] = useState("active"); // "active" | "history"
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const prevPingRef = useRef(newOrderPing);

  const load = useCallback(async () => {
    try {
      const list = await call("/api/restaurant/portal/orders?scope=active");
      setOrders(list);
    } catch {
      /* garde l'ancien */
    }
  }, [call]);

  const loadHistory = useCallback(async () => {
    try {
      const list = await call("/api/restaurant/portal/orders?scope=today");
      setHistory(list);
    } catch {
      /* garde l'ancien */
    }
  }, [call]);

  useEffect(() => {
    load();
    clearPing();
  }, [load, wsTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, wsTick, loadHistory]);

  // Bip sonore à chaque nouvelle commande.
  useEffect(() => {
    if (newOrderPing > prevPingRef.current && soundOn) {
      playBeep();
    }
    prevPingRef.current = newOrderPing;
  }, [newOrderPing, soundOn]);

  const changeStatus = async (order, status) => {
    setBusyId(order.id);
    try {
      await call(`/api/restaurant/portal/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      if (tab === "history") await loadHistory();
      notify(`Commande #${order.id.slice(-5)} → ${status}`);
    } catch (err) {
      notify(err.message || "Action impossible");
    } finally {
      setBusyId("");
    }
  };

  const grouped = useMemo(() => {
    const buckets = { new: [], prep: [], ready: [] };
    for (const order of orders) {
      const col = KDS_COLUMNS.find((c) => c.statuses.includes(normalizeStatus(order.status)));
      if (col) buckets[col.id].push(order);
    }
    return buckets;
  }, [orders]);

  const historyStats = useMemo(() => {
    const done = history.filter((o) => normalizeStatus(o.status) === "Delivered");
    const revenue = done.reduce((sum, o) => sum + (o.total || 0), 0);
    return { count: done.length, revenue };
  }, [history]);

  return (
    <div>
      <ScreenHeader
        title="Cuisine — commandes"
        subtitle="Réception → préparation → prête. Mise à jour en temps réel."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundOn((s) => !s)}
              title={soundOn ? "Son activé" : "Son coupé"}
              className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-2 ${soundOn ? "border-emerald-300 text-emerald-600 dark:border-emerald-800" : "border-slate-200 dark:border-slate-700 text-slate-400"}`}
            >
              {soundOn ? <Bell size={15} /> : <BellOff size={15} />}
            </button>
            <button onClick={() => (tab === "history" ? loadHistory() : load())} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm flex items-center gap-2">
              <RefreshCcw size={15} /> Actualiser
            </button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("active")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "active" ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-500"}`}>
          En cours
        </button>
        <button onClick={() => setTab("history")} className={`rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 ${tab === "history" ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-500"}`}>
          <History size={15} /> Historique du jour
        </button>
      </div>

      {tab === "active" ? (
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {KDS_COLUMNS.map((col) => (
            <div key={col.id} className="rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 p-3">
              <div className="flex items-center justify-between px-1 mb-3">
                <h3 className="font-bold text-slate-700 dark:text-slate-200">{col.title}</h3>
                <span className="rounded-full bg-white dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold shadow-soft">
                  {grouped[col.id].length}
                </span>
              </div>
              <div className="space-y-3">
                {grouped[col.id].map((order) => (
                  <KdsTicket key={order.id} order={order} column={col.id} busy={busyId === order.id} onChange={changeStatus} />
                ))}
                {grouped[col.id].length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-6">Aucune commande</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex gap-4 mb-4">
            <Card className="p-4 flex-1"><p className="text-slate-500 text-xs uppercase">Commandes servies</p><p className="text-2xl font-extrabold mt-1">{historyStats.count}</p></Card>
            <Card className="p-4 flex-1"><p className="text-slate-500 text-xs uppercase">CA encaissé</p><p className="text-2xl font-extrabold mt-1 text-emerald-600">{money(historyStats.revenue)}</p></Card>
          </div>
          <Card className="p-0 overflow-hidden">
            {history.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">Aucune commande aujourd'hui.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((o) => (
                  <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">#{o.id.slice(-5)}</span>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${o.channel === "QR_ONSITE" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"}`}>
                        {o.channel === "QR_ONSITE" ? (o.tableLabel ? `Table ${o.tableLabel}` : "Sur place") : "Livraison"}
                      </span>
                      <span className="text-slate-500">{new Date(o.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs">{normalizeStatus(o.status)}</span>
                      <span className="font-bold">{money(o.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function normalizeStatus(status) {
  return status === "On the way" ? "OnTheWay" : status;
}

function KdsTicket({ order, column, busy, onChange }) {
  const wait = minutesSince(order.createdAt);
  const isOnsite = order.channel === "QR_ONSITE";
  const isPickup = order.channel === "PICKUP";
  // Commande à récupérer non encore confirmée : le personnel appelle le client
  // puis confirme (→ impression).
  const needsPickupConfirm = isPickup && order.status === "Accepted";
  const urgent = wait >= 15;
  const badgeClass = isPickup
    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    : isOnsite
      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      : "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
  const badgeLabel = isPickup ? "À récupérer" : isOnsite ? (order.tableLabel ? `Table ${order.tableLabel}` : "Sur place") : "Livraison";

  return (
    <Card className={`p-3 ${urgent ? "ring-2 ring-red-300 dark:ring-red-900" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${badgeClass}`}>
            {badgeLabel}
          </span>
          <span className="text-xs text-slate-400">#{order.id.slice(-5)}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${urgent ? "text-red-500" : "text-slate-400"}`}>
          <Clock size={12} /> {wait} min
        </span>
      </div>

      <ul className="space-y-1 mb-3">
        {(order.items || []).map((item, idx) => (
          <li key={idx} className="text-sm">
            <span className="font-bold text-slate-900 dark:text-slate-100">{item.quantity || 1}×</span>{" "}
            <span className="text-slate-700 dark:text-slate-200">{item.name}</span>
            {(item.selectedOptions || []).length ? (
              <span className="block pl-5 text-xs text-slate-400">
                {item.selectedOptions.map((o) => o.choiceName || o.name).join(", ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {order.notes ? <p className="text-xs italic text-amber-600 dark:text-amber-400 mb-2">Note : {order.notes}</p> : null}

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{money(order.total)}</span>
          <button onClick={() => printKitchenTicket(order)} title="Imprimer le ticket cuisine" className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <PrinterIcon size={14} />
          </button>
        </div>
        <div className="flex gap-2">
          {column === "new" && needsPickupConfirm && (
            <TicketButton disabled={busy} onClick={() => onChange(order, "Confirmed")} tone="primary">
              Confirmer &amp; imprimer
            </TicketButton>
          )}
          {column === "new" && !needsPickupConfirm && (
            <TicketButton disabled={busy} onClick={() => onChange(order, "Preparing")} tone="primary">
              Préparer
            </TicketButton>
          )}
          {column === "prep" && (
            <TicketButton disabled={busy} onClick={() => onChange(order, "Ready")} tone="primary">
              <CheckCircle2 size={14} /> Prête
            </TicketButton>
          )}
          {column === "ready" && (
            <TicketButton disabled={busy} onClick={() => onChange(order, isOnsite ? "Delivered" : "OnTheWay")} tone="success">
              {isOnsite ? "Servie" : "Remise livreur"}
            </TicketButton>
          )}
          {column !== "ready" && (
            <TicketButton disabled={busy} onClick={() => onChange(order, "Cancelled")} tone="ghost">
              Annuler
            </TicketButton>
          )}
        </div>
      </div>
    </Card>
  );
}

function TicketButton({ children, tone = "primary", ...props }) {
  const tones = {
    primary: "bg-slate-900 dark:bg-white dark:text-slate-900 text-white",
    success: "bg-emerald-600 text-white",
    ghost: "border border-slate-200 dark:border-slate-700 text-slate-500",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────
const EMPTY_ITEM = { name: "", description: "", price: "", category: "", image: "", stock: 0, isAvailable: true, options: [] };

function MenuScreen({ call, token, notify }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // objet en cours d'édition ou null
  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("__all__");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const payload = await call("/api/restaurant/portal/menu");
      setItems(payload.items || []);
      setCategories(payload.categories || []);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleAvailability = async (item) => {
    try {
      await call(`/api/restaurant/portal/menu-items/${item.id}/availability`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      await load();
    } catch (err) {
      notify(err.message);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Archiver « ${item.name} » ?`)) return;
    try {
      await call(`/api/restaurant/portal/menu-items/${item.id}`, { method: "DELETE" });
      await load();
      notify("Plat archivé");
    } catch (err) {
      notify(err.message);
    }
  };

  // Catégories réellement présentes dans le menu, pour les onglets de filtrage.
  const usedCategories = useMemo(() => {
    const names = [];
    for (const item of items) {
      const name = item.category || "Divers";
      if (!names.includes(name)) names.push(name);
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [items]);

  const stockoutCount = useMemo(() => items.filter((item) => !item.isAvailable).length, [items]);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const category = item.category || "Divers";
      if (activeCategory === "__stockout__") {
        if (item.isAvailable) return false;
      } else if (activeCategory !== "__all__" && category !== activeCategory) return false;
      if (!needle) return true;
      return `${item.name} ${item.description || ""}`.toLowerCase().includes(needle);
    });
  }, [items, activeCategory, search]);

  // Ordre des catégories : selon le sortOrder déclaré (MenuCategory), puis alpha.
  const grouped = useMemo(() => {
    const rank = {};
    (categories || []).forEach((c, i) => {
      rank[c.name] = c.sortOrder ?? i;
    });
    const map = {};
    for (const item of visibleItems) {
      (map[item.category || "Divers"] ||= []).push(item);
    }
    return Object.entries(map).sort((a, b) => {
      const ra = rank[a[0]] ?? 999;
      const rb = rank[b[0]] ?? 999;
      return ra - rb || a[0].localeCompare(b[0]);
    });
  }, [visibleItems, categories]);

  return (
    <div>
      <ScreenHeader
        title="Menu"
        subtitle={`${items.length} plat(s) · ${usedCategories.length} catégorie(s)${stockoutCount ? ` · ${stockoutCount} en rupture` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategories(true)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <Tags size={15} /> Catégories
            </button>
            <button
              onClick={() => setEditing({ ...EMPTY_ITEM })}
              className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={15} /> Ajouter un plat
            </button>
          </div>
        }
      />

      {!loading && items.length > 0 ? (
        <div className="mb-4 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un plat…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("__all__")}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${activeCategory === "__all__" ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
            >
              Tout ({items.length})
            </button>
            {usedCategories.map((name) => {
              const count = items.filter((item) => (item.category || "Divers") === name).length;
              return (
                <button
                  key={name}
                  onClick={() => setActiveCategory(name)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${activeCategory === name ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}
                >
                  {name} ({count})
                </button>
              );
            })}
            {/* Le retour au menu étant manuel, ce filtre évite d'oublier un plat
                masqué depuis la veille. */}
            {stockoutCount > 0 ? (
              <button
                onClick={() => setActiveCategory("__stockout__")}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${activeCategory === "__stockout__" ? "bg-amber-500 text-white border-amber-500" : "border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-400"}`}
              >
                En rupture ({stockoutCount})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Chargement du menu…</p>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">Aucun plat pour l'instant. Ajoutez votre premier plat.</Card>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">Aucun plat ne correspond à ce filtre.</Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, list]) => (
            <div key={category}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400 mb-2">{category}</h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                {list.map((item) => (
                  <Card key={item.id} className="p-3 flex gap-3">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center shrink-0">
                        <UtensilsCrossed size={18} className="text-slate-300" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                        <span className="font-bold text-sm shrink-0">{money(item.price)}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleAvailability(item)}
                          title={item.isAvailable ? "Ingrédient épuisé : retirer du menu" : "Remettre le plat au menu"}
                          className={`text-xs font-semibold rounded-lg px-2 py-0.5 ${item.isAvailable ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-500 dark:bg-slate-800"}`}
                        >
                          {item.isAvailable ? "Disponible" : "En rupture"}
                        </button>
                        {(item.options || []).length ? (
                          <span className="text-xs text-slate-400">{item.options.length} option(s)</span>
                        ) : null}
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => setEditing({ ...item })} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => remove(item)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <MenuItemModal
          call={call}
          token={token}
          item={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            notify("Menu mis à jour");
          }}
        />
      ) : null}

      {showCategories ? (
        <CategoriesModal
          call={call}
          notify={notify}
          onClose={() => setShowCategories(false)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}

function CategoriesModal({ call, notify, onClose, onChanged }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(null); // { from, to }

  const load = useCallback(async () => {
    try {
      const list = await call("/api/restaurant/portal/categories");
      setCats(list);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  const persistOrder = async (list) => {
    setCats(list);
    try {
      await call("/api/restaurant/portal/categories/reorder", {
        method: "PATCH",
        body: JSON.stringify({ order: list.map((c) => c.name) }),
      });
      await onChanged?.();
    } catch (err) {
      notify(err.message);
    }
  };

  const move = (index, dir) => {
    const next = [...cats];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    persistOrder(next);
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await call("/api/restaurant/portal/menu-categories", { method: "POST", body: JSON.stringify({ name }) });
      setNewName("");
      await load();
      await onChanged?.();
      notify("Catégorie ajoutée");
    } catch (err) {
      notify(err.message);
    }
  };

  const rename = async () => {
    if (!renaming?.to?.trim() || renaming.to.trim() === renaming.from) {
      setRenaming(null);
      return;
    }
    try {
      await call("/api/restaurant/portal/categories/rename", {
        method: "PATCH",
        body: JSON.stringify({ from: renaming.from, to: renaming.to.trim() }),
      });
      setRenaming(null);
      await load();
      await onChanged?.();
      notify("Catégorie renommée");
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <Modal title="Gérer les catégories" onClose={onClose}>
      {loading ? (
        <p className="text-slate-500 text-sm">Chargement…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className="input" placeholder="Nouvelle catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
            <button onClick={addCategory} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 text-sm font-semibold whitespace-nowrap">
              Ajouter
            </button>
          </div>

          {cats.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune catégorie. Ajoutez-en une ou créez un plat.</p>
          ) : (
            <ul className="space-y-1">
              {cats.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 disabled:opacity-30"><ArrowUp size={13} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="text-slate-400 disabled:opacity-30"><ArrowDown size={13} /></button>
                  </div>
                  {renaming?.from === c.name ? (
                    <>
                      <input className="input flex-1" value={renaming.to} autoFocus onChange={(e) => setRenaming({ ...renaming, to: e.target.value })} onKeyDown={(e) => e.key === "Enter" && rename()} />
                      <button onClick={rename} className="text-emerald-600 text-sm font-semibold">OK</button>
                      <button onClick={() => setRenaming(null)} className="text-slate-400 text-sm">Annuler</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{c.name}</span>
                      <span className="text-xs text-slate-400">{c.count} plat(s)</span>
                      <button onClick={() => setRenaming({ from: c.name, to: c.name })} className="text-slate-400 hover:text-slate-600"><Pencil size={14} /></button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-400">Renommer une catégorie met à jour tous les plats concernés. L'ordre définit l'affichage du menu.</p>
        </div>
      )}
    </Modal>
  );
}

function MenuItemModal({ call, token, item, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...EMPTY_ITEM,
    ...item,
    price: item.price ?? "",
    options: Array.isArray(item.options) ? item.options : [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = Boolean(item.id);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      const url = await uploadImageFile(file, token);
      setForm((f) => ({ ...f, image: url }));
    } catch (error) {
      setErr(error.message || "Upload impossible.");
    } finally {
      setUploading(false);
    }
  };

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const addGroup = () =>
    set({ options: [...form.options, { groupName: "", type: "single", required: false, choices: [{ name: "", priceDelta: 0 }] }] });

  const updateGroup = (gi, patch) =>
    set({ options: form.options.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });

  const removeGroup = (gi) => set({ options: form.options.filter((_, i) => i !== gi) });

  const addChoice = (gi) =>
    updateGroup(gi, { choices: [...(form.options[gi].choices || []), { name: "", priceDelta: 0 }] });

  const updateChoice = (gi, ci, patch) =>
    updateGroup(gi, { choices: form.options[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  const removeChoice = (gi, ci) =>
    updateGroup(gi, { choices: form.options[gi].choices.filter((_, i) => i !== ci) });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || !form.category.trim() || form.price === "") {
      setErr("Nom, catégorie et prix sont requis.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description || "",
      price: Number(form.price),
      category: form.category.trim(),
      image: form.image || "",
      stock: Number(form.stock || 0),
      isAvailable: Boolean(form.isAvailable),
      options: (form.options || [])
        .filter((g) => g.groupName?.trim())
        .map((g) => ({
          groupName: g.groupName.trim(),
          type: g.type === "multi" ? "multi" : "single",
          required: Boolean(g.required),
          choices: (g.choices || [])
            .filter((c) => c.name?.trim())
            .map((c) => ({ name: c.name.trim(), priceDelta: Number(c.priceDelta || 0) })),
        })),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await call(`/api/restaurant/portal/menu-items/${item.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await call("/api/restaurant/portal/menu-items", { method: "POST", body: JSON.stringify(payload) });
      }
      await onSaved();
    } catch (error) {
      setErr(error.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isEdit ? "Modifier le plat" : "Nouveau plat"} wide>
      <form onSubmit={submit} className="space-y-4">
        {err ? <p className="rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 text-sm px-3 py-2">{err}</p> : null}

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Nom du plat">
            <input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Prix (DA)">
            <input type="number" step="0.01" className="input" value={form.price} onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Catégorie">
            <input list="menu-categories" className="input" value={form.category} onChange={(e) => set({ category: e.target.value })} />
            <datalist id="menu-categories">
              {categories.map((c) => (
                <option key={c.id || c.name} value={c.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Stock">
            <input type="number" className="input" value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
          </Field>
        </div>

        <Field label="Description">
          <textarea className="input" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <Field label="Photo du plat">
          <div className="flex items-center gap-3">
            {form.image ? (
              <img src={form.image} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 grid place-items-center">
                <UtensilsCrossed size={18} className="text-slate-300" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <Upload size={15} /> {uploading ? "Envoi…" : "Choisir une photo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              <input className="input" value={form.image} onChange={(e) => set({ image: e.target.value })} placeholder="ou coller une URL https://…" />
            </div>
          </div>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => set({ isAvailable: e.target.checked })} />
          Disponible à la vente
        </label>

        {/* Options / suppléments */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Options (suppléments, cuisson, à retirer…)</p>
            <button type="button" onClick={addGroup} className="text-xs font-semibold text-orange-600 flex items-center gap-1">
              <Plus size={13} /> Groupe
            </button>
          </div>

          {form.options.length === 0 ? (
            <p className="text-xs text-slate-400">Aucune option. Ex : « Cuisson » (choix unique) ou « Suppléments » (choix multiple).</p>
          ) : (
            <div className="space-y-3">
              {form.options.map((group, gi) => (
                <div key={gi} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <input
                      className="input flex-1 min-w-[140px]"
                      placeholder="Nom du groupe (ex : Cuisson)"
                      value={group.groupName}
                      onChange={(e) => updateGroup(gi, { groupName: e.target.value })}
                    />
                    <select className="input w-auto" value={group.type} onChange={(e) => updateGroup(gi, { type: e.target.value })}>
                      <option value="single">Choix unique</option>
                      <option value="multi">Choix multiple</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={group.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} />
                      Obligatoire
                    </label>
                    <button type="button" onClick={() => removeGroup(gi)} className="text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    {(group.choices || []).map((choice, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <input
                          className="input flex-1"
                          placeholder="Choix (ex : Saignant, Cheddar…)"
                          value={choice.name}
                          onChange={(e) => updateChoice(gi, ci, { name: e.target.value })}
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">+</span>
                          <input
                            type="number"
                            step="0.5"
                            className="input w-20"
                            value={choice.priceDelta}
                            onChange={(e) => updateChoice(gi, ci, { priceDelta: e.target.value })}
                          />
                        </div>
                        <button type="button" onClick={() => removeChoice(gi, ci)} className="text-slate-400 p-1">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addChoice(gi)} className="text-xs text-slate-500 flex items-center gap-1">
                      <Plus size={12} /> Ajouter un choix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATISTIQUES
// ─────────────────────────────────────────────────────────────────────────────
function StatsScreen({ call }) {
  const [range, setRange] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await call(`/api/restaurant/portal/stats?range=${range}`);
      setData(payload);
    } finally {
      setLoading(false);
    }
  }, [call, range]);

  useEffect(() => {
    load();
  }, [load]);

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.daily || []).map((d) => d.revenue)), [data]);
  const maxDish = useMemo(() => Math.max(1, ...(data?.topDishes || []).map((d) => d.quantity)), [data]);

  const dayLabel = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return range === "week"
      ? d.toLocaleDateString("fr-FR", { weekday: "short" })
      : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div>
      <ScreenHeader
        title="Statistiques"
        subtitle={range === "week" ? "7 derniers jours" : "30 derniers jours"}
        actions={
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
            <button onClick={() => setRange("week")} className={`px-3 py-2 font-semibold ${range === "week" ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white" : "text-slate-500"}`}>Semaine</button>
            <button onClick={() => setRange("month")} className={`px-3 py-2 font-semibold ${range === "month" ? "bg-slate-900 dark:bg-white dark:text-slate-900 text-white" : "text-slate-500"}`}>Mois</button>
          </div>
        }
      />

      {loading && !data ? (
        <p className="text-slate-500">Chargement des statistiques…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Card className="p-4"><p className="text-slate-500 text-xs uppercase">CA période</p><p className="text-2xl font-extrabold mt-1 text-emerald-600">{money(data?.totals?.revenue)}</p></Card>
            <Card className="p-4"><p className="text-slate-500 text-xs uppercase">Commandes</p><p className="text-2xl font-extrabold mt-1">{data?.totals?.orders ?? 0}</p></Card>
            <Card className="p-4"><p className="text-slate-500 text-xs uppercase">Panier moyen</p><p className="text-2xl font-extrabold mt-1">{money(data?.totals?.averageBasket)}</p></Card>
          </div>

          <Card className="p-5 mb-5">
            <h3 className="font-bold mb-4">Chiffre d'affaires par jour</h3>
            <div className="flex items-end gap-1.5 h-52" role="img" aria-label="Chiffre d'affaires par jour">
              {(data?.daily || []).map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${dayLabel(d.date)} : ${money(d.revenue)} (${d.orders} cmd)`}>
                  <div
                    className="w-full bg-orange-500 hover:bg-orange-600 transition-colors"
                    style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: d.revenue > 0 ? 3 : 0, borderRadius: "4px 4px 0 0" }}
                  />
                  <span className="mt-1 text-[10px] text-slate-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{dayLabel(d.date)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold mb-4">Plats les plus vendus</h3>
            {data?.topDishes?.length ? (
              <div className="space-y-2">
                {data.topDishes.map((dish) => (
                  <div key={dish.name} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm">{dish.name}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(dish.quantity / maxDish) * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-sm font-bold">{dish.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Aucune vente sur la période.</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DE SALLE
// ─────────────────────────────────────────────────────────────────────────────
function FloorScreen({ call, wsTick, notify }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [qr, setQr] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await call("/api/restaurant/portal/tables");
      setTables(list);
      setDetail((d) => (d ? list.find((t) => t.id === d.id) || null : null));
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load, wsTick]);

  const setStatus = async (table, status) => {
    try {
      await call(`/api/restaurant/portal/tables/${table.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (err) {
      notify(err.message);
    }
  };

  const remove = async (table) => {
    if (!window.confirm(`Supprimer la table « ${table.label} » ?`)) return;
    try {
      await call(`/api/restaurant/portal/tables/${table.id}`, { method: "DELETE" });
      setDetail(null);
      await load();
      notify("Table supprimée");
    } catch (err) {
      notify(err.message);
    }
  };

  const openQr = async (table) => {
    try {
      const payload = await call(`/api/restaurant/portal/tables/${table.id}/qr`);
      setQr({ ...payload, label: table.label });
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <div>
      <ScreenHeader
        title="Plan de salle"
        subtitle="État des tables en temps réel"
        actions={
          <button
            onClick={() => setEditing({ label: "", zone: "", seats: 2 })}
            className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={15} /> Ajouter une table
          </button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(TABLE_STATUS).map(([key, s]) => (
          <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label}
          </span>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement du plan de salle…</p>
      ) : tables.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">Aucune table. Créez vos tables pour générer leurs QR codes.</Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((table) => {
            const s = TABLE_STATUS[table.status] || TABLE_STATUS.FREE;
            const total = (table.activeOrders || []).reduce((sum, o) => sum + (o.total || 0), 0);
            return (
              <button
                key={table.id}
                onClick={() => setDetail(table)}
                className={`text-left rounded-2xl bg-white dark:bg-slate-900 border-2 ${s.ring} p-3 shadow-soft hover:shadow-card transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-lg">{table.label}</span>
                  <span className={`w-3 h-3 rounded-full ${s.dot}`} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{table.zone || `${table.seats} couverts`}</p>
                <p className="text-xs font-semibold mt-2 text-slate-600 dark:text-slate-300">{s.label}</p>
                {table.activeOrders?.length ? (
                  <p className="text-xs text-slate-500 mt-1">{table.activeOrders.length} cmd · {money(total)}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {detail ? (
        <Modal onClose={() => setDetail(null)} title={`Table ${detail.label}`}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatus(detail, "FREE")} className="chip">Libérer</button>
              <button onClick={() => setStatus(detail, "OCCUPIED")} className="chip">Occupée</button>
              <button onClick={() => setStatus(detail, "BILL_REQUESTED")} className="chip chip-danger">Addition demandée</button>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Commandes en cours</p>
              {detail.activeOrders?.length ? (
                <ul className="space-y-2">
                  {detail.activeOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm">
                      <span>#{o.id.slice(-5)} · {o.status}</span>
                      <span className="font-semibold">{money(o.total)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-sm">Aucune commande active.</p>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => remove(detail)} className="text-red-500 text-sm font-semibold flex items-center gap-1">
                <Trash2 size={14} /> Supprimer
              </button>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(detail); setDetail(null); }} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm">
                  Modifier
                </button>
                <button onClick={() => openQr(detail)} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-2 text-sm font-semibold flex items-center gap-1">
                  <QrCode size={14} /> QR
                </button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {editing ? (
        <TableModal
          call={call}
          table={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
            notify("Table enregistrée");
          }}
        />
      ) : null}

      {qr ? <QrModal data={qr} onClose={() => setQr(null)} title={`QR — Table ${qr.label}`} /> : null}
    </div>
  );
}

function TableModal({ call, table, onClose, onSaved }) {
  const [form, setForm] = useState({ label: table.label || "", zone: table.zone || "", seats: table.seats || 2 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const isEdit = Boolean(table.id);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setErr("Le libellé est requis.");
      return;
    }
    const body = { label: form.label.trim(), zone: form.zone.trim() || null, seats: Number(form.seats) || 2 };
    setSaving(true);
    try {
      if (isEdit) {
        await call(`/api/restaurant/portal/tables/${table.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await call("/api/restaurant/portal/tables", { method: "POST", body: JSON.stringify(body) });
      }
      await onSaved();
    } catch (error) {
      setErr(error.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title={isEdit ? "Modifier la table" : "Nouvelle table"}>
      <form onSubmit={submit} className="space-y-3">
        {err ? <p className="rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 text-sm px-3 py-2">{err}</p> : null}
        <Field label="Libellé (n° ou nom)">
          <input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex : 12, Terrasse-3" />
        </Field>
        <Field label="Zone (optionnel)">
          <input className="input" value={form.zone} onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))} placeholder="Salle, Terrasse…" />
        </Field>
        <Field label="Couverts">
          <input type="number" className="input" value={form.seats} onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm">Annuler</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {saving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────────────────────────────────────
function QrScreen({ call }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    call("/api/restaurant/portal/qr")
      .then((payload) => !cancelled && setData(payload))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [call]);

  return (
    <div>
      <ScreenHeader title="QR Code & menu digital" subtitle="Affichez ce QR pour que vos clients consultent la carte et commandent." />
      {loading ? (
        <p className="text-slate-500">Génération du QR…</p>
      ) : (
        <Card className="p-6 max-w-md">
          <p className="font-semibold mb-1">QR général du restaurant</p>
          <p className="text-sm text-slate-400 mb-4">Menu complet, commande sur place. Pour un QR par table, allez dans « Plan de salle ».</p>
          {data?.qrDataUrl ? <img src={data.qrDataUrl} alt="QR restaurant" className="w-56 h-56 mx-auto rounded-xl border border-slate-100 dark:border-slate-800" /> : null}
          <p className="text-center text-xs text-slate-400 break-all mt-3">{data?.qrUrl}</p>
          <button onClick={() => printQr(data?.qrDataUrl, "Menu")} className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
            <Printer size={15} /> Imprimer
          </button>
        </Card>
      )}
    </div>
  );
}

function QrModal({ data, onClose, title }) {
  return (
    <Modal onClose={onClose} title={title}>
      <div className="text-center">
        {data?.qrDataUrl ? <img src={data.qrDataUrl} alt="QR" className="w-56 h-56 mx-auto rounded-xl border border-slate-100 dark:border-slate-800" /> : null}
        <p className="text-xs text-slate-400 break-all mt-3">{data?.qrUrl}</p>
        <button onClick={() => printQr(data?.qrDataUrl, title)} className="mt-4 w-full rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2">
          <Printer size={15} /> Imprimer
        </button>
      </div>
    </Modal>
  );
}

function printKitchenTicket(order) {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) return;
  const esc = (s) => String(s || "").replace(/[<>&]/g, "");
  const where = order.channel === "QR_ONSITE" ? (order.tableLabel ? `TABLE ${esc(order.tableLabel)}` : "SUR PLACE") : "LIVRAISON";
  const time = new Date(order.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const lines = (order.items || [])
    .map((it) => {
      const opts = (it.selectedOptions || []).map((o) => `<div class="opt">+ ${esc(o.choiceName || o.name)}</div>`).join("");
      return `<div class="line"><span class="qty">${it.quantity || 1}x</span> <span>${esc(it.name)}</span></div>${opts}`;
    })
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${esc(order.id.slice(-5))}</title>
    <style>
      *{font-family:'Courier New',monospace;margin:0}
      body{padding:10px;width:280px;color:#000}
      h1{font-size:20px;text-align:center;border-bottom:2px dashed #000;padding-bottom:6px}
      .meta{display:flex;justify-content:space-between;font-size:13px;margin:8px 0}
      .line{font-size:16px;font-weight:bold;margin-top:8px}
      .qty{display:inline-block;min-width:28px}
      .opt{font-size:13px;font-weight:normal;padding-left:28px}
      .note{margin-top:12px;padding-top:8px;border-top:1px dashed #000;font-size:13px;font-style:italic}
      .foot{margin-top:12px;border-top:2px dashed #000;padding-top:6px;text-align:center;font-size:12px}
    </style></head><body>
      <h1>${where}</h1>
      <div class="meta"><span>#${esc(order.id.slice(-5))}</span><span>${time}</span></div>
      ${lines}
      ${order.notes ? `<div class="note">Note: ${esc(order.notes)}</div>` : ""}
      <div class="foot">SpeedZ — ticket cuisine</div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  win.document.close();
}

function printQr(dataUrl, title) {
  if (!dataUrl) return;
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) return;
  win.document.write(
    `<html><head><title>${title}</title></head><body style="text-align:center;font-family:Arial;padding:40px">
      <h2>${title}</h2><img src="${dataUrl}" style="width:320px;height:320px"/>
      <script>window.onload=function(){window.print();}</script></body></html>`
  );
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// RÉGLAGES
// ─────────────────────────────────────────────────────────────────────────────
const WEEK = [
  { key: "mon", label: "Lundi" },
  { key: "tue", label: "Mardi" },
  { key: "wed", label: "Mercredi" },
  { key: "thu", label: "Jeudi" },
  { key: "fri", label: "Vendredi" },
  { key: "sat", label: "Samedi" },
  { key: "sun", label: "Dimanche" },
];

function SettingsScreen({ call, restaurant, account, onLogout, notify, onProfileUpdated }) {
  const [profile, setProfile] = useState({
    shortDescription: restaurant?.shortDescription || "",
    openingHours: restaurant?.openingHours || "",
    deliveryTime: restaurant?.deliveryTime || "",
    address: restaurant?.address || "",
    ownerPhone: restaurant?.ownerPhone || "",
  });
  const [weekly, setWeekly] = useState(() => {
    const base = restaurant?.weeklyHours || {};
    const init = {};
    for (const d of WEEK) {
      const cur = base[d.key] || {};
      init[d.key] = { closed: cur.closed ?? false, open: cur.open || "11:00", close: cur.close || "23:00" };
    }
    return init;
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [pwd, setPwd] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  // Réglages QR tri-état : "global" (suit le défaut plateforme) | "oui" | "non".
  const toTri = (v) => (v == null ? "global" : v ? "oui" : "non");
  const [qr, setQr] = useState({
    auth: toTri(restaurant?.qrAuthRequired),
    validation: toTri(restaurant?.qrServerValidation),
    pickup: toTri(restaurant?.pickupEnabled),
  });
  const [savingQr, setSavingQr] = useState(false);

  const saveQr = async () => {
    const toBool = (v) => (v === "global" ? null : v === "oui");
    setSavingQr(true);
    try {
      const updated = await call("/api/restaurant/portal/profile", {
        method: "PATCH",
        body: JSON.stringify({ qrAuthRequired: toBool(qr.auth), qrServerValidation: toBool(qr.validation), pickupEnabled: toBool(qr.pickup) }),
      });
      onProfileUpdated?.(updated);
      notify("Réglages QR mis à jour");
    } catch (err) {
      notify(err.message || "Enregistrement impossible");
    } finally {
      setSavingQr(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await call("/api/restaurant/portal/profile", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      onProfileUpdated?.(updated);
      notify("Informations mises à jour");
    } catch (err) {
      notify(err.message || "Enregistrement impossible");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      const updated = await call("/api/restaurant/portal/profile", {
        method: "PATCH",
        body: JSON.stringify({ weeklyHours: weekly }),
      });
      onProfileUpdated?.(updated);
      setProfile((p) => ({ ...p, openingHours: updated.openingHours || p.openingHours }));
      notify("Horaires mis à jour");
    } catch (err) {
      notify(err.message || "Enregistrement impossible");
    } finally {
      setSavingHours(false);
    }
  };

  const setDay = (key, patch) => setWeekly((w) => ({ ...w, [key]: { ...w[key], ...patch } }));

  const savePassword = async (e) => {
    e.preventDefault();
    setPwdMsg("");
    if (pwd.newPassword.length < 8) {
      setPwdMsg("Le nouveau mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      setPwdMsg("La confirmation ne correspond pas.");
      return;
    }
    setSavingPwd(true);
    try {
      await call("/api/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword }),
      });
      setPwd({ currentPassword: "", newPassword: "", confirm: "" });
      notify("Mot de passe modifié");
    } catch (err) {
      setPwdMsg(err.message || "Modification impossible.");
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div>
      <ScreenHeader title="Réglages" subtitle="Informations du restaurant et sécurité du compte" />

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card className="p-6">
          <h3 className="font-bold mb-4">Informations du restaurant</h3>
          <form onSubmit={saveProfile} className="space-y-3">
            <Info label="Nom" value={restaurant?.name} />
            <Info label="Catégorie" value={restaurant?.category} />
            <Field label="Description">
              <textarea className="input" rows={2} value={profile.shortDescription} onChange={(e) => setProfile((p) => ({ ...p, shortDescription: e.target.value }))} />
            </Field>
            <Field label="Horaires d'ouverture">
              <input className="input" value={profile.openingHours} onChange={(e) => setProfile((p) => ({ ...p, openingHours: e.target.value }))} placeholder="11:00 - 23:00" />
            </Field>
            <Field label="Délai de préparation / livraison">
              <input className="input" value={profile.deliveryTime} onChange={(e) => setProfile((p) => ({ ...p, deliveryTime: e.target.value }))} placeholder="25-35 min" />
            </Field>
            <Field label="Adresse">
              <input className="input" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
            </Field>
            <Field label="Téléphone">
              <input className="input" value={profile.ownerPhone} onChange={(e) => setProfile((p) => ({ ...p, ownerPhone: e.target.value }))} />
            </Field>
            <button type="submit" disabled={savingProfile} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
              <Save size={15} /> {savingProfile ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2"><KeyRound size={16} /> Mot de passe</h3>
            <form onSubmit={savePassword} className="space-y-3">
              {pwdMsg ? <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-sm px-3 py-2">{pwdMsg}</p> : null}
              <Field label="Mot de passe actuel">
                <input type="password" className="input" value={pwd.currentPassword} onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))} autoComplete="current-password" />
              </Field>
              <Field label="Nouveau mot de passe">
                <input type="password" className="input" value={pwd.newPassword} onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))} autoComplete="new-password" />
              </Field>
              <Field label="Confirmer le nouveau mot de passe">
                <input type="password" className="input" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
              </Field>
              <button type="submit" disabled={savingPwd} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                {savingPwd ? "…" : "Modifier le mot de passe"}
              </button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold mb-2">Compte</h3>
            <Info label="Email de connexion" value={account?.email} />
            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={onLogout} className="rounded-xl border border-red-200 dark:border-red-900 text-red-600 px-4 py-2 text-sm font-semibold flex items-center gap-2">
                <LogOut size={15} /> Se déconnecter
              </button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6 mt-4">
        <h3 className="font-bold mb-1 flex items-center gap-2"><QrCode size={16} /> Commande via QR code</h3>
        <p className="text-sm text-slate-400 mb-4">Comportement de la page scannée par vos clients. « Réglage global » suit la configuration de la plateforme.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Compte client obligatoire">
            <select className="input" value={qr.auth} onChange={(e) => setQr((q) => ({ ...q, auth: e.target.value }))}>
              <option value="global">Réglage global</option>
              <option value="oui">Oui — connexion requise</option>
              <option value="non">Non — commande directe (nom + tél)</option>
            </select>
          </Field>
          <Field label="Validation avant impression">
            <select className="input" value={qr.validation} onChange={(e) => setQr((q) => ({ ...q, validation: e.target.value }))}>
              <option value="global">Réglage global</option>
              <option value="oui">Oui — valider au KDS avant impression</option>
              <option value="non">Non — impression immédiate</option>
            </select>
          </Field>
          <Field label="Commandes à récupérer par le client">
            <select className="input" value={qr.pickup} onChange={(e) => setQr((q) => ({ ...q, pickup: e.target.value }))}>
              <option value="global">Réglage global</option>
              <option value="oui">Oui — accepter le retrait au comptoir</option>
              <option value="non">Non — désactiver</option>
            </select>
          </Field>
        </div>
        <button onClick={saveQr} disabled={savingQr} className="mt-4 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Save size={15} /> {savingQr ? "…" : "Enregistrer"}
        </button>
      </Card>

      <Card className="p-6 mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2"><Clock size={16} /> Horaires par jour</h3>
          <button onClick={saveHours} disabled={savingHours} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
            <Save size={15} /> {savingHours ? "…" : "Enregistrer les horaires"}
          </button>
        </div>
        <div className="space-y-2">
          {WEEK.map((d) => {
            const day = weekly[d.key];
            return (
              <div key={d.key} className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                <span className="w-24 font-medium text-sm">{d.label}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!day.closed} onChange={(e) => setDay(d.key, { closed: !e.target.checked })} />
                  {day.closed ? "Fermé" : "Ouvert"}
                </label>
                {!day.closed && (
                  <div className="flex items-center gap-2">
                    <input type="time" className="input w-auto" value={day.open} onChange={(e) => setDay(d.key, { open: e.target.value })} />
                    <span className="text-slate-400">→</span>
                    <input type="time" className="input w-auto" value={day.close} onChange={(e) => setDay(d.key, { close: e.target.value })} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3">Le résumé « Horaires d'ouverture » et la page QR se mettent à jour automatiquement.</p>
      </Card>

      <PreferredCouriersCard call={call} notify={notify} />
    </div>
  );
}

// ─── Livreurs préférés ────────────────────────────────────────────────────────
// Le restaurateur ajoute ses livreurs un par un en cherchant leur code (6 chiffres)
// ou leur numéro complet. Le livreur doit d'abord s'être inscrit sur SpeedZ Livreur.
function PreferredCouriersCard({ call, notify }) {
  const [preferred, setPreferred] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    call("/api/restaurant/portal/preferred-couriers")
      .then((payload) => setPreferred(payload.couriers || []))
      .catch(() => {});
  }, [call]);

  const save = async (couriers) => {
    setSaving(true);
    try {
      const payload = await call("/api/restaurant/portal/preferred-couriers", {
        method: "PUT",
        body: JSON.stringify({ courierIds: couriers.map((c) => c.id) }),
      });
      setPreferred(payload.couriers || []);
      notify("Livreurs préférés mis à jour");
    } catch (err) {
      notify(err.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const search = async (e) => {
    e.preventDefault();
    const digits = query.replace(/\D/g, "");
    if (digits.length < 4) {
      notify("Saisissez au moins 4 chiffres (code ou numéro).");
      return;
    }
    setSearching(true);
    try {
      const payload = await call(`/api/restaurant/portal/couriers/search?q=${encodeURIComponent(digits)}`);
      setResults(payload.couriers || []);
    } catch (err) {
      notify(err.message || "Recherche impossible");
    } finally {
      setSearching(false);
    }
  };

  const add = (courier) => {
    if (preferred.some((c) => c.id === courier.id)) return;
    save([...preferred, courier]);
    setResults(null);
    setQuery("");
  };

  const remove = (courier) => save(preferred.filter((c) => c.id !== courier.id));

  return (
    <Card className="p-6 mt-4">
      <h3 className="font-bold mb-1 flex items-center gap-2"><Bike size={16} /> Mes livreurs préférés</h3>
      <p className="text-xs text-slate-400 mb-4">
        Ils reçoivent vos commandes en priorité pendant 5 minutes, avant les autres livreurs SpeedZ.
        Le livreur doit d'abord s'inscrire sur l'application SpeedZ Livreur, puis vous donner son code ou son numéro.
      </p>

      <form onSubmit={search} className="flex flex-wrap gap-2 mb-4">
        <input
          className="input flex-1 min-w-[220px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Code livreur (6 chiffres) ou numéro de téléphone"
        />
        <button type="submit" disabled={searching} className="rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-2.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Search size={15} /> {searching ? "…" : "Rechercher"}
        </button>
      </form>

      {results !== null && (
        <div className="mb-4 space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">
              Aucun livreur trouvé. Vérifiez qu'il s'est bien inscrit sur SpeedZ Livreur.
            </p>
          ) : (
            results.map((courier) => {
              const already = preferred.some((c) => c.id === courier.id);
              return (
                <div key={courier.id} className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <CourierLine courier={courier} />
                  <button
                    type="button"
                    onClick={() => add(courier)}
                    disabled={already || saving}
                    className="rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                  >
                    <Plus size={13} /> {already ? "Déjà ajouté" : "Ajouter"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      <div className="space-y-2">
        {preferred.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun livreur préféré. Vos commandes partent directement à toute la flotte SpeedZ.</p>
        ) : (
          preferred.map((courier) => (
            <div key={courier.id} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">
              <CourierLine courier={courier} />
              <button
                type="button"
                onClick={() => remove(courier)}
                disabled={saving}
                className="rounded-lg border border-red-200 dark:border-red-900 text-red-600 px-3 py-1.5 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
              >
                <Trash2 size={13} /> Retirer
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CourierLine({ courier }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate">{courier.name}</p>
      <p className="text-xs text-slate-400 truncate">
        #{courier.code} · {courier.vehicle}
        {courier.zoneLabel ? ` · ${courier.zoneLabel}` : ""}
      </p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

// ─── Primitives partagées ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-card`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
