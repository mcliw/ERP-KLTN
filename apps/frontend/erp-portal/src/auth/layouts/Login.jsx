// src/auth/layouts/Login.jsx

import "../styles/login.css";
import { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../auth.store";
import { redirectByRole } from "../../routes/roleRedirect";

// [MỚI] Import AccountForm
import AccountForm from "../../modules/hrm/components/layouts/AccountForm";

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();

  // 1. State form đăng nhập
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // [MỚI] State để chuyển đổi giữa màn hình Login và Register
  const [isRegistering, setIsRegistering] = useState(false);

  // Xử lý đăng nhập
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login({ email, password });
      redirectByRole(navigate, user.role);
    } catch (_) {
      // Lỗi đã được xử lý trong store
    }
  };

  // [MỚI] Xử lý khi submit form tạo tài khoản
  const handleRegisterSubmit = async (formData) => {
    console.log("Dữ liệu đăng ký:", formData);
    // TODO: Gọi API đăng ký (Register Service) ở đây
    alert("Đăng ký thành công! (Mô phỏng)");
    setIsRegistering(false); // Quay lại màn hình đăng nhập
  };

  return (
    <div className="login-container">
      {/* LEFT - Banner giới thiệu */}
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

      {/* RIGHT - Khu vực Form */}
      <div className="login-right">
        {/* [MỚI] Kiểm tra trạng thái để hiển thị Form phù hợp */}
        {isRegistering ? (
          // --- MÀN HÌNH TẠO TÀI KHOẢN ---
          <div className="register-wrapper" style={{ width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <AccountForm
              mode="create"
              // Truyền danh sách quyền (Role) phù hợp cho việc đăng ký mới
              roleOptions={[
                { value: "EMPLOYEE", label: "Nhân viên" },
                { value: "USER", label: "Người dùng" }
              ]}
              onSubmit={handleRegisterSubmit}
              onCancel={() => setIsRegistering(false)} // Nút Hủy sẽ quay lại Login
            />
          </div>
        ) : (
          // --- MÀN HÌNH ĐĂNG NHẬP (Cũ) ---
          <>
            <h2>ĐĂNG NHẬP</h2>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <span className="icon"><FaUser /></span>
                <input
                  type="text"
                  placeholder="Email doanh nghiệp (VD: abc@ldg.company)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <span
                  className="forgot-password"
                  onClick={() => navigate("/doi-mat-khau")}
                >
                  Quên mật khẩu?
                </span>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button className="login-btn" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>

              {/* [MỚI] Nút chuyển sang trang tạo tài khoản */}
              <div style={{ marginTop: "15px", textAlign: "center" }}>
                <span style={{ color: "#666" }}>Chưa có tài khoản? </span>
                <span
                  style={{
                    color: "var(--primary-color)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                  onClick={() => setIsRegistering(true)}
                >
                  Tạo tài khoản mới
                </span>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}