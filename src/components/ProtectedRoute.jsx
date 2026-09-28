import { Navigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children, allowedRole, redirectPath }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-shell"><p>Loading session...</p></div>;
  }

  if (!isAuthenticated) {
    const fallback = redirectPath || (allowedRole === "provider" ? "/provider/login" : "/customer/login");
    return <Navigate to={fallback} state={{ from: location.pathname }} replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    const fallback = user?.role === "provider" ? "/provider/dashboard" : "/services";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
