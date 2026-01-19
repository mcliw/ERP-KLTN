import { productCategoryService } from "./productCategory.service";

// Lưu ý: Port 3002 (nhớ chạy json-server --port 3002)
const API_URL = "http://localhost:3002/products"; 

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

const isSoftDeleted = (d) => !!(d && String(d).trim() !== "");

export const productService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);
      // Sắp xếp mới nhất lên đầu
      const sorted = (data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return includeDeleted ? sorted : sorted.filter(p => !isSoftDeleted(p.deletedAt));
    } catch (err) {
      console.error("Fetch products failed", err);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      return await handleResponse(response);
    } catch {
      return null;
    }
  },

  // Hàm sinh mã SKU tự động: [Mã Loại]-[Thương Hiệu]-[Số ngẫu nhiên]
  async generateSku(categoryId, brand) {
    if (!categoryId) return "";
    
    // Lấy thông tin danh mục để lấy prefix
    const category = await productCategoryService.getById(categoryId);
    // Lấy 3 ký tự đầu của tên danh mục, nếu không có thì mặc định CAT
    const catPrefix = category ? category.name.substring(0, 3).toUpperCase() : "CAT";
    // Lấy 3 ký tự đầu thương hiệu
    const brandPrefix = brand ? brand.substring(0, 3).toUpperCase() : "GEN";
    // Random 4 số
    const randomNum = Math.floor(1000 + Math.random() * 9000); 

    return `${catPrefix}-${brandPrefix}-${randomNum}`; // Ví dụ: LAP-DEL-1234
  },

  async create(data) {
    // Nếu chưa có SKU thì tự sinh
    let sku = data.code;
    if (!sku) {
        sku = await this.generateSku(data.categoryId, data.brand);
    }

    const newProduct = {
      ...data,
      code: sku,
      // Json-server cần ID chuỗi
      id: "prod_" + Date.now(), 
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });
    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error("Không tìm thấy sản phẩm");

    const updated = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    const now = new Date().toISOString();
    const softDelete = { ...current, deletedAt: now, status: STATUS.INACTIVE, updatedAt: now };
    
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDelete),
    });
    return handleResponse(response);
  },

  async restore(id) {
    const current = await this.getById(id);
    const restore = { ...current, deletedAt: null, status: STATUS.ACTIVE, updatedAt: new Date().toISOString() };
    
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restore),
    });
    return handleResponse(response);
  },

  async destroy(id) {
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    return handleResponse(response);
  }
};