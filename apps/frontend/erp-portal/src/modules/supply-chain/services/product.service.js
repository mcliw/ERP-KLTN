// apps/frontend/erp-portal/src/modules/supply-chain/services/product.service.js

// Giả định bạn đã có service này, hoặc có thể dùng fetch trực tiếp bảng categories
import { categoryService } from "./category.service"; 

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/products";

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy sản phẩm",
  SKU_EXISTS: "Mã SKU đã tồn tại trong hệ thống",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu sản phẩm",
  DELETE_FAILED: "Không thể xóa sản phẩm",
  HAS_DEPENDENCIES: "Không thể xóa sản phẩm vì đã phát sinh giao dịch (tồn kho/đơn hàng)",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeSku = (sku) => String(sku || "").trim().toUpperCase();

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichProductData = (product, allCategories) => {
  if (!product) return null;

  // Tìm tên danh mục dựa trên category_id
  const category = (Array.isArray(allCategories) ? allCategories : []).find(
    (c) => Number(c.category_id) === Number(product.category_id)
  );

  return {
    ...product,
    category_name: category ? category.category_name : "—",
    // Nếu API trả về stock nằm ở bảng khác (inventory), logic merge sẽ nằm ở đây
    // current_stock: product.current_stock || 0 
  };
};

/* =========================
 * Main Service
 * ========================= */
export const productService = {
  /**
   * Lấy danh sách sản phẩm
   * @param {Object} params - { enrich: boolean, categoryId: number, type: string }
   */
  async getAll({ enrich = true, categoryId, productType } = {}) {
    try {
      // Build query string nếu cần filter phía server (JSON Server support)
      let url = API_URL;
      const params = [];
      if (categoryId) params.push(`category_id=${categoryId}`);
      if (productType) params.push(`product_type=${productType}`);
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }

      const response = await fetch(url);
      const data = await handleResponse(response);

      // Sort theo mới nhất
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      if (!enrich) return sortedData;

      // Lấy danh mục để map tên
      const categories = await categoryService.getAll().catch(() => []);

      return sortedData.map((prod) => enrichProductData(prod, categories));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  /**
   * Lấy chi tiết theo ID (Primary Key)
   */
  async getById(id, { enrich = true } = {}) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      const data = await handleResponse(response);

      if (!data || !enrich) return data;

      const categories = await categoryService.getAll().catch(() => []);
      return enrichProductData(data, categories);
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết theo SKU (Unique Key)
   * JSON Server: GET /products?sku=XYZ
   */
  async getBySku(sku) {
    try {
      const targetSku = normalizeSku(sku);
      const response = await fetch(`${API_URL}?sku=${encodeURIComponent(targetSku)}`);
      const data = await handleResponse(response);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  /**
   * Kiểm tra SKU có tồn tại chưa (trừ chính nó nếu đang edit)
   */
  async checkSkuExists(sku, excludeId = null) {
    const product = await this.getBySku(sku);
    if (!product) return false;
    
    // Nếu tìm thấy, và ID khác với ID đang sửa -> Trùng
    if (excludeId && String(product.product_id) === String(excludeId)) {
      return false;
    }
    return true;
  },

  /**
   * Tạo mới sản phẩm
   */
  async create(data) {
    const sku = normalizeSku(data?.sku);

    // Validate Business: SKU Unique
    const exists = await this.checkSkuExists(sku);
    if (exists) throw new Error(ERROR_MSGS.SKU_EXISTS);

    // Prepare Payload khớp với SQL Schema
    const newProduct = {
      sku,
      product_name: data.product_name?.trim(),
      category_id: data.category_id ? Number(data.category_id) : null,
      unit_of_measure: data.unit_of_measure,
      product_type: data.product_type,
      min_stock_level: Number(data.min_stock_level || 0),
      brand: data.brand,
      warranty_months: Number(data.warranty_months || 0),
      image_url: data.image_url,
      created_at: new Date().toISOString(),
      // Mặc định các field khác nếu DB không tự sinh
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });

    return handleResponse(response);
  },

  /**
   * Cập nhật thông tin
   * @param {number|string} id - product_id
   * @param {object} data 
   */
  async update(id, data) {
    try {
      // 1. Check tồn tại
      const current = await this.getById(id, { enrich: false });
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      // 2. Validate SKU nếu có thay đổi (Thường thì SKU ít khi đổi)
      if (data.sku) {
        const newSku = normalizeSku(data.sku);
        if (newSku !== normalizeSku(current.sku)) {
          const exists = await this.checkSkuExists(newSku, id);
          if (exists) throw new Error(ERROR_MSGS.SKU_EXISTS);
        }
      }

      // 3. Merge data
      const updatedProduct = {
        ...current,
        ...data,
        // Đảm bảo numeric fields
        category_id: data.category_id ? Number(data.category_id) : current.category_id,
        min_stock_level: data.min_stock_level !== undefined ? Number(data.min_stock_level) : current.min_stock_level,
        warranty_months: data.warranty_months !== undefined ? Number(data.warranty_months) : current.warranty_months,
      };

      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT", // Hoặc PATCH tùy backend
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProduct),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  /**
   * Xóa sản phẩm
   * Dựa theo SQL không có deleted_at -> Hard Delete
   */
  async delete(id) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // TODO: Validate logic kiểm tra tồn kho hoặc đơn hàng trước khi xóa
    // Ví dụ: await inventoryService.checkStock(id) ...
    
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    return handleResponse(response);
  },
};