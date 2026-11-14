import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import AddProduct from "./pages/AddProduct.jsx";
import EditProduct from "./pages/EditProduct.jsx";
import Sales from "./pages/Sales.jsx";
import StockMovements from "./pages/StockMovements.jsx";
import Reports from "./pages/Reports.jsx";
import Staff from "./pages/Staff.jsx";
import Toast from "./components/Toast.jsx";

function Workspace() {
  return (
    <ProtectedRoute>
      <Sidebar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<AddProduct />} />
        <Route path="/products/:id/edit" element={<EditProduct />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/stock-movements" element={<StockMovements />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/staff" element={<ProtectedRoute adminOnly><Staff /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/*" element={<Workspace />} />
      </Routes>
      <Toast />
    </>
  );
}
