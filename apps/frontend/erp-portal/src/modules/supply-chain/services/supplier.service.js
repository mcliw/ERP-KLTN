// apps/frontend/erp-portal/src/modules/supply-chain/services/supplier.service.js

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3002/suppliers";

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
const isActiveAndNotDeleted = (s) => s?.status === STATUS.ACTIVE && !isSoftDeleted(s?.deletedAt);

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

const sanitizeSupplierData = (data) => {
  // Loại bỏ các field file raw nếu có (giữ lại url)
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

    // 1) Unique Tax Code check (Kiểm tra trùng mã số thuế)
    if (taxCode) {
      // Fetch all suppliers to check duplicate tax code (Giả lập logic check phía client hoặc gọi API search)
      // Trong thực tế nên dùng API filter: ?taxCode=...
      const res = await fetch(`${API_URL}?taxCode=${encodeURIComponent(taxCode)}`);
      let suppliersWithTax = await res.json();

      suppliersWithTax = suppliersWithTax
        .filter((s) => !isSoftDeleted(s?.deletedAt))
        .filter((s) => (ignoreId ? s.id !== ignoreId : true));

      if (suppliersWithTax.length > 0) {
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
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

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
      const response = await fetch(`${API_URL}/${id}`);
      return await handleResponse(response);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async getByCode(code) {
    try {
      const targetCode = normalizeCode(code);
      const response = await fetch(`${API_URL}?code=${targetCode}`);
      const data = await handleResponse(response);
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

    // Enforce contract for ACTIVE (create default ACTIVE)
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
      stoppedAt: null, // Tương đương resignedAt bên employee
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSupplier),
    });

    return handleResponse(response);
  },

  async update(code, data) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const nextStatus = data.status ?? current.status;
    const nextContractUrl = data.contractUrl ?? current.contractUrl;
    const nextTaxCode = data.taxCode ?? current.taxCode;

    // Enforce contract for ACTIVE
    if (nextStatus === STATUS.ACTIVE && !nextContractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // Check business rules khi thay đổi thông tin quan trọng (status, taxCode)
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

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedSupplier),
    });

    return handleResponse(response);
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

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  async restore(code) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Restore về ACTIVE => bắt buộc hợp đồng
    if (!current.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // Check tax code uniqueness khi restore
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

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  async destroy(code) {
    const current = await this.getByCode(code);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};