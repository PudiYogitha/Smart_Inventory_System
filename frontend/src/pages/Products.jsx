import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { api, cachedApi, money } from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const admin = user?.role === "admin";
  const pageSize = 50;
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      cachedApi(`/products?search=${encodeURIComponent(query)}&limit=${pageSize}&offset=${page * pageSize}`)
        .then((result) => {
          if (active) { setProducts(result.products); setTotal(result.total); }
        })
        .catch((exception) => { if (active) setError(exception.message); });
    }, query ? 180 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, page]);

  async function remove(item) {
    if (!window.confirm(`Remove "${item.name}" from your catalogue?`)) return;
    try {
      await api(`/products/${item.id}`, { method: "DELETE" });
      setProducts((current) => current.filter((entry) => entry.id !== item.id));
      setTotal((count) => Math.max(0, count - 1));
    } catch (exception) { setError(exception.message); }
  }
  async function adjust(item) {
    const raw = window.prompt(`Adjust stock for ${item.name} (use a negative number to remove stock):`);
    if (raw === null) return;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity === 0) { setError("Enter a non-zero whole number."); return; }
    const reason = window.prompt("Reason for this stock adjustment:");
    if (!reason?.trim()) return;
    try {
      const { product } = await api(`/products/${item.id}/adjustments`, { method: "POST", body: JSON.stringify({ quantity, reason }) });
      setProducts((current) => current.map((entry) => entry.id === item.id ? { ...entry, stock: product.stock } : entry));
    } catch (exception) { setError(exception.message); }
  }

  return <main className="main-content">
    <PageHeader eyebrow="YOUR CATALOGUE" title="Products" description="Keep your catalogue tidy and your stock in check." action={<Link className="button button-primary" to="/products/new"><Plus size={16} /> Add a product</Link>} />
    {error && <p className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></p>}
    <section className="card inventory-card">
      <div className="toolbar"><SearchBar value={query} onChange={(value) => { setQuery(value); setPage(0); }} placeholder="Search name, SKU or barcode…" /><span className="muted">{total.toLocaleString()} items found</span></div>
      <div className="table-scroll"><table><thead><tr><th>Product</th><th>SKU / barcode</th><th>Category</th><th>Price</th><th>In stock</th><th>Reorder at</th><th>Actions</th></tr></thead>
        <tbody>{products.map((item) => {
          const low = Number(item.stock) <= Number(item.low_stock_threshold);
          return <tr key={item.id}><td><span className="product-cell"><span className="product-avatar">{item.name.slice(0, 1)}</span><strong>{item.name}</strong></span></td>
            <td><span className="sku-primary">{item.sku}</span><small className="table-sub">{item.barcode || "No barcode"}</small></td><td>{item.category}</td><td>{money(item.price)}</td>
            <td><span className={`stock-cell${low ? " stock-low" : ""}`}>{Number(item.stock).toLocaleString()}{low ? " · Low" : ""}</span></td><td>{item.low_stock_threshold}</td>
            <td><div className="row-actions"><button className="button button-quiet button-small" onClick={() => adjust(item)}>Adjust</button>{admin && <><Link className="button button-quiet button-small" to={`/products/${item.id}/edit`}>Edit</Link><button className="button button-danger button-small" aria-label={`Delete ${item.name}`} onClick={() => remove(item)}><Trash2 size={13} /></button></>}</div></td>
          </tr>;
        })}</tbody></table></div>
      {!products.length && <div className="empty-state"><span className="empty-icon">▤</span><strong>{query ? "No matching products" : "Your catalogue is ready for its first product"}</strong><span>{query ? "Try a different search." : "Add a product or scan a barcode to get started."}</span></div>}
      {total > pageSize && <div className="pagination"><span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()}</span><div><button className="button button-quiet button-small" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button-quiet button-small" disabled={(page + 1) * pageSize >= total} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>}
    </section>
  </main>;
}
