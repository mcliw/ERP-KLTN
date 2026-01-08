// src/layouts/Sidebar.jsx

import { NavLink, useNavigate } from "react-router-dom";
import {
  FaBars,
  FaChevronLeft,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";
import { useAuthStore } from "../auth/auth.store";
import { hrmMenu } from "../modules/hrm/menu";

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const menus = hrmMenu.filter((m) =>
    m.roles.includes(user.role)
  );

  const handleLogout = () => {
    const ok = window.confirm(
      "Bạn có chắc chắn muốn đăng xuất không?"
    );
    if (!ok) return;

    logout?.();
    navigate("/login");
  };

  return (
    <aside style={styles.sidebar}>
      {/* HEADER */}
      <div style={styles.header}>
        {!collapsed && (
          <h3 style={styles.logo}>ERP</h3>
        )}
        <button
          style={styles.toggleBtn}
          onClick={onToggle}
        >
          {collapsed ? <FaBars /> : <FaChevronLeft />}
        </button>
      </div>

      {/* ===== USER INFO ===== */}
      <div
        style={{
          ...styles.userBox,
          justifyContent: collapsed
            ? "center"
            : "flex-start",
        }}
      >
        <div style={styles.avatar}>
          <FaUserCircle />
        </div>

        {!collapsed && (
          <div style={styles.userInfo}>
            <div style={styles.userName}>
              {user.name || "Người dùng"}
            </div>
            <div style={styles.userEmail}>
              {user.email}
            </div>
            <div style={styles.userRole}>
              {user.role}
            </div>
          </div>
        )}
      </div>

      {/* MENU */}
      <nav style={styles.nav}>
        <div>
          {menus.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.link,
                justifyContent: collapsed
                  ? "center"
                  : "flex-start",
                background: isActive
                  ? "#0b3c9d"
                  : "transparent",
              })}
            >
              {item.icon || "•"}
              {!collapsed && (
                <span style={{ marginLeft: 10 }}>
                  {item.label}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          style={{
            ...styles.link,
            ...styles.logoutBtn,
            justifyContent: collapsed
              ? "center"
              : "flex-start",
          }}
          title="Đăng xuất"
        >
          <FaSignOutAlt />
          {!collapsed && (
            <span style={{ marginLeft: 10 }}>
              Đăng xuất
            </span>
          )}
        </button>
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    background: "#0b1c3d",
    color: "#fff",
    padding: 12,
    minHeight: "100vh",
    transition: "width 0.2s ease",
    position: "fixed",
    left: 0,
    top: 0,
    width: "fit-content",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: {
    margin: 0,
    fontSize: 18,
  },
  toggleBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    padding: 12,
  },

  /* ===== USER ===== */
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 8px",
    marginBottom: 16,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  avatar: {
    fontSize: 28,
    color: "#93c5fd",
  },
  userInfo: {
    overflow: "hidden",
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
  },
  userEmail: {
    fontSize: 12,
    color: "#cbd5e1",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userRole: {
    fontSize: 11,
    color: "#94a3b8",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "calc(100vh - 150px)", // header + user box
  },
  link: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 8,
    color: "#fff",
    textDecoration: "none",
    marginBottom: 6,
    transition: "background 0.2s",
    border: "none",
    cursor: "pointer",
    width: "100%",
    background: "transparent",
    fontSize: 14,
  },
  logoutBtn: {
    marginTop: 12,
    marginBottom: 20,
    background: "transparent",
  },
};