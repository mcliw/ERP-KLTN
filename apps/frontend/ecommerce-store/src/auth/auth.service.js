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
      expiresIn
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
 * Auth Functions
 * ============================================== */

export const loginApi = async ({ email, password }) => {
  try {
    const response = await axiosClient.post("", { // Post vào root baseURL đã cấu hình
      query: LOGIN_MUTATION,
      variables: {
        input: { email, password },
      },
    });

    // Axios trả về { data: { data: { login: ... }, errors: [...] } }
    const responseData = response.data;

    if (responseData.errors) {
      throw new Error(responseData.errors[0].message);
    }

    const loginData = responseData.data?.login;
    if (!loginData) throw new Error("Không có dữ liệu trả về");

    // Lưu token
    localStorage.setItem("erp_token", loginData.accessToken);
    
    // Decode lấy info user
    const user = jwtDecode(loginData.accessToken);

    return { ...loginData, user };
  } catch (error) {
    console.error("Login Error:", error);
    throw new Error(error.message || "Lỗi đăng nhập");
  }
};

export const registerApi = async (data) => {
  try {
    const response = await axiosClient.post("/identity/graphql", {
      query: REGISTER_MUTATION,
      variables: {
        input: {
          // Các trường Identity
          id: data.userId, // Thường là null, để BE tự gen
          email: data.email,
          password: data.password,
          roleName: data.role, // Backend sẽ override nếu là store.local
          
          // Các trường CRM (Bổ sung mới)
          fullName: data.fullName,
          phone: data.phone,
          address: data.address
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

export const logout = () => {
  localStorage.removeItem("erp_token");
  window.location.href = "/login";
};

export const authService = { loginApi, registerApi, logout };