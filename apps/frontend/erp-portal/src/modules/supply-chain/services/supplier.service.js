// apps/frontend/erp-portal/src/modules/supply-chain/services/supplier.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "/supply-chain/suppliers";

const STATUS = {
  ACTIVE: "Đang hợp tác",
  STOPPED: "Dừng hợp tác",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy nhà cung cấp",
  EXISTS: "Mã nhà cung cấp đã tồn tại",
  TAX_CODE_EXISTS: "Mã số thuế này đã được đăng ký cho nhà cung cấp khác",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CONTRACT_REQUIRED: "Nhà cung cấp đang hợp tác bắt buộc phải có Hợp đồng",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeCode = (code) => String(code || "").trim().toUpperCase();
const normalizeTaxCode = (taxCode) => String(taxCode || "").trim();

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const sanitizeSupplierData = (data) => {
  const { contractFile, licenseFile, ...rest } = data;
  return rest;
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, ignoreId = null) {
    const taxCode = normalizeTaxCode(data?.taxCode);

    // 0) Enforce contract for ACTIVE status
    const nextStatus = data?.status;
    if (nextStatus === STATUS.ACTIVE && !data?.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // 1) Unique Tax Code check
    if (taxCode) {
      // Dùng axios lấy danh sách theo taxCode
      const suppliersWithTax = await axiosClient.get(`${API_URL}?taxCode=${encodeURIComponent(taxCode)}`);
      
      const filteredSuppliers = suppliersWithTax
        .filter((s) => !isSoftDeleted(s?.deletedAt))
        .filter((s) => (ignoreId ? s.id !== ignoreId : true));

      if (filteredSuppliers.length > 0) {
        throw new Error(ERROR_MSGS.TAX_CODE_EXISTS);
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const supplierService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return tb - ta;
      });

      return includeDeleted ? sortedData : sortedData.filter((s) => !isSoftDeleted(s?.deletedAt));
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

  async getByCode(code) {
    try {
      const targetCode = normalizeCode(code);
      const data = await axiosClient.get(`${API_URL}?code=${targetCode}`);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  async checkCodeExists(code) {
    const supplier = await this.getByCode(code);
    return !!supplier;
  },

  async create(data) {
    const code = normalizeCode(data?.code);

    const exists = await this.checkCodeExists(code);
    if (exists) throw new Error(ERROR_MSGS.EXISTS);

    const createStatus = data.status || STATUS.ACTIVE;
    if (createStatus === STATUS.ACTIVE && !data?.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    await validators.checkBusinessRules({ ...data, status: createStatus });

    const cleanData = sanitizeSupplierData(data);

    const newSupplier = {
      ...cleanData,
      code,
      status: createStatus,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
      stoppedAt: null,
    };

    return await axiosClient.post(API_URL, newSupplier);
  },

  async update(code, data) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const nextStatus = data.status ?? current.status;
    const nextContractUrl = data.contractUrl ?? current.contractUrl;
    const nextTaxCode = data.taxCode ?? current.taxCode;

    if (nextStatus === STATUS.ACTIVE && !nextContractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    if (nextStatus === STATUS.ACTIVE || nextTaxCode !== current.taxCode) {
      await validators.checkBusinessRules(
        { ...data, status: nextStatus, contractUrl: nextContractUrl, taxCode: nextTaxCode },
        current.id
      );
    }

    let stoppedAt = current.stoppedAt;
    if (nextStatus === STATUS.STOPPED && current.status !== STATUS.STOPPED) {
      stoppedAt = new Date().toISOString();
    } else if (nextStatus === STATUS.ACTIVE) {
      stoppedAt = null;
    }

    const cleanData = sanitizeSupplierData(data);

    const updatedSupplier = {
      ...current,
      ...cleanData,
      code: targetCode,
      status: nextStatus,
      stoppedAt,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, updatedSupplier);
  },

  async remove(code) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      stoppedAt: now,
      status: STATUS.STOPPED,
      updatedAt: now,
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, softDeleteData);
  },

  async restore(code) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (!current.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    await validators.checkBusinessRules(
      {
        taxCode: current.taxCode,
        status: STATUS.ACTIVE,
        contractUrl: current.contractUrl,
      },
      current.id
    );

    const restoreData = {
      ...current,
      deletedAt: null,
      stoppedAt: null,
      status: STATUS.ACTIVE,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, restoreData);
  },

  async destroy(code) {
    const current = await this.getByCode(code);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${current.id}`);
  },
};