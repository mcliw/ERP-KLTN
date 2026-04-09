// apps/frontend/erp-portal/src/modules/finance/services/faAccount.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "/accounting/chart_of_accounts"; 

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ kế toán",
  NOT_FOUND: "Không tìm thấy tài khoản",
  CODE_EXISTS: "Số hiệu tài khoản đã tồn tại",
  PARENT_NOT_FOUND: "Tài khoản cha không tồn tại",
  CIRCULAR_DEPENDENCY: "Tài khoản cha không thể là chính nó",
  TYPE_MISMATCH: "Tài khoản con phải cùng loại (Account Type) với tài khoản cha",
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, currentId = null) {
    const parentId = data?.parent_account_id;

    // 1. Circular Dependency Check
    if (parentId && currentId && String(parentId) === String(currentId)) {
      throw new Error(ERROR_MSGS.CIRCULAR_DEPENDENCY);
    }

    // 2. Parent Validation
    if (parentId) {
      try {
        const parentAccount = await axiosClient.get(`${API_URL}/${parentId}`);
        
        if (data.account_type && parentAccount.account_type !== data.account_type) {
          throw new Error(
              `${ERROR_MSGS.TYPE_MISMATCH}. Cha: ${parentAccount.account_type}, Con: ${data.account_type}`
          );
        }
      } catch (error) {
        // Axios throws error on 404
        throw new Error(ERROR_MSGS.PARENT_NOT_FOUND);
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const faAccountService = {
  
  // --- Get List ---
  async getAll({ includeInactive = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        return (a.account_code || "").localeCompare(b.account_code || "");
      });

      return includeInactive 
        ? sortedData 
        : sortedData.filter((item) => item.is_active === true);
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  // --- Get Detail ---
  async getById(id) {
    try {
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  // --- Check Duplicate Code ---
  async checkCodeExists(code, excludeId = null) {
    if (!code) return false;
    try {
      // Axios tự động parse query params nếu truyền object, hoặc dùng string như cũ
      const data = await axiosClient.get(`${API_URL}?account_code=${code}`);
      
      if (Array.isArray(data) && data.length > 0) {
        if (!excludeId) return true;
        return String(data[0].id) !== String(excludeId);
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // --- Create ---
  async create(data) {
    const exists = await this.checkCodeExists(data.account_code);
    if (exists) throw new Error(ERROR_MSGS.CODE_EXISTS);

    await validators.checkBusinessRules(data);

    const newAccount = {
      ...data,
      balance_side: data.balance_side || "DEBIT",
      account_code: data.account_code,
      account_name: data.account_name,
      parent_account_id: data.parent_account_id || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
    };

    return await axiosClient.post(API_URL, newAccount);
  },

  // --- Update ---
  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.account_code && data.account_code !== current.account_code) {
        const exists = await this.checkCodeExists(data.account_code, id);
        if (exists) throw new Error(ERROR_MSGS.CODE_EXISTS);
    }

    const nextData = { ...current, ...data };
    
    if (nextData.parent_account_id !== current.parent_account_id || nextData.account_type !== current.account_type) {
        await validators.checkBusinessRules(nextData, id);
    }

    return await axiosClient.put(`${API_URL}/${id}`, nextData);
  },

  // --- Soft Delete ---
  async remove(id) {
    return await axiosClient.patch(`${API_URL}/${id}`, { is_active: false });
  },

  // --- Restore ---
  async restore(id) {
    const current = await this.getById(id);
    if (current && current.parent_account_id) {
        await validators.checkBusinessRules(current, id);
    }

    return await axiosClient.patch(`${API_URL}/${id}`, { is_active: true });
  },

  // --- Hard Delete ---
  async destroy(id) {
    return await axiosClient.delete(`${API_URL}/${id}`);
  },
};