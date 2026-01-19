// apps/frontend/erp-portal/src/modules/supply-chain/services/warehouse.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Giả định supply chain chạy port 3002
const API_URL = "http://localhost:3002/warehouses"; 

export const WAREHOUSE_TYPES = {
  CENTRAL: "CENTRAL",
  LOCAL: "LOCAL",
  TRANSIT: "TRANSIT",
  BONDED: "BONDED",
  RETAIL: "RETAIL",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy kho hàng",
  EXISTS: "Mã kho đã tồn tại",
  ID_EXISTS: "ID kho đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CODE_REQUIRED: "Mã kho là bắt buộc",
};

/* =========================
 * Helpers
 * ========================= */
// Kiểm tra xem trường deletedAt có giá trị không (Soft delete)
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  // Kiểm tra trùng Mã kho (Unique Code)
  async checkCodeUnique(code, currentId = null) {
    if (!code) throw new Error(ERROR_MSGS.CODE_REQUIRED);

    // Fetch tất cả để check (hoặc gọi API search nếu backend hỗ trợ: /warehouses?code=XYZ)
    // Ở đây giả lập việc fetch all và filter client-side như json-server thường làm
    try {
      const response = await fetch(`${API_URL}?code=${code}`);
      const data = await handleResponse(response);
      
      // Nếu tìm thấy mảng có phần tử
      if (Array.isArray(data) && data.length > 0) {
        // Nếu đang update (có currentId), bỏ qua chính nó
        const exists = data.some(item => String(item.id) !== String(currentId));
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      // Nếu lỗi là do fetch failed thì throw, còn không (vd empty) thì bỏ qua
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },

  async checkBusinessRules(data, currentId = null) {
    // 1) Validate Unique Code
    if (data.code) {
      await this.checkCodeUnique(data.code, currentId);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const warehouseService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

      // Sắp xếp theo mới nhất (dựa trên createdAt)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });

      return includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deletedAt));
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

  async checkIdExists(id) {
    const item = await this.getById(id);
    return !!item;
  },

  async create(data) {
    // Check ID tồn tại (nếu FE gửi ID)
    if (data.id) {
        const exists = await this.checkIdExists(data.id);
        if (exists) throw new Error(ERROR_MSGS.ID_EXISTS);
    }

    // Validate rules (Unique Code)
    await validators.checkBusinessRules(data);

    const now = new Date().toISOString();
    const newWarehouse = {
      ...data,
      // Mapping fields theo chuẩn JSON database
      code: data.code.toUpperCase(), // Standardize code
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: now,
      updatedAt: null, // Sử dụng updatedAt thay vì updatedAt để khớp JSON
      deletedAt: null, // Thêm trường này để hỗ trợ soft delete logic của FE
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWarehouse),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Check Business Rules nếu code thay đổi
    if (data.code && data.code !== current.code) {
        await validators.checkBusinessRules(data, id);
    }

    const updatedWarehouse = {
      ...current,
      ...data,
      code: data.code ? data.code.toUpperCase() : current.code,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedWarehouse),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,      // Đánh dấu đã xóa
      is_active: false,     // Tắt hoạt động
      updatedAt: now,
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Khi restore, kiểm tra lại xem Code có bị conflict với item mới tạo không
    await validators.checkBusinessRules({ code: current.code }, id);

    const restoreData = {
      ...current,
      deletedAt: null,
      is_active: true,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};