import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import { cachedApi, money } from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

function SalesChart({ rows }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    const key = date.toISOString().slice(0, 10);
    return { date, units: Number(rows.find((row) => String(row.day).slice(0, 10) === key)?.units || 0) };
  });
  const max = Math.max(1, ...days.map((day) => day.units));
  const points = days.map((day, index) => `${index * 100 / 6},${90 - day.units / max * 75}`).join(" ");
  return <div className="mini-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Sales over the last seven days">
    {[15, 40, 65, 90].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-gridline" />)}
    <polyline points={points} className="chart-line" />
  </svg><div className="chart-days">{days.map((day) => <span key={day.date.toISOString()}>{day.date.toLocaleDateString(undefined, { weekday: "short" })}</span>)}</div></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([cachedApi("/reports/dashboard"), cachedApi("/reports/trends?days=7")])
      .then(([summary, report]) => { setDashboard(summary); setTrend(report.daily); })
      .catch((exception) => setError(exception.message));
  }, []);
  return <main className="main-content">
    <PageHeader eyebrow="YOUR BUSINESS AT A GLANCE" title={<>Good morning, {user?.name?.split(" ")[0]}</>} description="Here’s what’s happening with your stock today." action={<Link className="button button-primary" to="/sales">＋ Record a sale</Link>} />
    {error && <p className="error-banner" role="alert">{error}</p>}
    <section className="stat-grid">
      <StatCard label="Items in catalogue" value={Number(dashboard?.inventory.items || 0).toLocaleString()} note="of 100,000 item limit" icon="▤" />
      <StatCard label="Units in stock" value={Number(dashboard?.inventory.units || 0).toLocaleString()} note="Across all products" icon="▦" />
      <StatCard label="Revenue today" value={money(dashboard?.today.revenue)} note={`${dashboard?.today.sales || 0} sales recorded`} icon="↗" />
      <StatCard label="Need attention" value={dashboard?.lowStock.length ?? "—"} note="At or below reorder point" icon="!" alert />
    </section>
    <section className="content-grid dashboard-grid">
      <article className="card chart-card"><div className="section-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Sales at a glance</h2></div><Link className="text-link" to="/reports">View reports →</Link></div><SalesChart rows={trend} /></article>
      <article className="card alert-card"><div className="section-heading"><div><p className="eyebrow">RESTOCK SOON</p><h2>Low stock <span className="count-pill">{dashboard?.lowStock.length || 0}</span></h2></div><Link className="text-link" to="/products">All items →</Link></div>
        <div className="alert-list">{dashboard?.lowStock.length ? dashboard.lowStock.map((item) => <Link className="alert-item" to="/products" key={item.id}><span className="product-avatar">{item.name.slice(0, 1)}</span><span className="alert-name"><strong>{item.name}</strong><small>{item.sku}</small></span><span className="stock-warning">{item.stock} left</span></Link>) : <div className="empty-inline"><span className="check-mark">✓</span>Everything’s stocked up.</div>}</div>
      </article>
    </section>
    <section className="card table-card"><div className="section-heading"><div><p className="eyebrow">YOUR FAST MOVERS</p><h2>Popular this week</h2></div><Link className="text-link" to="/reports">Explore reports →</Link></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>Units sold</th><th>Momentum</th></tr></thead><tbody>{dashboard?.bestsellers.length ? dashboard.bestsellers.map((item, index) => <tr key={item.id}><td><span className="product-cell"><span className="rank-number">0{index + 1}</span><strong>{item.name}</strong></span></td><td>{item.units} units</td><td><span className="trend-positive">↗ Selling well</span></td></tr>) : <tr><td className="table-empty" colSpan="3">Sales will show up here once you get started.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
