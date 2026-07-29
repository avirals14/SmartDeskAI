import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { api } from "../api";

const PRIORITY_COLORS = { urgent: "#C4483A", high: "#E8A33D", medium: "#8B928A", low: "#B9C0BA", unset: "#D8DCE0" };
const STATUS_COLORS = { open: "#0E7C86", in_progress: "#E8A33D", resolved: "#8B928A", closed: "#B9C0BA" };

function StatCard({ label, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .dashboardSummary()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="empty-state">Loading dashboard\u2026</div>;
  if (error) return <div className="empty-state"><h3>Couldn't load dashboard</h3><p>{error}</p></div>;

  const { totals, byStatus, byPriority, byCategory, recentVolume } = data;
  const processedPct = totals.total ? Math.round((totals.processed / totals.total) * 100) : 0;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Aggregated from PostgreSQL via GROUP BY queries (backend/routes/dashboard.js).</p>

      <div className="stat-grid">
        <StatCard label="Total tickets" value={totals.total} />
        <StatCard label="AI-processed" value={totals.processed} sub={`${processedPct}% of total`} />
        <StatCard label="Open" value={byStatus.find((s) => s.status === "open")?.count || 0} />
        <StatCard label="Urgent priority" value={byPriority.find((p) => p.priority === "urgent")?.count || 0} />
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h4>Tickets by status</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={80}>
                {byStatus.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#ccc"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend">
            {byStatus.map((s) => (
              <span key={s.status} className="legend-item">
                <span className="legend-dot" style={{ background: STATUS_COLORS[s.status] || "#ccc" }} />
                {s.status.replace("_", " ")} ({s.count})
              </span>
            ))}
          </div>
        </div>

        <div className="card chart-card">
          <h4>Tickets by priority</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E1" />
              <XAxis dataKey="priority" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {byPriority.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#ccc"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h4>Top categories</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E1" />
              <XAxis type="number" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="category" fontSize={12} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#0E7C86" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h4>Ticket volume (last 14 days)</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={recentVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E6E1" />
              <XAxis dataKey="day" fontSize={10} tickFormatter={(d) => d.slice(5)} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0E7C86" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
