import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import SidebarLinks from "./SidebarLinks.jsx";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  return (
    <header className="mobile-topbar">
      <Link className="brand" to="/"><span className="brand-mark">S</span> stockroom</Link>
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><Menu size={19} /></button>
      {open && <nav className="mobile-nav"><SidebarLinks onNavigate={() => setOpen(false)} /><button onClick={signOut}>Sign out</button></nav>}
    </header>
  );
}
