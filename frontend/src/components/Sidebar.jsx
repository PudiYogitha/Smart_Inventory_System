import { Link, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import Navbar from "./Navbar.jsx";
import SidebarLinks from "./SidebarLinks.jsx";
import useAuth from "../hooks/useAuth.js";

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const title = location.pathname.startsWith("/products") ? "Products"
    : location.pathname === "/sales" ? "Sales"
      : location.pathname === "/reports" ? "Reports"
        : location.pathname === "/staff" ? "Team"
          : location.pathname === "/stock-movements" ? "Stock movements" : "Overview";
  return (
    <>
      <aside className="sidebar">
        <Link className="brand" to="/"><span className="brand-mark">S</span> stockroom</Link>
        <p className="nav-label">WORKSPACE</p>
        <nav className="side-nav"><SidebarLinks /></nav>
        <div className="sidebar-bottom">
          <div className="business-chip"><span className="business-avatar">{user?.businessName?.slice(0, 1) || "S"}</span><div><strong>{user?.businessName}</strong><span>{user?.role === "admin" ? "Administrator" : "Team member"}</span></div></div>
          <button className="nav-link signout-link" onClick={signOut}><LogOut size={17} />Sign out</button>
        </div>
      </aside>
      <Navbar />
      <div className="mobile-page-title">{title}</div>
    </>
  );
}
