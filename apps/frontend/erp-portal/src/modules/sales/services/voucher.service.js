// apps/frontend/erp-portal/src/modules/sales/services/voucher.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "/sales/vouchers";
const API_URL_DETAILS = "/sales/voucher_details";
const API_URL_CONSTRAINTS = "/sales/voucher_constraints";

const STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE"
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy voucher",
  EXISTS: "ID voucher đã tồn tại",
  CODE_EXISTS: "Mã giảm giá (Code) đã tồn tại trong hệ thống",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");
const mapStatusToBoolean = (status) => status === STATUS.ACTIVE;
const mapBooleanToStatus = (bool) => (bool ? STATUS.ACTIVE : STATUS.INACTIVE);

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, currentId = null) {
    // 1) Check Duplicate Code
    if (data.code) {
      try {
        // axiosClient trả về data trực tiếp
        const result = await axiosClient.get(API_URL_DETAILS, {
          params: { code: data.code }
        });

        if (Array.isArray(result) && result.length > 0) {
          const existingItem = result[0];
          // Nếu đang tạo mới hoặc update mà ID voucher cha khác nhau
          if (!currentId || existingItem.voucher_id !== currentId) { 
             throw new Error(ERROR_MSGS.CODE_EXISTS);
          }
        }
      } catch (e) {
        if (e.message === ERROR_MSGS.CODE_EXISTS) throw e;
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const voucherService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      // Sử dụng params serializer của axios hoặc truyền object params
      const data = await axiosClient.get(API_URL, {
        params: {
          _embed: ["voucher_constraints", "voucher_details"]
        }
      });

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        if (ta === 0 && tb === 0) return Number(b.id) - Number(a.id);
        return tb - ta;
      });

      const mappedData = sortedData.map(item => ({
        ...item,
        status: mapBooleanToStatus(item.is_active)
      }));

      return includeDeleted
        ? mappedData
        : mappedData.filter((item) => !isSoftDeleted(item?.deleted_at));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const data = await axiosClient.get(`${API_URL}/${id}`, {
        params: {
          _embed: ["voucher_constraints", "voucher_details"]
        }
      });

      if (data) {
        return {
          ...data,
          status: mapBooleanToStatus(data.is_active)
        };
      }
      return null;
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
    // 1. Validate Business Rules
    const inputCode = data.voucher_details?.[0]?.code;
    if (inputCode) {
        await validators.checkBusinessRules({ code: inputCode });
    }

    const voucherPayload = {
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      is_active: data.is_active,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };

    // Tạo Voucher cha
    const newVoucher = await axiosClient.post(API_URL, voucherPayload);

    if (!newVoucher || !newVoucher.id) {
      throw new Error("Không thể tạo Voucher");
    }

    try {
      // 2. Tạo Detail
      if (data.voucher_details && data.voucher_details.length > 0) {
        const detailPayload = {
          ...data.voucher_details[0],
          voucherId: newVoucher.id, // json-server relation convention
          is_active: true
        };
        await axiosClient.post(API_URL_DETAILS, detailPayload);
      }

      // 3. Tạo Constraint
      if (data.voucher_constraints && data.voucher_constraints.length > 0) {
        const constraintPayload = {
          ...data.voucher_constraints[0],
          voucherId: newVoucher.id,
        };
        await axiosClient.post(API_URL_CONSTRAINTS, constraintPayload);
      }

      return newVoucher;

    } catch (error) {
      console.error("Lỗi tạo dữ liệu con", error);
      // Rollback nếu lỗi (tùy chọn)
      await this.destroy(newVoucher.id); 
      throw error;
    }
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updatedVoucher = {
      ...current,
      ...data,
      is_active: data.status ? mapStatusToBoolean(data.status) : current.is_active,
      updated_at: new Date().toISOString(),
    };

    delete updatedVoucher.voucher_constraints;
    delete updatedVoucher.voucher_details;
    delete updatedVoucher.status;

    return await axiosClient.put(`${API_URL}/${id}`, updatedVoucher);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    
    const softDeleteData = {
      ...current,
      is_active: false,
      deleted_at: now,
      updated_at: now,
    };
    
    delete softDeleteData.voucher_constraints;
    delete softDeleteData.voucher_details;
    delete softDeleteData.status;

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      is_active: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    delete restoreData.voucher_constraints;
    delete restoreData.voucher_details;
    delete restoreData.status;

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    try {
      // Check exists trước khi xóa
      await this.getById(id);
      return await axiosClient.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw new Error(ERROR_MSGS.NOT_FOUND);
    }
  },
};