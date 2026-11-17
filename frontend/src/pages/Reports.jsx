import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { cachedApi } from "../services/api.js";

function TrendChart({ rows, days }) {
  const values = Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - days + 1 + index);
    const key = date.toISOString().slice(0, 10);
    const row = rows.find((item) => String(item.day).slice(0, 10) === key);
    return { date, units: Number(row?.units || 0), revenue: Number(row?.revenue || 0) };
  });
  const maxUnits = Math.max(1, ...values.map((item) => item.units));
  const maxRevenue = Math.max(1, ...values.map((item) => item.revenue));
  const coordinates = (key, max) => values.map((item, index) => `${index * 100 / Math.max(1, days - 1)},${90 - item[key] / max * 75}`).join(" ");
  const step = Math.max(1, Math.ceil(days / 7));
  return <><div className="report-svg-wrap"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Daily units and revenue trends">
    {[15, 33, 52, 71, 90].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="chart-gridline" />)}
    <polyline points={coordinates("units", maxUnits)} className="chart-line" />
    <polyline points={coordinates("revenue", maxRevenue)} className="chart-revenue-line" />
  </svg></div><div className="chart-days">{values.map((item, index) => <span key={index}>
    {index % step === 0 || index === values.length - 1 ? item.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
  </span>)}</div></>;
}

export default function Reports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState({ daily: [], restock: [] });
  const [error, setError] = useState("");
  useEffect(() => {
    cachedApi(`/reports/trends?days=${days}`).then(setData).catch((exception) => setError(exception.message));
  }, [days]);
  return <main className="main-content">
    <PageHeader eyebrow="MAKE YOUR NEXT MOVE" title="Reports" description="Sales trends and restock suggestions based on your sales."
      action={<label className="select-label">Period<select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="30">Last 30 days</option><option value="7">Last 7 days</option><option value="90">Last 90 days</option></select></label>} />
    {error && <p className="error-banner" role="alert">{error}</p>}
    <section className="card report-chart"><div className="section-heading"><div><p className="eyebrow">SALES PERFORMANCE</p><h2>Units sold & revenue</h2></div></div>
      <div className="chart-tall"><TrendChart rows={data.daily} days={days} /></div><div className="chart-legend"><span><i className="legend-dot legend-units" />Units sold</span><span><i className="legend-dot legend-revenue" />Revenue</span></div>
    </section>
    <section className="card table-card restock-card"><div className="section-heading"><div><p className="eyebrow">BASED ON THE LAST 30 DAYS</p><h2>Restock suggestions</h2></div><span className="muted">Target: 30 days of stock</span></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>On hand</th><th>Avg. daily sales</th><th>Days left</th><th>Suggested order</th></tr></thead><tbody>{data.restock.map((item) => <tr key={item.id}>
        <td><span className="product-cell"><span className="product-avatar">{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small className="table-sub">{item.sku}</small></span></span></td>
        <td>{item.stock}</td><td>{Number(item.dailyRate).toFixed(1)} units</td><td>{item.daysLeft === null ? "—" : <span className={item.daysLeft <= 7 ? "stock-low" : ""}>{item.daysLeft} days</span>}</td>
        <td><strong className="suggestion-count">{item.suggested} units</strong></td>
      </tr>)}</tbody></table></div>
      {!data.restock.length && <div className="empty-state">Looking good — no items need restocking right now.</div>}
    </section>
  </main>;
}
