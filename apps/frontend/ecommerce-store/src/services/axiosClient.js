import axios from "axios";

// Cấu hình Base URL. 
// Nếu chạy qua Nginx chung domain, bạn chỉ cần để "/api" hoặc để trống nếu proxy root.
// Ví dụ: server API map vào store.local/identity/graphql
export const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://store.local/identity/graphql", // Trỏ thẳng vào Nginx
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Quan trọng nếu dùng Cookie, nhưng với JWT header thì optional
});

// Interceptor: Tự động đính kèm Token nếu đã đăng nhập
axiosClient.interceptors.request.use(
  (config) => {
    // Lấy token từ LocalStorage (được lưu sau khi login thành công)
    const token = typeof window !== "undefined" ? localStorage.getItem("erp_token") : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // LƯU Ý QUAN TRỌNG: Xóa đoạn code gán cứng "DEBUG_TOKEN" cũ đi
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: Xử lý lỗi trả về (ví dụ 401 Unauthorized)
axiosClient.interceptors.response.use(
  (response) => response, // Trả về data gốc của axios để service xử lý tiếp
  (error) => {
    // Nếu token hết hạn (401), có thể logout
    if (error.response && error.response.status === 401) {
        localStorage.removeItem("erp_token");
        // window.location.href = "/login"; // Uncomment nếu muốn redirect
    }
    return Promise.reject(error);
  }
);