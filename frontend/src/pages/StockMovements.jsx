import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { cachedApi, formatDate } from "../services/api.js";

export default function StockMovements() {
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    cachedApi("/stock/movements?limit=200").then((result) => setMovements(result.movements)).catch((exception) => setError(exception.message));
  }, []);
  return <main className="main-content">
    <PageHeader eyebrow="INVENTORY AUDIT" title="Stock movements" description="A clear history of every delivery, adjustment, and sale." />
    {error && <p className="error-banner" role="alert">{error}</p>}
    <section className="card table-card">
      <div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Movement history</h2></div><span className="muted">{movements.length} movements</span></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>Change</th><th>Reason</th><th>Team member</th><th>Date</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id}><td><span className="product-cell"><span className="product-avatar">{item.product_name.slice(0, 1)}</span><span><strong>{item.product_name}</strong><small className="table-sub">{item.sku}</small></span></span></td><td><span className={item.change > 0 ? "movement-positive" : "movement-negative"}>{item.change > 0 ? "+" : ""}{item.change}</span></td><td>{item.reason}</td><td>{item.staff_name}</td><td>{formatDate(item.created_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td></tr>)}</tbody></table></div>
      {!movements.length && <div className="empty-state">Stock adjustments and sales will appear here.</div>}
    </section>
  </main>;
}
