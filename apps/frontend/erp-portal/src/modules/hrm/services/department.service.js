import { axiosClient } from "../../../services/axiosClient";

export const departmentService = {
  // Lấy danh sách (hỗ trợ phân trang từ Server)
  getAll: async (params = {}) => {
    const { page = 1, limit = 10, keyword, status } = params;
    
    const response = await axiosClient.get("/hrm/departments", {
      params: {
        page,
        size: limit,
        keyword,
        status
      }
    });
    
    // Spring Boot trả về Page object. useAsyncData cần { data, total }
    // hoặc trả về content để component tự xử lý.
    return {
      data: response.content || [],
      total: response.totalElements || 0
    };
  },

  getByCode: async (code) => {
    return axiosClient.get(`/hrm/departments/${code}`);
  },

  create: async (data) => {
    return axiosClient.post("/hrm/departments", data);
  },

  update: async (code, data) => {
    return axiosClient.put(`/hrm/departments/${code}`, data);
  },
  
  remove: async (code) => {
    return axiosClient.delete(`/hrm/departments/${code}`);
  }
};