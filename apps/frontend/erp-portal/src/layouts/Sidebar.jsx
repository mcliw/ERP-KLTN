import { NavLink } from "react-router-dom";
import { FaBars, FaChevronLeft } from "react-icons/fa";
import { useAuthStore } from "../auth/auth.store";
import { hrmMenu } from "../modules/hrm/menu";

export default function Sidebar({ collapsed, onToggle }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const menus = hrmMenu.filter((m) =>
    m.roles.includes(user.role)
  );

  return (
    <aside
      style={{
        ...styles.sidebar,
      }}
    >
      {/* HEADER */}
      <div style={styles.header}>
        {!collapsed && <h3 style={styles.logo}>ERP</h3>}
        <button style={styles.toggleBtn} onClick={onToggle}>
          {collapsed ? <FaBars /> : <FaChevronLeft />}
        </button>
      </div>

      {/* MENU */}
      <nav>
        {menus.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              ...styles.link,
              justifyContent: collapsed ? "center" : "flex-start",
              background: isActive ? "#0b3c9d" : "transparent",
            })}
          >
            {item.icon || "•"}
            {!collapsed && <span style={{ marginLeft: 10 }}>{item.label}</span>}
          </NavLink>
        ))}
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
    marginBottom: 20,
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
  link: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 8,
    color: "#fff",
    textDecoration: "none",
    marginBottom: 6,
    transition: "background 0.2s",
  },
};
