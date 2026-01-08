// src/auth/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./auth.store";

function NoPermission() {
  return (
    <div style={{ padding: 32 }}>
      <h2>🚫 Không có quyền truy cập</h2>
      <p>Bạn không có quyền sử dụng chức năng này.</p>
    </div>
  );
}

export default function RequireAuth({ children, allowRoles }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // Chưa đăng nhập
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Sai quyền
  if (allowRoles && !allowRoles.includes(user.role)) {
    return <NoPermission />;
  }

  return children;
}