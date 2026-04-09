// apps/frontend/erp-portal/src/modules/sales/services/customer.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
// Sử dụng path tương đối, axiosClient sẽ tự ghép với baseURL
const API_URL = "/sales/customers";

const STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy khách hàng",
  EXISTS: "ID khách hàng đã tồn tại",
  CODE_EXISTS: "Mã khách hàng (Code) đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, currentId = null) {
    // 1) Check Duplicate Code
    if (data.code) {
      try {
        // axiosClient trả về data trực tiếp (là mảng kết quả)
        const result = await axiosClient.get(API_URL, {
          params: { code: data.code }
        });

        if (Array.isArray(result) && result.length > 0) {
          const existingItem = result[0];
          if (!currentId || existingItem.id !== currentId) {
            throw new Error(ERROR_MSGS.CODE_EXISTS);
          }
        }
      } catch (e) {
        if (e.message === ERROR_MSGS.CODE_EXISTS) throw e;
        // Các lỗi mạng khác có thể bỏ qua hoặc log tùy nhu cầu
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const customerService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || a?.updated_at || 0).getTime();
        const tb = new Date(b?.created_at || b?.updated_at || 0).getTime();
        return tb - ta;
      });

      return includeDeleted
        ? sortedData
        : sortedData.filter((item) => !isSoftDeleted(item?.deleted_at));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async checkIdExists(id) {
    try {
      await axiosClient.get(`${API_URL}/${id}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  async create(data) {
    // 1. Check ID trùng
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    // 2. Validate Business Rules
    await validators.checkBusinessRules(data);

    const newCustomer = {
      ...data,
      status: data.status || STATUS.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };

    return await axiosClient.post(API_URL, newCustomer);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.code && data.code !== current.code) {
      await validators.checkBusinessRules(data, id);
    }

    const updatedCustomer = {
      ...current,
      ...data,
      status: data.status || current.status,
      updated_at: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedCustomer);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deleted_at: now,
      status: STATUS.INACTIVE,
      updated_at: now,
    };

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    await validators.checkBusinessRules({ code: current.code }, id);

    const restoreData = {
      ...current,
      deleted_at: null,
      status: STATUS.ACTIVE,
      updated_at: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    try {
      await this.getById(id); // Check exists
      return await axiosClient.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw new Error(ERROR_MSGS.NOT_FOUND);
    }
  },
};