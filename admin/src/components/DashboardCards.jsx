import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from './EmptyState';

export default function DashboardCards({ ordersCount = 0, revenue = 0, data = [] }) {
  const isEmpty = ordersCount === 0 && revenue === 0;
  const sample = data.length ? data : [
    { day: '01', ca: 1200 },
    { day: '02', ca: 2100 },
    { day: '03', ca: 800 },
    { day: '04', ca: 1600 },
    { day: '05', ca: 2400 },
  ];

  return (
    <div className="stack">
      <div className="stats-grid">
        <div className="stat-card orange rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Commandes</div>
          <div className="mt-2 text-2xl font-semibold">{ordersCount || <span className="text-gray-400">—</span>}</div>
          <div className="text-xs text-green-600 mt-1">+12% vs hier</div>
        </div>
        <div className="stat-card blue rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Chiffre d'affaires (Da)</div>
          <div className="mt-2 text-2xl font-semibold">{revenue ? revenue.toLocaleString() + ' DA' : <span className="text-gray-400">—</span>}</div>
          <div className="text-xs text-red-500 mt-1">-3% vs hier</div>
        </div>
        <div className="stat-card gold rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Livreurs actifs</div>
          <div className="mt-2 text-2xl font-semibold">—</div>
        </div>
        <div className="stat-card green rounded-xl shadow-sm">
          <div className="text-sm text-slate-500">Taux de livraison</div>
          <div className="mt-2 text-2xl font-semibold">97%</div>
        </div>
      </div>

      <div className="chart-card rounded-xl shadow-sm">
        {isEmpty ? (
          <EmptyState title="Aucune donnée pour le moment" subtitle="Vérifiez la période ou reconnectez les sources." />
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sample}>
                <defs>
                  <linearGradient id="colorCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => v + ' DA'} />
                <Area type="monotone" dataKey="ca" stroke="#059669" fill="url(#colorCA)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
