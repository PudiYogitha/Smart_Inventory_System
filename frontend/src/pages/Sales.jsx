import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api, cachedApi, formatDate, money, queueSale, queuedSales, syncSales } from "../services/api.js";

function makeKey() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [queued, setQueued] = useState(queuedSales().length);
  const [busy, setBusy] = useState(false);
  const selected = products.find((item) => String(item.id) === productId);
  const total = useMemo(() => selected ? Number(selected.price) * Number(quantity || 0) : 0, [selected, quantity]);

  useEffect(() => {
    cachedApi("/products?limit=50").then(({ products: items }) => setProducts(items)).catch((exception) => setError(exception.message));
    loadSales();
    const updateOnline = () => {
      setOffline(!navigator.onLine);
      setQueued(queuedSales().length);
      if (navigator.onLine) syncSales().then(() => { setQueued(queuedSales().length); loadSales(); }).catch((exception) => setError(exception.message));
    };
    const updateQueue = () => setQueued(queuedSales().length);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("stockroom:sync", updateQueue);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("stockroom:sync", updateQueue);
    };
  }, []);

  async function loadSales() {
    try { setSales((await cachedApi("/sales?limit=100")).sales); }
    catch (exception) { setError(exception.message); }
  }
  function scanLookup(value) {
    setSearch(value);
    const term = value.trim().toLowerCase();
    if (!term) return;
    const found = products.find((item) => item.barcode === value.trim() || item.sku.toLowerCase() === term || item.name.toLowerCase() === term);
    if (found) {
      setProductId(String(found.id));
      if (found.barcode === value.trim() || found.sku.toLowerCase() === term) {
        setSearch("");
        document.getElementById("sale-quantity")?.focus();
      }
    }
  }

  useEffect(() => {
    const term = search.trim();
    if (!term || !navigator.onLine) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      api(`/products?search=${encodeURIComponent(term)}&limit=50`)
        .then(({ products: matches }) => {
          if (!active) return;
          setProducts((current) => {
            const selectedItem = current.find((item) => String(item.id) === productId);
            return selectedItem && !matches.some((item) => item.id === selectedItem.id) ? [selectedItem, ...matches] : matches;
          });
          const exact = matches.find((item) => item.barcode === term || item.sku.toLowerCase() === term.toLowerCase());
          if (exact) {
            setProductId(String(exact.id));
            setSearch("");
            document.getElementById("sale-quantity")?.focus();
          }
        })
        .catch((exception) => { if (active) setError(exception.message); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!selected || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setError("Choose an item and enter a valid quantity.");
      return;
    }
    if (offline && Number(quantity) > Number(selected.stock)) {
      setError(`Only ${selected.stock} units are available in the last saved stock data.`);
      return;
    }
    const sale = { productId: selected.id, quantity: Number(quantity), idempotencyKey: makeKey() };
    setBusy(true);
    try {
      if (!navigator.onLine) {
        queueSale(sale);
        window.dispatchEvent(new Event("stockroom:sync"));
      } else {
        await api("/sales", { method: "POST", body: JSON.stringify(sale) });
        await Promise.all([loadSales(), cachedApi("/products?limit=50").then(({ products: items }) => setProducts(items))]);
      }
      setQueued(queuedSales().length);
      setProductId(""); setQuantity(1); setSearch("");
    } catch (exception) {
      if (!exception.status) {
        queueSale(sale);
        setQueued(queuedSales().length);
        window.dispatchEvent(new CustomEvent("stockroom:toast", { detail: "Connection lost. Sale saved to sync later." }));
      } else setError(exception.message);
    } finally { setBusy(false); }
  }

  return <main className="main-content">
    <PageHeader eyebrow="CHECKOUT & HISTORY" title="Sales" description="Record a sale and keep your stock moving." action={<span className={`sync-status${offline || queued ? " is-offline" : ""}`}>{offline ? "Offline" : queued ? `${queued} waiting to sync` : "All changes synced"}</span>} />
    <section className="sales-layout">
      <article className="card sale-entry"><div className="section-heading"><div><p className="eyebrow">QUICK CHECKOUT</p><h2>New sale</h2></div><span className="scan-badge">⌗ Barcode ready</span></div>
        <form onSubmit={submit}>
          <label className="field"><span>Scan barcode or search item</span><input autoComplete="off" value={search} onChange={(event) => scanLookup(event.target.value)} placeholder="Scan barcode or type a product name…" /></label>
          <label className="field"><span>Product</span><select required value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Choose a product</option>{products.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.stock} in stock · {money(item.price)}</option>)}</select></label>
          <label className="field"><span>Quantity</span><input id="sale-quantity" type="number" min="1" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <div className="sale-total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary button-wide" disabled={busy}>{busy ? "Recording…" : <>Complete sale <span>→</span></>}</button>
          <p className="offline-note">Offline? Sales will sync automatically when you reconnect.</p>
        </form>
      </article>
      <article className="card table-card sales-history"><div className="section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Sales history</h2></div><button className="button button-quiet button-small" onClick={loadSales}>Refresh</button></div>
        <div className="table-scroll"><table><thead><tr><th>Product</th><th>Staff</th><th>Qty</th><th>Total</th><th>Time</th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td><strong>{sale.product_name}</strong><small className="table-sub">{sale.sku}</small></td><td>{sale.staff_name || "Former staff"}</td><td>{sale.quantity}</td><td>{money(sale.total)}</td><td>{formatDate(sale.sold_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td></tr>)}</tbody></table></div>
        {!sales.length && <div className="empty-state">No sales recorded yet.</div>}
      </article>
    </section>
  </main>;
}
