import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { api, cachedApi, date } from "../services/api.js";
import useAuth from "../hooks/useAuth.js";

const EMPTY_FORM = { name: "", email: "", password: "", role: "staff" };

export default function Staff() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  useEffect(() => {
    cachedApi("/staff").then(({ staff: people }) => setStaff(people)).catch((exception) => setError(exception.message));
  }, []);
  function change(key) { return (event) => setForm((value) => ({ ...value, [key]: event.target.value })); }
  async function add(event) {
    event.preventDefault(); setError("");
    try {
      await api("/staff", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false); setForm(EMPTY_FORM);
      setStaff((await api("/staff")).staff);
    } catch (exception) { setError(exception.message); }
  }
  async function remove() {
    try {
      await api(`/staff/${removing.id}`, { method: "DELETE" });
      setStaff((current) => current.filter((member) => member.id !== removing.id));
      setRemoving(null);
    } catch (exception) { setError(exception.message); }
  }
  return <main className="main-content">
    <PageHeader eyebrow="YOUR PEOPLE" title="Team" description="Manage who can access your business."
      action={<button className="button button-primary" onClick={() => { setShowForm((value) => !value); setError(""); }}><Plus size={16} /> Add a teammate</button>} />
    {error && <p className="error-banner" role="alert">{error}<button onClick={() => setError("")}>×</button></p>}
    {showForm && <form className="card staff-form" onSubmit={add}><div className="staff-form-grid">
      <label className="field"><span>Name</span><input required maxLength={120} value={form.name} onChange={change("name")} /></label>
      <label className="field"><span>Email</span><input type="email" required value={form.email} onChange={change("email")} /></label>
      <label className="field"><span>Temporary password <small>At least 10 characters</small></span><input type="password" minLength={10} required value={form.password} onChange={change("password")} /></label>
      <label className="field"><span>Role</span><select value={form.role} onChange={change("role")}><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
    </div><button className="button button-primary">Add teammate</button></form>}
    <section className="card table-card"><div className="section-heading"><div><p className="eyebrow">STORE ACCESS</p><h2>Team members</h2></div><span className="muted">Admins can manage products and team access.</span></div>
      <div className="table-scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Added</th><th /></tr></thead><tbody>{staff.map((member) => <tr key={member.id}>
        <td><span className="product-cell"><span className="product-avatar">{member.name.slice(0, 1)}</span><strong>{member.name}</strong>{String(member.id) === String(user?.id) && <span className="you-tag">You</span>}</span></td>
        <td>{member.email}</td><td><span className={`role-badge${member.role === "admin" ? " role-admin" : ""}`}>{member.role === "admin" ? "Admin" : "Staff"}</span></td><td>{date(member.created_at)}</td>
        <td>{String(member.id) !== String(user?.id) && <button className="button button-danger button-small" onClick={() => setRemoving(member)}>Remove</button>}</td>
      </tr>)}</tbody></table></div>
    </section>
    {removing && <ConfirmDialog title="Remove team access?" message={`${removing.name} will no longer be able to sign in.`} confirmLabel="Remove teammate" onCancel={() => setRemoving(null)} onConfirm={remove} />}
  </main>;
}
