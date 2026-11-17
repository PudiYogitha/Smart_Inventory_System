import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

const links = [["/", "Overview"], ["/products", "Products"], ["/sales", "Sales"], ["/stock-movements", "Stock"], ["/reports", "Reports"]];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const items = user?.role === "admin" ? [...links, ["/staff", "Team"]] : links;
  return <header className="mobile-topbar">
    <Link className="brand" to="/"><span className="brand-mark">S</span> stockroom</Link>
    <button className="mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation"><Menu size={19} /></button>
    {open && <nav className="mobile-nav">
      {items.map(([path, label]) => <NavLink key={path} to={path} end={path === "/"} onClick={() => setOpen(false)}>{label}</NavLink>)}
      <button onClick={signOut}>Sign out</button>
    </nav>}
  </header>;
}
