import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import DashboardCards from './DashboardCards';

const sampleCA = [
  { day: '01', ca: 1200, orders: 12 },
  { day: '02', ca: 2100, orders: 21 },
  { day: '03', ca: 800, orders: 8 },
  { day: '04', ca: 1600, orders: 16 },
  { day: '05', ca: 2400, orders: 24 },
];

export default function AnalyticsDashboard({ data = sampleCA, ordersCount = 0, revenue = 0 }) {
  return (
    <div className="stack">
      <DashboardCards ordersCount={ordersCount} revenue={revenue} data={data} />

      <div className="chart-grid">
        <div className="chart-card rounded-xl shadow-sm">
          <div className="panel-head">
            <h4 className="table-headline">Chiffre d'affaires (Da) — par jour</h4>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(v) => v + ' DA'} />
                <Line type="monotone" dataKey="ca" stroke="#ea580c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card rounded-xl shadow-sm">
          <div className="panel-head">
            <h4 className="table-headline">Pics de commandes (heures)</h4>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ hour: '10h', orders: 12 }, { hour: '12h', orders: 28 }, { hour: '14h', orders: 18 }, { hour: '20h', orders: 32 }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" fill="#059669" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
