import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";
import Loader from "./Loader.jsx";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
