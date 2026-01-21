// apps/frontend/erp-portal/src/modules/sales/services/product.service.js

import { axiosClient } from "../../../services/axiosClient";

// LƯU Ý QUAN TRỌNG:
// Module Sales (Bán hàng) cần lấy dữ liệu sản phẩm từ kho của Supply Chain.
// Do đó, URL này trỏ về PORT 3002 (Supply Chain Service) chứ không phải 3004.
// Axios sẽ tự động nhận diện đây là absolute URL và không ghép với baseURL "/api".
const API_URL = "/supply-chain/products"; 

export const productService = {
  /**
   * Lấy danh sách sản phẩm để hiển thị trong Dropdown chọn hàng
   */
  async getAll() {
    try {
      // axiosClient.get(API_URL) sẽ trả về data trực tiếp nhờ interceptor
      const data = await axiosClient.get(API_URL);
      
      // Module Sales chỉ quan tâm sản phẩm đang "Hoạt động" để bán
      // Lọc bỏ sản phẩm đã xóa hoặc ngừng kinh doanh
      return (Array.isArray(data) ? data : []).filter(p => 
        p.status === "Hoạt động" && !p.deletedAt
      );
    } catch (error) {
      console.error("Sales Product Service Error:", error);
      return [];
    }
  },

  /**
   * Lấy chi tiết 1 sản phẩm (Dùng để hiển thị tên trong OrderDetail)
   */
  async getById(id) {
    try {
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch (error) {
      // console.error("Get Product Detail Failed:", error);
      return null;
    }
  }
};