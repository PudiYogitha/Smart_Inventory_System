import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader.jsx";
import { api, cachedApi, formatDate } from "../services/api.js";

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    try { setCurrent(JSON.parse(localStorage.getItem("stockroom-user") || "null")); } catch { setCurrent(null); }
    load();
  }, []);
  async function load() {
    try { setStaff((await cachedApi("/staff")).staff); }
    catch (exception) { setError(exception.message); }
  }
  async function submit(event) {
    event.preventDefault(); setError("");
    try {
      await api("/staff", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false); setForm({ name: "", email: "", password: "", role: "staff" }); await load();
    } catch (exception) { setError(exception.message); }
  }
  async function remove(id) {
    if (!window.confirm("Remove this team member’s access?")) return;
    try { await api(`/staff/${id}`, { method: "DELETE" }); await load(); }
    catch (exception) { setError(exception.message); }
  }
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  return <main className="main-content">
    <PageHeader eyebrow="YOUR PEOPLE" title="Team" description="Manage who can access your business." action={<button className="button button-primary" onClick={() => { setError(""); setShowForm(!showForm); }}>＋ Add a teammate</button>} />
    {error && <p className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></p>}
    {showForm && <form className="card staff-form" onSubmit={submit}><div className="staff-form-grid">
      <label className="field"><span>Name</span><input required maxLength={120} value={form.name} onChange={update("name")} /></label>
      <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={update("email")} /></label>
      <label className="field"><span>Temporary password <small>At least 10 characters</small></span><input type="password" minLength={10} required value={form.password} onChange={update("password")} /></label>
      <label className="field"><span>Role</span><select value={form.role} onChange={update("role")}><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
    </div><button className="button button-primary">Add teammate</button></form>}
    <section className="card table-card"><div className="section-heading"><div><p className="eyebrow">STORE ACCESS</p><h2>Team members</h2></div><span className="muted">Admins can manage products and team access.</span></div>
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added</th><th /></tr></thead><tbody>{staff.map((member) => <tr key={member.id}><td><span className="product-cell"><span className="product-avatar">{member.name.slice(0, 1)}</span><strong>{member.name}</strong>{String(member.id) === String(current?.id) && <span className="you-tag">You</span>}</span></td><td>{member.email}</td><td><span className={`role-badge${member.role === "admin" ? " role-admin" : ""}`}>{member.role === "admin" ? "Admin" : "Staff"}</span></td><td>{formatDate(member.created_at)}</td><td>{String(member.id) !== String(current?.id) && <button className="button button-danger button-small" onClick={() => remove(member.id)}>Remove</button>}</td></tr>)}</tbody></table></div>
    </section>
  </main>;
}
