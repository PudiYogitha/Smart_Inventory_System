import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import SearchBar from "../components/SearchBar.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { api, cachedApi, money } from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

const PAGE_SIZE = 50;

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [adjusting, setAdjusting] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      cachedApi(`/products?search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
        .then((result) => {
          if (active) { setProducts(result.products); setTotal(result.total); }
        })
        .catch((exception) => { if (active) setError(exception.message); });
    }, search ? 180 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [search, page]);

  async function adjust(event) {
    event.preventDefault();
    const quantity = Number(adjustQuantity);
    if (!Number.isInteger(quantity) || quantity === 0 || !adjustReason.trim()) {
      setAdjustError("Enter a non-zero whole number and a reason.");
      return;
    }
    try {
      const { product: updated } = await api(`/stock/products/${adjusting.id}/adjustments`, {
        method: "POST", body: JSON.stringify({ quantity, reason: adjustReason })
      });
      setProducts((current) => current.map((item) => item.id === adjusting.id ? { ...item, stock: updated.stock } : item));
      setAdjusting(null);
      setAdjustQuantity("");
      setAdjustReason("");
      setAdjustError("");
    } catch (exception) { setAdjustError(exception.message); }
  }
  async function remove() {
    try {
      await api(`/products/${deleting.id}`, { method: "DELETE" });
      setProducts((current) => current.filter((item) => item.id !== deleting.id));
      setTotal((count) => count - 1);
      setDeleting(null);
    } catch (exception) { setError(exception.message); }
  }

  return <main className="main-content">
    <PageHeader eyebrow="YOUR CATALOGUE" title="Products" description="Keep your catalogue tidy and your stock in check."
      action={<Link className="button button-primary" to="/products/new"><Plus size={16} /> Add a product</Link>} />
    {error && <p className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></p>}
    <section className="card inventory-card">
      <div className="toolbar"><SearchBar value={search} onChange={(value) => { setSearch(value); setPage(0); }} placeholder="Search name, SKU or barcode…" /><span className="muted">{total.toLocaleString()} items found</span></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>SKU / barcode</th><th>Category</th><th>Price</th><th>In stock</th><th>Reorder at</th><th>Actions</th></tr></thead>
        <tbody>{products.map((item) => {
          const low = Number(item.stock) <= Number(item.low_stock_threshold);
          return <tr key={item.id}>
            <td><span className="product-cell"><span className="product-avatar">{item.name.slice(0, 1)}</span><strong>{item.name}</strong></span></td>
            <td><span className="sku-primary">{item.sku}</span><small className="table-sub">{item.barcode || "No barcode"}</small></td>
            <td>{item.category}</td><td>{money(item.price)}</td>
            <td><span className={`stock-cell${low ? " stock-low" : ""}`}>{item.stock}{low ? " · Low" : ""}</span></td><td>{item.low_stock_threshold}</td>
            <td><div className="row-actions"><button className="button button-quiet button-small" onClick={() => { setAdjusting(item); setAdjustQuantity(""); setAdjustReason(""); setAdjustError(""); }}>Adjust</button>
              {isAdmin && <><Link className="button button-quiet button-small" to={`/products/${item.id}/edit`}>Edit</Link><button className="button button-danger button-small" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}><Trash2 size={13} /></button></>}
            </div></td>
          </tr>;
        })}</tbody></table></div>
      {!products.length && <div className="empty-state"><span className="empty-icon">▤</span><strong>{search ? "No matching products" : "Your catalogue is ready for its first product"}</strong><span>{search ? "Try a different search." : "Add a product or scan a barcode to get started."}</span></div>}
      {total > PAGE_SIZE && <div className="pagination"><span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}</span><div>
        <button className="button button-quiet button-small" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button>
        <button className="button button-quiet button-small" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>Next</button>
      </div></div>}
    </section>
    {adjusting && <div className="modal-backdrop"><section className="adjust-dialog" role="dialog" aria-modal="true" aria-labelledby="adjust-title">
      <p className="eyebrow">STOCK MOVEMENT</p><h2 id="adjust-title">Adjust stock</h2>
      <p className="muted">{adjusting.name} · {adjusting.stock} currently in stock</p>
      <form onSubmit={adjust}><label className="field"><span>Quantity to add or remove</span><input autoFocus type="number" step="1" required value={adjustQuantity} onChange={(event) => setAdjustQuantity(event.target.value)} placeholder="e.g. 12 or -2" /></label>
        <label className="field"><span>Reason</span><input required maxLength={200} value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} placeholder="e.g. New delivery" /></label>
        {adjustError && <p className="form-error" role="alert">{adjustError}</p>}
        <div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setAdjusting(null)}>Cancel</button><button className="button button-primary">Update stock</button></div>
      </form>
    </section></div>}
    {deleting && <ConfirmDialog title="Remove this product?" message={`“${deleting.name}” will be removed from active inventory.`} confirmLabel="Remove product" onCancel={() => setDeleting(null)} onConfirm={remove} />}
  </main>;
}
