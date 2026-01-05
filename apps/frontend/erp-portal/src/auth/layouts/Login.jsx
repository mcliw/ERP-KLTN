import "../styles/login.css";
import { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../auth.store";
import { redirectByRole } from "../../routes/roleRedirect";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login({ username, password });
      redirectByRole(navigate, user.role);
    } catch (_) {
      // error đã được set trong store
    }
  };

  return (
    <div className="login-container">
      {/* LEFT */}
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

      {/* RIGHT */}
      <div className="login-right">
        <h2>ĐĂNG NHẬP</h2>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <span className="icon"><FaUser /></span>
            <input
              type="text"
              placeholder="Tên tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <span className="icon"><FaLock /></span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="options">
            <label>
              <input type="checkbox" /> Nhớ mật khẩu
            </label>
            <a href="#">Quên mật khẩu?</a>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="login-btn" disabled={loading}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
