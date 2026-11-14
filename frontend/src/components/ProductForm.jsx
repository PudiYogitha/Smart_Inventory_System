import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "./PageHeader.jsx";
import { api } from "../services/api.js";

export default function ProductForm({ productId }) {
  const navigate = useNavigate();
  const editing = Boolean(productId);
  const [form, setForm] = useState({ name: "", sku: "", barcode: "", category: "General", price: 0, stock: 0, lowStockThreshold: 5 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!productId) return;
    api(`/products?search=${encodeURIComponent(productId)}&limit=50`).then(({ products }) => {
      const product = products.find((entry) => String(entry.id) === String(productId));
      if (!product) { navigate("/products", { replace: true }); return; }
      setForm({ name: product.name, sku: product.sku, barcode: product.barcode || "", category: product.category, price: product.price, stock: product.stock, lowStockThreshold: product.low_stock_threshold });
    }).catch((exception) => setError(exception.message));
  }, [productId, navigate]);

  function update(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.type === "number" ? event.target.value : event.target.value }));
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const payload = { ...form, price: Number(form.price), lowStockThreshold: Number(form.lowStockThreshold) };
    if (!editing) payload.stock = Number(form.stock);
    try {
      await api(editing ? `/products/${productId}` : "/products", {
        method: editing ? "PATCH" : "POST", body: JSON.stringify(payload)
      });
      navigate("/products");
    } catch (exception) { setError(exception.message); }
    finally { setBusy(false); }
  }
  return <main className="main-content">
    <PageHeader eyebrow="PRODUCT DETAILS" title={editing ? "Edit product" : "Add a product"} description="A few details are all it takes to keep your stock organized." />
    <form className="card product-form-card" onSubmit={submit}>
      <div className="form-grid">
        <label className="field field-span"><span>Product name</span><input required maxLength={160} value={form.name} onChange={update("name")} placeholder="e.g. House blend coffee" /></label>
        <label className="field"><span>SKU</span><input required maxLength={80} value={form.sku} onChange={update("sku")} placeholder="e.g. COF-001" /></label>
        <label className="field"><span>Barcode <small>(optional — scan or type)</small></span><input value={form.barcode} onChange={update("barcode")} placeholder="Scan or type barcode" /></label>
        <label className="field"><span>Category</span><input maxLength={80} value={form.category} onChange={update("category")} /></label>
        <label className="field"><span>Unit price</span><input type="number" min="0" step="0.01" required value={form.price} onChange={update("price")} /></label>
        {!editing && <label className="field"><span>Opening stock</span><input type="number" min="0" step="1" value={form.stock} onChange={update("stock")} /></label>}
        <label className="field"><span>Low-stock alert at</span><input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={update("lowStockThreshold")} /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><Link className="button button-quiet" to="/products">Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button></div>
    </form>
  </main>;
}
