import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from './EmptyState';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function DeltaBadge({ value }) {
  if (value === 0) return <span className="stat-delta neutral"><Minus size={11} /> 0% vs hier</span>;
  if (value > 0) return <span className="stat-delta up"><TrendingUp size={11} /> +{value}% vs hier</span>;
  return <span className="stat-delta down"><TrendingDown size={11} /> {value}% vs hier</span>;
}

/**
 * DashboardCards — statistiques dynamiques réelles
 *
 * Améliorations appliquées :
 * - Tous les chiffres calculés depuis les vraies données (orders, couriers)
 * - Delta J-1 calculé en comparant commandes du jour vs commandes d'hier
 * - Livreurs actifs = count(status === 'AVAILABLE')
 * - Taux de livraison = Delivered / total * 100 (excluant Cancelled)
 * - Flèche colorée (vert/rouge/gris) selon delta
 * - Graphe CA connecté aux vraies commandes groupées par jour
 */
export default function DashboardCards({ orders = [], couriers = [] }) {

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Commandes par date
    const todayOrders     = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    const yesterdayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === yesterdayStr);

    // CA
    const revenueToday     = todayOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const revenueYesterday = yesterdayOrders.reduce((s, o) => s + Number(o.total || 0), 0);

    // Deltas (en %)
    function delta(today, yesterday) {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    }

    const ordersDelta  = delta(todayOrders.length, yesterdayOrders.length);
    const revenueDelta = delta(revenueToday, revenueYesterday);

    // Livreurs actifs
    const activeCouriers = couriers.filter((c) => c.status === 'AVAILABLE').length;

    // Taux de livraison (sur les 30 derniers jours, excluant Cancelled)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = orders.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
    const countableOrders = recentOrders.filter((o) => o.status !== 'Cancelled');
    const deliveredOrders = recentOrders.filter((o) => o.status === 'Delivered');
    const deliveryRate = countableOrders.length > 0
      ? Math.round((deliveredOrders.length / countableOrders.length) * 100)
      : null;

    return { ordersDelta, revenueDelta, activeCouriers, deliveryRate, revenueToday, todayOrders };
  }, [orders, couriers]);

  // Données graphe CA : 7 derniers jours groupés
  const chartData = useMemo(() => {
    const map = {};
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[d.toDateString()] = { day: key, ca: 0 };
    }

    orders.forEach((o) => {
      const key = new Date(o.createdAt).toDateString();
      if (map[key]) map[key].ca += Number(o.total || 0);
    });

    return Object.values(map).map((d) => ({ ...d, ca: Math.round(d.ca) }));
  }, [orders]);

  const totalRevenue = useMemo(
    () => orders.reduce((s, o) => s + Number(o.total || 0), 0),
    [orders]
  );

  const isEmpty = orders.length === 0;

  return (
    <div className="stack">
      <div className="stats-grid">

        {/* Commandes du jour */}
        <div className="stat-card orange rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Commandes aujourd'hui</div>
          <div className="mt-2 text-2xl font-semibold">
            {stats.todayOrders.length || <span className="text-gray-400">0</span>}
          </div>
          <DeltaBadge value={stats.ordersDelta} />
        </div>

        {/* CA total */}
        <div className="stat-card blue rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Chiffre d'affaires (Da)</div>
          <div className="mt-2 text-2xl font-semibold">
            {totalRevenue > 0
              ? Math.round(totalRevenue).toLocaleString('fr-DZ') + ' DA'
              : <span className="text-gray-400">—</span>}
          </div>
          <DeltaBadge value={stats.revenueDelta} />
        </div>

        {/* Livreurs actifs */}
        <div className="stat-card gold rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Livreurs disponibles</div>
          <div className="mt-2 text-2xl font-semibold">
            {couriers.length > 0
              ? stats.activeCouriers
              : <span className="text-gray-400">—</span>}
          </div>
          {couriers.length > 0 && (
            <div className="text-xs text-slate-400 mt-1">
              sur {couriers.length} livreur{couriers.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Taux de livraison */}
        <div className="stat-card green rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Taux de livraison</div>
          <div className="mt-2 text-2xl font-semibold">
            {stats.deliveryRate !== null
              ? `${stats.deliveryRate}%`
              : <span className="text-gray-400">—</span>}
          </div>
          <div className="text-xs text-slate-400 mt-1">30 derniers jours</div>
        </div>
      </div>

      {/* Graphe CA 7 jours */}
      <div className="chart-card rounded-xl shadow-sm">
        <div className="panel-head" style={{ marginBottom: '12px' }}>
          <h4 className="table-headline">Chiffre d'affaires — 7 derniers jours</h4>
        </div>
        {isEmpty ? (
          <EmptyState title="Aucune donnée pour le moment" subtitle="Les statistiques apparaîtront dès les premières commandes." />
        ) : (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#34D399" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v > 999 ? Math.round(v / 1000) + 'k' : v} />
                <Tooltip
                  formatter={(v) => [Math.round(v).toLocaleString('fr-DZ') + ' DA', 'CA']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="ca"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#colorCA)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
