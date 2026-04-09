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
import { supplychainMenu } from "../modules/supply-chain/menu";
import { financeMenu } from "../modules/fa/menu";
import { salesMenu } from "../modules/sales/menu";
import { ROLES } from "../shared/constants/roles";

// [TIP] Đảm bảo bạn đã import file css chứa .custom-scrollbar ở main.jsx hoặc App.js

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const combinedMenu = [...(hrmMenu || []), ...(supplychainMenu || []), ...(financeMenu || []), ...(salesMenu || [])];

  const menus = combinedMenu.filter((item) => {
    if (!item.roles) return true;
    if (user.role === ROLES.ADMIN) return true;
    if (Array.isArray(item.roles)) {
      return item.roles.includes(user.role);
    }
    return item.roles === user.role;
  });

  const handleLogout = () => {
    const ok = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
    if (!ok) return;
    logout?.();
    navigate("/login");
  };

  return (
    <aside style={styles.sidebar}>
      {/* HEADER */}
      <div style={styles.header}>
        {!collapsed && <h3 style={styles.logo}>ERP</h3>}
        <button style={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? <FaBars /> : <FaChevronLeft />}
        </button>
      </div>

      {/* USER INFO */}
      <div
        style={{
          ...styles.userBox,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div style={styles.avatar}>
          <FaUserCircle />
        </div>
        {!collapsed && (
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user.name || "Admin"}</div>
            <div style={styles.userRole}>{user.role}</div>
          </div>
        )}
      </div>

      {/* MENU LIST */}
      <nav style={styles.nav}>
        {/* [UPDATE] Thêm className custom-scrollbar */}
        <div style={styles.menuList} className="custom-scrollbar">
          {menus.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.link,
                justifyContent: collapsed ? "center" : "flex-start",
                background: isActive ? "#0b3c9d" : "transparent",
              })}
              title={collapsed ? item.label : ""} // Tooltip khi thu gọn
            >
              {item.icon}
              {!collapsed && (
                <span style={{ marginLeft: 10 }}>{item.label}</span>
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
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <FaSignOutAlt />
          {!collapsed && <span style={{ marginLeft: 10 }}>Đăng xuất</span>}
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
    // [UPDATE] Phải dùng height cố định thì bên trong mới scroll được
    height: "100vh", 
    position: "fixed",
    left: 0,
    top: 0,
    zIndex: 1000,
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s ease", // Hiệu ứng mượt khi đóng mở
    boxSizing: "border-box", // Quan trọng để padding không làm vỡ layout
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexShrink: 0, // Không cho header bị co lại
  },
  logo: { margin: 0, fontSize: 18, whiteSpace: "nowrap" },
  toggleBtn: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 8px",
    marginBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    flexShrink: 0, // Không cho user info bị co lại
  },
  avatar: { fontSize: 24, color: "#93c5fd" },
  userInfo: { overflow: "hidden" },
  userName: { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  userRole: { fontSize: 11, color: "#94a3b8" },
  
  nav: {
    display: "flex",
    flexDirection: "column",
    flex: 1, // Chiếm toàn bộ không gian còn lại
    overflow: "hidden", // Ẩn phần thừa của container cha
    minHeight: 0, // Fix lỗi flexbox trên Firefox
  },
  menuList: {
    flex: 1, // Chiếm hết chiều cao của nav
    // overflowY được xử lý bởi class .custom-scrollbar
    paddingRight: 5, // Tránh nội dung dính sát thanh cuộn
  },
  link: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 8,
    color: "#fff",
    textDecoration: "none",
    marginBottom: 4,
    transition: "background 0.2s",
    border: "none",
    width: "100%",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    flexShrink: 0, // Menu item không bị bóp méo
    whiteSpace: "nowrap", // Tránh xuống dòng khi menu hẹp
  },
  logoutBtn: {
    marginTop: 10,
    borderTop: "1px solid rgba(255,255,255,0.1)",
    paddingTop: 14,
    flexShrink: 0, // Nút logout luôn giữ nguyên kích thước
  },
};