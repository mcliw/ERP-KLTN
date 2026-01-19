// apps/frontend/erp-portal/src/services/axiosClient.js
import axios from "axios";

// CẤU HÌNH QUAN TRỌNG:
// Sử dụng đường dẫn tương đối "/api".
// Trình duyệt sẽ tự động hiểu là: https://ldgcompany.local/api
// Điều này giải quyết được 2 vấn đề:
// 1. Lỗi Mixed Content (vì cùng giao thức HTTPS với trang web)
// 2. Routing qua Gateway (Nginx forward /api/ -> Gateway -> Service)
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interceptor Request: Tự động gắn Token ---
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("erp_token");

    // Login path là "/identity/graphql" => Full URL sẽ là https://.../api/identity/graphql
    // Gateway sẽ nhận được, cắt "/api" và chuyển "/identity/graphql" tới Identity Service. Đúng luồng.
    const isIdentityRequest = config.url && config.url.includes("/identity/graphql");

    if (token && !isIdentityRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Interceptor Response: Xử lý dữ liệu trả về ---
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về data trực tiếp để tương thích với các file service đã sửa (employee, department...)
    // Ví dụ: Backend trả về { data: [...] } thì ở đây lấy luôn
    return response.data;
  },
  (error) => {
    // Xử lý các lỗi chung (ví dụ 401 Unauthorized)
    if (error.response) {
       if (error.response.status === 401) {
           console.error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
           // Có thể bỏ comment dòng dưới để auto logout
           // localStorage.removeItem("erp_token");
           // window.location.href = "/login"; 
       }
       // Ném lỗi ra để component hiển thị thông báo
       return Promise.reject(error.response.data || error);
    }
    return Promise.reject(error);
  }
);