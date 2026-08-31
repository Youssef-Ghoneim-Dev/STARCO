import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/projects" replace />;
  return children;
}
