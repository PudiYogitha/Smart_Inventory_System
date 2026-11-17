import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import { api } from "../services/api.js";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      signIn(await api("/auth/login", { method: "POST", body: JSON.stringify(values) }));
      navigate("/", { replace: true });
    } catch (exception) { setError(exception.message); }
    finally { setBusy(false); }
  }
  return <main className="login-layout">
    <section className="login-intro">
      <Link className="brand brand-light" to="/login"><span className="brand-mark">S</span> stockroom</Link>
      <div><p className="eyebrow">INVENTORY, MADE SIMPLE</p><h1>Know what’s<br />in store.</h1><p className="login-copy">A calmer way to keep products moving and your shelves ready.</p></div>
      <p className="intro-foot">Built for the people who keep business moving.</p>
    </section>
    <section className="login-form-wrap"><form className="login-form card" onSubmit={submit}>
      <p className="eyebrow">WELCOME BACK</p><h2>Sign in to your store</h2><p className="muted">Enter your details to continue.</p>
      <label className="field"><span>Email address</span><input type="email" autoComplete="username" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} /></label>
      <label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Signing in…" : <>Sign in <span>→</span></>}</button>
      <p className="login-foot">New business? <Link to="/register">Create your store</Link></p>
    </form><p className="login-legal">Your inventory, your business. Securely kept together.</p></section>
  </main>;
}
