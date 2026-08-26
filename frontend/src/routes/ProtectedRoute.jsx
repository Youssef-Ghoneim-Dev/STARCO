import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const token = localStorage.getItem("token");
  const location = useLocation();
  const { loading, pending, whatsappPending, deleted } = useAuth();

  if (loading) {
    return (
      <div className="route-loading">
        <div className="spinner" role="status"></div>
        <p style={{ direction: "rtl" }}>جاري التحقق من حسابك ...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (deleted) {
    localStorage.removeItem("token");
    return <Navigate to="/login" state={{ accountDeleted: true }} replace />;
  }

  if ((pending || whatsappPending) && !["/dashboard", "/profile"].includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
