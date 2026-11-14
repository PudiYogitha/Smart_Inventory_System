import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { api } from "../services/api.js";

export default function Register() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ businessName: "", name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      signIn(await api("/auth/register", { method: "POST", body: JSON.stringify(form) }));
      navigate("/", { replace: true });
    } catch (exception) { setError(exception.message); }
    finally { setBusy(false); }
  }
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <main className="login-layout">
      <section className="login-intro"><Link className="brand brand-light" to="/login"><span className="brand-mark">S</span> stockroom</Link><div><p className="eyebrow">A FRESH START</p><h1>Make room<br />to grow.</h1><p className="login-copy">One simple place to keep your stock and team in sync.</p></div><p className="intro-foot">Your business, beautifully organized.</p></section>
      <section className="login-form-wrap"><form className="login-form card" onSubmit={submit}><p className="eyebrow">FIRST THINGS FIRST</p><h2>Create your store</h2><p className="muted">Set up your business and administrator account.</p>
        <label className="field"><span>Business name</span><input required maxLength={120} value={form.businessName} onChange={update("businessName")} /></label>
        <label className="field"><span>Your name</span><input required maxLength={120} value={form.name} onChange={update("name")} /></label>
        <label className="field"><span>Email address</span><input type="email" required value={form.email} onChange={update("email")} /></label>
        <label className="field"><span>Password <small>At least 10 characters</small></span><input type="password" minLength={10} required value={form.password} onChange={update("password")} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary button-wide" disabled={busy}>{busy ? "Creating…" : <>Create your store <span>→</span></>}</button>
        <p className="login-foot">Already have an account? <Link to="/login">Sign in</Link></p>
      </form></section>
    </main>
  );
}
