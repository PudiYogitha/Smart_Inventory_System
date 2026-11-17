import { BarChart3, Boxes, ChartNoAxesCombined, ClipboardList, LayoutDashboard, LogOut, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

const links = [
  ["/", LayoutDashboard, "Overview"],
  ["/products", Boxes, "Products"],
  ["/sales", ChartNoAxesCombined, "Sales"],
  ["/stock-movements", ClipboardList, "Stock movements"],
  ["/reports", BarChart3, "Reports"]
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const visible = user?.role === "admin" ? [...links, ["/staff", Users, "Team"]] : links;
  return <aside className="sidebar">
    <a className="brand" href="/"><span className="brand-mark">S</span> stockroom</a>
    <p className="nav-label">WORKSPACE</p>
    <nav className="side-nav">{visible.map(([path, Icon, label]) =>
      <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
        <Icon size={17} />{label}
      </NavLink>)}</nav>
    <div className="sidebar-bottom">
      <div className="business-chip"><span className="business-avatar">{user?.businessName?.slice(0, 1) || "S"}</span>
        <div><strong>{user?.businessName}</strong><span>{user?.role === "admin" ? "Administrator" : "Team member"}</span></div>
      </div>
      <button className="nav-link signout-link" onClick={signOut}><LogOut size={17} />Sign out</button>
    </div>
  </aside>;
}
