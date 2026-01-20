// apps/frontend/erp-portal/src/modules/sales/services/product.service.js

// LƯU Ý QUAN TRỌNG:
// Module Sales (Bán hàng) cần lấy dữ liệu sản phẩm từ kho của Supply Chain.
// Do đó, URL này trỏ về PORT 3002 (Supply Chain Service) chứ không phải 3004.
const API_URL = "http://localhost:3002/products"; 

export const productService = {
  /**
   * Lấy danh sách sản phẩm để hiển thị trong Dropdown chọn hàng
   */
  async getAll() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      
      // Module Sales chỉ quan tâm sản phẩm đang "Hoạt động" để bán
      // Lọc bỏ sản phẩm đã xóa hoặc ngừng kinh doanh
      return data.filter(p => 
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
      const response = await fetch(`${API_URL}/${id}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }
};