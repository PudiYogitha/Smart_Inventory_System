import { BarChart3, Boxes, ChartNoAxesCombined, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

const links = [
  ["/", LayoutDashboard, "Overview"],
  ["/products", Boxes, "Products"],
  ["/sales", ChartNoAxesCombined, "Sales"],
  ["/stock-movements", ClipboardList, "Stock movements"],
  ["/reports", BarChart3, "Reports"]
];

export default function SidebarLinks({ onNavigate }) {
  const { user } = useAuth();
  const visible = user?.role === "admin" ? [...links, ["/staff", Users, "Team"]] : links;
  return <>{visible.map(([path, Icon, label]) => (
    <NavLink key={path} to={path} end={path === "/"} onClick={onNavigate} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
      <Icon className="nav-icon" size={17} />{label}
    </NavLink>
  ))}</>;
}
