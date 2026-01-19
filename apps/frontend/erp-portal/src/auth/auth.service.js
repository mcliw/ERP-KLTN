import { axiosClient } from "../services/axiosClient";
import { jwtDecode } from "jwt-decode"; // Thư viện giải mã token

// 1. Định nghĩa Query GraphQL cho Login
const LOGIN_MUTATION = `
  mutation login($input: LoginRequest!) {
    login(input: $input) {
      accessToken
      tokenType
    }
  }
`;

// 2. Định nghĩa Query GraphQL cho Register
const REGISTER_MUTATION = `
  mutation register($input: RegisterRequest!) {
    register(input: $input) {
      id
      email
    }
  }
`;

export const authService = {
  /**
   * Gọi API Login tới Identity Service qua Gateway
   * @param {string} email
   * @param {string} password
   */
  async loginApi({ email, password }) {
    try {
      // Gửi POST request đến Gateway
      // URL này được Nginx chuyển -> Gateway -> Identity Service
      const response = await axiosClient.post("/identity/graphql", {
        query: LOGIN_MUTATION,
        variables: {
          input: {
            email: email,
            password: password,
          },
        },
      });

      // Kiểm tra lỗi từ GraphQL trả về (nếu có)
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      // Lấy token từ cấu trúc JSON trả về
      const token = response.data.data.login.accessToken;
      const tokenType = response.data.data.login.tokenType;

      // GIẢI MÃ TOKEN: Lấy thông tin user (role, permission) từ token
      // Frontend không cần gọi API getProfile nữa, giúp tối ưu hiệu năng
      const decoded = jwtDecode(token);

      return {
        token: token,
        user: {
          id: decoded.sub,
          email: decoded.email || email,
          role: decoded.role,               // Quan trọng: dùng để phân quyền Menu
          permissions: decoded.permissions || [], // Quan trọng: dùng để ẩn/hiện nút bấm
          accountType: decoded.account_type, // INTERNAL hoặc EXTERNAL
          iat: decoded.iat,
          exp: decoded.exp,
        },
      };

    } catch (error) {
      console.error("Login Error:", error);
      // Ưu tiên lấy message lỗi từ Backend trả về
      throw error.response?.data?.errors?.[0]?.message || error.message || "Lỗi đăng nhập";
    }
  },

  /**
   * Gọi API Register
   */
  async registerApi(data) {
    try {
      const response = await axiosClient.post("/identity/graphql", {
        query: REGISTER_MUTATION,
        variables: {
          input: {
            id: data.userId, // Mapping ID từ HRM accountId
            email: data.email,
            password: data.password,
            roleName: data.role,
            accountType: "INTERNAL"
          },
        },
      });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }
      return response.data.data.register;
    } catch (error) {
       throw error.response?.data?.errors?.[0]?.message || error.message;
    }
  },

  /**
   * Reset Password (Cần cập nhật logic API thật sau này)
   */
  async resetPasswordApi({ email, password }) {
    // Hiện tại giả lập delay, sau này thay bằng GraphQL Mutation
    await new Promise((r) => setTimeout(r, 500));
    console.log(`Reset password for ${email} with new pass: ${password}`);
    return true;
  }
};

// Export các hàm lẻ để giữ tương thích với code cũ (nếu có chỗ nào đang import { loginApi })
export const loginApi = authService.loginApi;
export const registerApi = authService.registerApi;
export const resetPasswordApi = authService.resetPasswordApi;