import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";

export default function MainLayout() {
    const [collapsed, setCollapsed] = useState(
        localStorage.getItem("sidebar_collapsed") === "true"
    );

    const toggle = () => {
    setCollapsed((c) => {
        localStorage.setItem("sidebar_collapsed", !c);
        return !c;
    });
    };

  return (
    <div style={styles.layout}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      <main
        style={{
          ...styles.content,
          marginLeft: collapsed ? 64 : 220,
          flex: 1,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  layout: {
    display: "flex",
    minHeight: "100vh",
  },
};