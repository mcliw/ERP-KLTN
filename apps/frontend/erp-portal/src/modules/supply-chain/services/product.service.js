import { axiosClient } from "../../../services/axiosClient";
import { productCategoryService } from "./productCategory.service";

const API_URL = "/supply-chain/products";

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

const isSoftDeleted = (d) => !!(d && String(d).trim() !== "");

export const productService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);
      const sorted = (data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return includeDeleted ? sorted : sorted.filter(p => !isSoftDeleted(p.deletedAt));
    } catch (err) {
      console.error("Fetch products failed", err);
      return [];
    }
  },

  async getById(id) {
    try {
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch {
      return null;
    }
  },

  async generateSku(categoryId, brand) {
    if (!categoryId) return "";
    
    const category = await productCategoryService.getById(categoryId);
    const catPrefix = category ? category.name.substring(0, 3).toUpperCase() : "CAT";
    const brandPrefix = brand ? brand.substring(0, 3).toUpperCase() : "GEN";
    const randomNum = Math.floor(1000 + Math.random() * 9000); 

    return `${catPrefix}-${brandPrefix}-${randomNum}`;
  },

  async create(data) {
    let sku = data.code;
    if (!sku) {
        sku = await this.generateSku(data.categoryId, data.brand);
    }

    const newProduct = {
      ...data,
      code: sku,
      id: "prod_" + Date.now(), 
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newProduct);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error("Không tìm thấy sản phẩm");

    const updated = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updated);
  },

  async remove(id) {
    const current = await this.getById(id);
    const now = new Date().toISOString();
    const softDelete = { ...current, deletedAt: now, status: STATUS.INACTIVE, updatedAt: now };
    
    return await axiosClient.put(`${API_URL}/${id}`, softDelete);
  },

  async restore(id) {
    const current = await this.getById(id);
    const restore = { ...current, deletedAt: null, status: STATUS.ACTIVE, updatedAt: new Date().toISOString() };
    
    return await axiosClient.put(`${API_URL}/${id}`, restore);
  },

  async destroy(id) {
    return await axiosClient.delete(`${API_URL}/${id}`);
  }
};