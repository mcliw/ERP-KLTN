// src/auth/auth.service.js
// LƯU Ý: Hãy kiểm tra lại đường dẫn import axiosClient cho đúng với cấu trúc thư mục của bạn.
// Nếu file này nằm ở src/auth/ thì đường dẫn thường là "../services/axiosClient" hoặc "../../services/axiosClient"
import { axiosClient } from "../services/axiosClient"; 
import { jwtDecode } from "jwt-decode";

/* ==============================================
 * GraphQL Mutations
 * ============================================== */

const LOGIN_MUTATION = `
  mutation login($input: LoginRequest!) {
    login(input: $input) {
      accessToken
      tokenType
    }
  }
`;

const REGISTER_MUTATION = `
  mutation register($input: RegisterRequest!) {
    register(input: $input) {
      id
      email
    }
  }
`;

/* ==============================================
 * Auth Functions (Named Exports)
 * ============================================== */

/**
 * Gọi API Login
 */
export const loginApi = async ({ email, password }) => {
  try {
    // Gọi API qua axiosClient (đã cấu hình interceptor trả về response.data)
    const response = await axiosClient.post("/identity/graphql", {
      query: LOGIN_MUTATION,
      variables: {
        input: {
          email: email,
          password: password,
        },
      },
    });

    // Kiểm tra lỗi từ GraphQL
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    // Lấy data từ response.data.login (do axiosClient đã bóc 1 lớp data)
    const loginData = response.data?.login;

    if (!loginData) {
      throw new Error("Không nhận được phản hồi từ server");
    }

    // Lưu token
    localStorage.setItem("erp_token", loginData.accessToken);

    // Decode token để lấy thông tin user
    const decoded = jwtDecode(loginData.accessToken);

    return {
      ...loginData,
      user: decoded,
    };
  } catch (error) {
    console.error("Login Error:", error);
    throw error.response?.errors?.[0]?.message || error.message || "Lỗi đăng nhập";
  }
};

/**
 * Gọi API Register
 */
export const registerApi = async (data) => {
  try {
    const response = await axiosClient.post("/identity/graphql", {
      query: REGISTER_MUTATION,
      variables: {
        input: {
          id: data.userId,
          email: data.email,
          password: data.password,
          roleName: data.role,
          accountType: "INTERNAL"
        },
      },
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return response.data?.register;
  } catch (error) {
    throw error.response?.errors?.[0]?.message || error.message || "Lỗi đăng ký";
  }
};

/**
 * Reset Password (Giả lập)
 */
export const resetPasswordApi = async ({ email, password }) => {
  // Giả lập delay
  await new Promise((r) => setTimeout(r, 500));
  console.log(`Reset password for ${email}`);
  return true;
};

/**
 * Logout
 */
export const logout = () => {
  localStorage.removeItem("erp_token");
  window.location.href = "/login";
};

/* ==============================================
 * Default Export (Object)
 * ============================================== */
// Export thêm dạng object để tương thích nếu nơi khác import { authService }
export const authService = {
  loginApi,
  registerApi,
  resetPasswordApi,
  logout
};