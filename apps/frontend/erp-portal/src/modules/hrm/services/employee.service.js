// src/modules/hrm/services/employee.service.js
import { axiosClient } from "../../../services/axiosClient";

export const employeeService = {
  /**
   * Lấy danh sách nhân viên
   * Backend API: GET /hrm/employees
   */
  getAll: async (params) => {
    try {
      // Gọi API thực tế. axiosClient thường đã config baseURL (ví dụ /api/v1 hoặc /hrm)
      const response = await axiosClient.get("/hrm/employees", { params });
      
      // Nếu Backend trả về List trực tiếp (như code Controller ở trên)
      return {
        data: response.data, // Mảng nhân viên
        // Nếu sau này làm phân trang server-side, cần trả về thêm total, page, etc.
        // Hiện tại giả lập pagination client-side hoặc backend trả full list
        total: response.data.length 
      };
    } catch (error) {
      console.error("Failed to fetch employees", error);
      throw error;
    }
  },

  getById: async (id) => {
    const response = await axiosClient.get(`/hrm/employees/${id}`);
    return response.data;
  },

  create: async (data) => {
    // Gọi POST /employees với dữ liệu từ form
    // Backend mong đợi: code, name, department (string code), position (string code)...
    // Form đã xử lý đúng định dạng này nên chỉ cần gửi trực tiếp.
    const response = await axiosClient.post("/hrm/employees", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await axiosClient.put(`/hrm/employees/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await axiosClient.delete(`/hrm/employees/${id}`);
    return response.data;
  }
};