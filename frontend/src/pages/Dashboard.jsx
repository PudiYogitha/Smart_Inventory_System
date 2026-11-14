import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { api, cachedApi, money } from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

function MiniChart({ rows }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { date, units: Number(rows.find((row) => String(row.day).slice(0, 10) === key)?.units || 0) };
  });
  const max = Math.max(1, ...days.map((day) => day.units));
  const points = days.map((day, index) => `${index * 100 / 6},${90 - day.units / max * 74}`).join(" ");
  return <div className="mini-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Sales units over the last seven days">
    {[20, 45, 70, 90].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-gridline" />)}
    <polyline points={points} className="chart-area" /><polyline points={points} className="chart-line" />
  </svg><div className="chart-days">{days.map((day) => <span key={day.date.toISOString()}>{day.date.toLocaleDateString(undefined, { weekday: "short" })}</span>)}</div></div>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [daily, setDaily] = useState([]);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    Promise.all([cachedApi("/reports/dashboard"), cachedApi("/reports/trends?days=7")])
      .then(([dashboard, trends]) => { setData(dashboard); setDaily(trends.daily); })
      .catch((exception) => setError(exception.message));
  }, []);
  async function loadDemoData() {
    if (!window.confirm("This adds clearly marked demo inventory and sales to your business and affects reports. Continue?")) return;
    setError("");
    setSeeding(true);
    try {
      await api("/reports/demo-data", { method: "POST" });
      const [dashboard, trends] = await Promise.all([
        api("/reports/dashboard"),
        api("/reports/trends?days=7")
      ]);
      setData(dashboard);
      setDaily(trends.daily);
    } catch (exception) {
      setError(exception.message);
    } finally {
      setSeeding(false);
    }
  }
  return <main className="main-content">
    <PageHeader eyebrow="OVERVIEW" title="Overview" description="Inventory, sales, and stock at a glance." action={<>
      {user?.role === "admin" && data?.inventory.items === 0 && !data.demoData && <button className="button button-quiet" onClick={loadDemoData} disabled={seeding}>{seeding ? "Loading sample data…" : "Load sample data"}</button>}
      <Link className="button button-primary" to="/sales">＋ Record a sale</Link>
    </>} />
    {error && <p className="error-banner" role="alert">{error}</p>}
    {data?.demoData && <p className="demo-notice" role="status">Demo data is active. Products and sales marked “Demo” are sample records, not real business activity.</p>}
    <section className="dashboard-overview">
      <div><p className="eyebrow">YOUR BUSINESS AT A GLANCE</p><h2>Know what’s in stock.<br />Know what needs attention.</h2><Link to="/products">View products <span>→</span></Link></div>
      <article className="monthly-summary"><p className="eyebrow">MONTHLY SALES</p><strong>{money(data?.month?.revenue)}</strong><span>{Number(data?.month?.sales || 0).toLocaleString()} completed sales this month</span><Link to="/sales">Record a sale <span>→</span></Link></article>
    </section>
    <section className="stat-grid">
      <StatCard label="Products" value={Number(data?.inventory.items || 0).toLocaleString()} note="Active catalogue" icon="▤" />
      <StatCard label="Inventory value" value={money(data?.inventory.value)} note="At catalogue price" icon="₹" />
      <StatCard label="Low stock" value={Number(data?.lowStockCount || 0).toLocaleString()} note="Products need attention" icon="!" alert />
      <StatCard label="Out of stock" value={Number(data?.inventory.outOfStock || 0).toLocaleString()} note="Currently unavailable" icon="▦" />
      <StatCard label="Today’s sales" value={money(data?.today.revenue)} note={`${data?.today.sales || 0} completed sales`} icon="↗" />
      <StatCard label="Stock units" value={Number(data?.inventory.units || 0).toLocaleString()} note="Across active products" icon="▦" />
    </section>
    <section className="content-grid dashboard-grid">
      <article className="card chart-card"><div className="section-heading"><div><p className="eyebrow">LAST 7 DAYS</p><h2>Sales at a glance</h2></div><Link className="text-link" to="/reports">View reports →</Link></div><MiniChart rows={daily} /></article>
      <article className="card alert-card"><div className="section-heading"><div><p className="eyebrow">RESTOCK SOON</p><h2>Low stock <span className="count-pill">{data?.lowStockCount || 0}</span></h2></div><Link className="text-link" to="/products">All items →</Link></div>
        <div className="alert-list">{data?.lowStock.length ? data.lowStock.map((item) => <Link className="alert-item" to="/products" key={item.id}><span className="product-avatar">{item.name.slice(0, 1)}</span><span className="alert-name"><strong>{item.name}</strong><small>{item.sku}</small></span><span className="stock-warning">{item.stock} left</span></Link>) : <div className="empty-inline"><span className="check-mark">✓</span>Everything’s stocked up.</div>}</div>
      </article>
    </section>
    <section className="card table-card"><div className="section-heading"><div><p className="eyebrow">YOUR FAST MOVERS</p><h2>Popular this week</h2></div><Link className="text-link" to="/reports">Explore reports →</Link></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>Units sold</th><th>Momentum</th></tr></thead><tbody>{data?.bestsellers.length ? data.bestsellers.map((item, index) => <tr key={item.id}><td><span className="product-cell"><span className="rank-number">0{index + 1}</span><strong>{item.name}</strong></span></td><td>{Number(item.units).toLocaleString()} units</td><td><span className="trend-positive">↗ Selling well</span></td></tr>) : <tr><td className="table-empty" colSpan="3">Sales will show up here once you get started.</td></tr>}</tbody></table></div>
    </section>
  </main>;
}
