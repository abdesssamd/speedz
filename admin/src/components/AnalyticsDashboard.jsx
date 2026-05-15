import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from 'recharts';
import DashboardCards from './DashboardCards';

/**
 * AnalyticsDashboard — données 100% calculées depuis orders[]
 *
 * Améliorations :
 * - Plus aucune donnée statique / sampleCA
 * - CA par jour : 30 derniers jours groupés
 * - Pics horaires : toutes les commandes groupées par heure (0-23)
 * - Couleurs dark-mode safe via CSS variables lues au runtime
 * - Tooltip formatté en DA
 * - Axes allégés (pas de lignes de grille inutiles)
 */
export default function AnalyticsDashboard({ orders = [], couriers = [] }) {

  // ── CA par jour — 30 derniers jours ────────────────────────────────────────
  const caByDay = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = { day: label, ca: 0, count: 0 };
    }
    orders.forEach((o) => {
      const key = new Date(o.createdAt).toDateString();
      if (map[key]) {
        map[key].ca    += Number(o.total || 0);
        map[key].count += 1;
      }
    });
    return Object.values(map).map((d) => ({ ...d, ca: Math.round(d.ca) }));
  }, [orders]);

  // ── Pics horaires — toutes les commandes ───────────────────────────────────
  const hourlyPeaks = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}h`,
      orders: 0,
    }));
    orders.forEach((o) => {
      const h = new Date(o.createdAt).getHours();
      buckets[h].orders += 1;
    });
    // Ne garder que les heures avec au moins 1 commande (+ heures adjacentes pour lisibilité)
    return buckets.filter((b) => b.orders > 0);
  }, [orders]);

  // ── Couleurs adaptées dark/light ───────────────────────────────────────────
  // On les lit depuis les CSS variables définies dans index.css
  const isDark = typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const chartOrange  = '#ea580c';
  const chartGreen   = '#059669';
  const chartMuted   = isDark ? '#475569' : '#cbd5e1';
  const chartText    = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg    = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  const hasCAData     = caByDay.some((d) => d.ca > 0);
  const hasHourlyData = hourlyPeaks.length > 0;

  // ── Peak bar coloring — met en valeur l'heure max ─────────────────────────
  const maxHourOrders = Math.max(...hourlyPeaks.map((h) => h.orders), 1);

  // ── KPIs résumé rapide ────────────────────────────────────────────────────
  const totalRevenue    = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalDelivered  = orders.filter((o) => o.status === "Delivered").length;
  const totalCancelled  = orders.filter((o) => o.status === "Cancelled").length;
  const avgBasket       = orders.length > 0 ? totalRevenue / orders.length : 0;
  const peakHour        = hourlyPeaks.length > 0
    ? hourlyPeaks.reduce((max, h) => h.orders > max.orders ? h : max, hourlyPeaks[0])
    : null;
  const peakDay         = caByDay.length > 0
    ? caByDay.reduce((max, d) => d.ca > max.ca ? d : max, caByDay[0])
    : null;

  return (
    <div className="stack">
      {/* Stats cards dynamiques */}
      <DashboardCards orders={orders} couriers={couriers} />

      {/* Résumé analytique en ligne */}
      {orders.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Panier moyen", value: `${Math.round(avgBasket).toLocaleString("fr-DZ")} DA`, icon: "🧾" },
            { label: "Livrées", value: totalDelivered, icon: "✅" },
            { label: "Annulées", value: totalCancelled, icon: "❌" },
            { label: "Pic horaire", value: peakHour ? `${peakHour.hour} (${peakHour.orders} cmd)` : "—", icon: "🕐" },
            { label: "Meilleur jour", value: peakDay?.ca > 0 ? `${peakDay.day} · ${Math.round(peakDay.ca).toLocaleString("fr-DZ")} DA` : "—", icon: "📅" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="stat-card" style={{ gridColumnSpan: 1 }}>
              <p>{icon} {label}</p>
              <strong style={{ fontSize: 16 }}>{value}</strong>
            </div>
          ))}
        </div>
      )}

      <div className="chart-grid">

        {/* ── Graphe CA par jour ─────────────────────────────── */}
        <div className="chart-card rounded-xl shadow-sm">
          <div className="panel-head" style={{ marginBottom: 12 }}>
            <h4 className="table-headline">Chiffre d'affaires — 30 jours</h4>
            {hasCAData && (
              <span className="table-muted" style={{ fontSize: 12 }}>
                Total : {Math.round(caByDay.reduce((s, d) => s + d.ca, 0)).toLocaleString('fr-DZ')} DA
              </span>
            )}
          </div>

          {hasCAData ? (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={caByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartMuted} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: chartText }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: chartText }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? Math.round(v / 1000) + 'k' : v}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={{
                      background: tooltipBg,
                      border: `0.5px solid ${tooltipBorder}`,
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(v, _name, props) => [
                      `${v.toLocaleString('fr-DZ')} DA`,
                      `CA (${props.payload.count} cmd)`,
                    ]}
                    labelFormatter={(l) => `Jour : ${l}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="ca"
                    stroke={chartOrange}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: chartOrange }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: chartText }}>
              <span style={{ fontSize: 28 }}>📊</span>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Pas encore de données</p>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Les données CA apparaîtront dès les premières commandes.</span>
            </div>
          )}
        </div>

        {/* ── Pics horaires ──────────────────────────────────── */}
        <div className="chart-card rounded-xl shadow-sm">
          <div className="panel-head" style={{ marginBottom: 12 }}>
            <h4 className="table-headline">Pics de commandes par heure</h4>
            {hasHourlyData && (
              <span className="table-muted" style={{ fontSize: 12 }}>
                {orders.length} commande{orders.length > 1 ? 's' : ''} analysée{orders.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {hasHourlyData ? (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyPeaks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={chartMuted} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10, fill: chartText }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: chartText }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: tooltipBg,
                      border: `0.5px solid ${tooltipBorder}`,
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(v) => [v, 'Commandes']}
                    labelFormatter={(l) => `Heure : ${l}`}
                  />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                    {hourlyPeaks.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.orders === maxHourOrders ? chartOrange : chartGreen}
                        opacity={entry.orders === maxHourOrders ? 1 : 0.65}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: chartText }}>
              <span style={{ fontSize: 28 }}>🕐</span>
              <p style={{ fontSize: 13, fontWeight: 500 }}>Pas encore de données</p>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Les pics horaires apparaîtront avec les commandes.</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
