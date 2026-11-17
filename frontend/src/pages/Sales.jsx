import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api, cachedApi, date, money, notify, queueSale, queuedSales, syncSales } from "../services/api.js";

function createKey() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [productId, setProductId] = useState("");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [pending, setPending] = useState(queuedSales().length);
  const selected = products.find((item) => item.id === productId);
  const total = useMemo(() => selected ? Number(selected.price) * Number(quantity || 0) : 0, [selected, quantity]);

  useEffect(() => {
    cachedApi("/products?limit=50").then(({ products: items }) => setProducts(items)).catch((exception) => setError(exception.message));
    loadSales();
    const updateStatus = () => {
      setOffline(!navigator.onLine);
      setPending(queuedSales().length);
      if (navigator.onLine) syncSales().then(() => { setPending(queuedSales().length); loadSales(); })
        .catch((exception) => setError(exception.message));
    };
    const updateQueue = () => setPending(queuedSales().length);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    window.addEventListener("stockroom:sync", updateQueue);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
      window.removeEventListener("stockroom:sync", updateQueue);
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (!term || !navigator.onLine) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const { products: matches } = await api(`/products?search=${encodeURIComponent(term)}&limit=50`);
        if (!active) return;
        setProducts(matches);
        const barcodeMatch = matches.find((item) => item.barcode === term || item.sku.toLowerCase() === term.toLowerCase());
        if (barcodeMatch) { setProductId(barcodeMatch.id); setQuery(""); document.getElementById("sale-quantity")?.focus(); }
      } catch (exception) { if (active) setError(exception.message); }
    }, 160);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);

  async function loadSales() {
    try { setSales((await cachedApi("/sales?limit=100")).sales); }
    catch (exception) { setError(exception.message); }
  }
  async function submit(event) {
    event.preventDefault(); setError("");
    if (!selected || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setError("Choose an item and enter a valid quantity."); return;
    }
    if (!navigator.onLine && Number(quantity) > Number(selected.stock)) {
      setError(`Only ${selected.stock} units are available in your saved stock data.`); return;
    }
    const sale = { productId, quantity: Number(quantity), idempotencyKey: createKey() };
    setBusy(true);
    try {
      if (!navigator.onLine) {
        queueSale(sale);
        notify("Sale saved on this device. It will sync when you're back online.");
      } else {
        await api("/sales", { method: "POST", body: JSON.stringify(sale) });
        notify("Sale recorded.");
        await Promise.all([
          loadSales(),
          cachedApi("/products?limit=50").then(({ products: items }) => setProducts(items))
        ]);
      }
      setPending(queuedSales().length);
      setProductId(""); setQuantity("1"); setQuery("");
    } catch (exception) {
      if (!exception.status) {
        queueSale(sale); setPending(queuedSales().length);
        notify("Connection lost. Sale saved to sync later.");
      } else setError(exception.message);
    } finally { setBusy(false); }
  }

  return <main className="main-content">
    <PageHeader eyebrow="CHECKOUT & HISTORY" title="Sales" description="Record a sale and keep your stock moving."
      action={<span className={`sync-status${offline || pending ? " is-offline" : ""}`}>{offline ? "Offline" : pending ? `${pending} waiting to sync` : "All changes synced"}</span>} />
    <section className="sales-layout">
      <article className="card sale-entry"><div className="section-heading"><div><p className="eyebrow">QUICK CHECKOUT</p><h2>New sale</h2></div><span className="scan-badge">⌗ Barcode ready</span></div>
        <form onSubmit={submit}>
          <label className="field"><span>Scan barcode or search item</span><input autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Scan barcode or type a product name…" /></label>
          <label className="field"><span>Product</span><select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choose a product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stock} in stock · {money(item.price)}</option>)}</select></label>
          <label className="field"><span>Quantity</span><input id="sale-quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <div className="sale-total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "Recording…" : <>Complete sale <span>→</span></>}</button>
          <p className="offline-note">Offline? Sales will sync automatically when you reconnect.</p>
        </form>
      </article>
      <article className="card table-card sales-history"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Sales history</h2></div><button className="button button-quiet button-small" onClick={loadSales}>Refresh</button></div>
        <div className="table-scroll"><table><thead><tr><th>Product</th><th>Staff</th><th>Qty</th><th>Total</th><th>Time</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><strong>{sale.product_name}</strong><small className="table-sub">{sale.sku}</small></td><td>{sale.staff_name || "Former staff"}</td><td>{sale.quantity}</td><td>{money(sale.total)}</td><td>{date(sale.sold_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td></tr>)}</tbody></table></div>
        {!sales.length && <div className="empty-state">No sales recorded yet.</div>}
      </article>
    </section>
  </main>;
}
