import { Navigate } from "react-router-dom";
import { useAuthStore } from "./auth.store";

export default function RequireAuth({ children, allowRoles }) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}