import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth.store";
import "../styles/login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  /* ================= STEP 1 ================= */
  const handleCheckUser = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      alert("Vui lòng nhập tên tài khoản");
      return;
    }

    // ERP nội bộ → không cần gọi API
    setStep(2);
  };

  /* ================= STEP 2 ================= */
  const handleReset = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert("Mật khẩu tối thiểu 6 ký tự");
      return;
    }

    if (password !== confirm) {
      alert("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      await resetPassword({ username, password });
      alert("Đổi mật khẩu thành công");
      navigate("/login");
    } catch (_) {}
  };

  return (
    <div className="login-container">
      <div className="login-right">
        <h2>QUÊN MẬT KHẨU</h2>

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <form onSubmit={handleCheckUser}>
            <div className="input-group">
              <input
                type="text"
                placeholder="Nhập tên tài khoản"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <button className="login-btn">
              Tiếp tục
            </button>

            <p
              className="back-login"
              onClick={() => navigate("/login")}
            >
              ← Quay lại đăng nhập
            </p>
          </form>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <form onSubmit={handleReset}>
            <p>
              Tài khoản: <b>{username}</b>
            </p>

            <div className="input-group">
              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <input
                type="password"
                placeholder="Xác nhận mật khẩu"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <button className="login-btn" disabled={loading}>
              {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>

            <p
              className="back-login"
              onClick={() => navigate("/login")}
            >
              ← Quay lại đăng nhập
            </p>
          </form>
        )}
      </div>
      <div className="login-left">
        <h1>CHÀO MỪNG ĐẾN</h1>
        <h2>LDG TECH</h2>

        <p className="slogan">Sáng tạo đổi mới giá trị</p>

        <p className="subtitle">TỰ ĐỘNG - TIỆN ÍCH - MINH BẠCH</p>

        <p className="desc">
          Hệ thống ERP - Quản lý doanh nghiệp <br />
          tích hợp AI Chatbot
        </p>
      </div>
    </div>
  );
}
