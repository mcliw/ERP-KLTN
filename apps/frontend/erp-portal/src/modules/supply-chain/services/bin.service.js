// apps/frontend/erp-portal/src/modules/supply-chain/services/bin.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Giả định supply chain chạy port 3002 và endpoint là bin_locations
const API_URL = "http://localhost:3002/bin_locations"; 

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy vị trí lưu kho",
  EXISTS: "Mã vị trí đã tồn tại trong kho này",
  ID_EXISTS: "ID vị trí đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CODE_REQUIRED: "Mã vị trí là bắt buộc",
  WAREHOUSE_REQUIRED: "Phải chọn kho hàng",
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
  // Kiểm tra trùng Mã vị trí (Unique Code) theo Warehouse (Scope: Warehouse Level)
  async checkCodeUnique(code, warehouseId, currentId = null) {
    if (!code) throw new Error(ERROR_MSGS.CODE_REQUIRED);
    if (!warehouseId) throw new Error(ERROR_MSGS.WAREHOUSE_REQUIRED);

    // Fetch bin có cùng code VÀ cùng warehouse_id
    try {
      const response = await fetch(`${API_URL}?code=${code}&warehouse_id=${warehouseId}`);
      const data = await handleResponse(response);
      
      // Nếu tìm thấy mảng có phần tử
      if (Array.isArray(data) && data.length > 0) {
        // Nếu đang update (có currentId), bỏ qua chính nó
        const exists = data.some(item => String(item.id) !== String(currentId));
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },

  async checkBusinessRules(data, currentId = null) {
    // 1) Validate Unique Code trong cùng một kho
    if (data.code && data.warehouse_id) {
      await this.checkCodeUnique(data.code, data.warehouse_id, currentId);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const binService = {
  // Cho phép filter theo warehouseId nếu cần (vd: Lấy tất cả bin của kho 1)
  async getAll({ includeDeleted = false, warehouseId = null } = {}) {
    try {
      let url = API_URL;
      
      // Nếu có filter theo kho
      if (warehouseId) {
        url += `?warehouse_id=${warehouseId}`;
      }

      const response = await fetch(url);
      const data = await handleResponse(response);

      // Sắp xếp theo code (A-Z) hoặc id vì bin thường ít khi sort theo ngày tạo
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        // Ưu tiên hiển thị bin mới tạo nếu có createdAt, nếu không sort theo Code
        if (a.createdAt && b.createdAt) {
           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return (a.code || "").localeCompare(b.code || "");
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

    // Validate rules (Unique Code per Warehouse)
    await validators.checkBusinessRules(data);

    const now = new Date().toISOString();
    const newBin = {
      ...data,
      // Mapping fields theo chuẩn JSON database
      code: data.code.toUpperCase(), // Standardize code
      warehouse_id: Number(data.warehouse_id), // Đảm bảo kiểu số cho FK
      max_capacity: Number(data.max_capacity) || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: now,
      updatedAt: null, 
      deletedAt: null, 
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newBin),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Nếu thay đổi code hoặc chuyển bin sang kho khác -> Check lại rule
    const isCodeChanged = data.code && data.code !== current.code;
    const isWarehouseChanged = data.warehouse_id && data.warehouse_id !== current.warehouse_id;

    if (isCodeChanged || isWarehouseChanged) {
        // Dữ liệu để validate: ưu tiên data mới, nếu thiếu lấy data cũ
        const validationData = {
            code: data.code || current.code,
            warehouse_id: data.warehouse_id || current.warehouse_id
        };
        await validators.checkBusinessRules(validationData, id);
    }

    const updatedBin = {
      ...current,
      ...data,
      code: data.code ? data.code.toUpperCase() : current.code,
      warehouse_id: data.warehouse_id ? Number(data.warehouse_id) : current.warehouse_id,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedBin),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    // Bin thường không có is_active, chỉ dùng deletedAt để ẩn
    const softDeleteData = {
      ...current,
      deletedAt: now,
      is_active: false,
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

    // Khi restore, kiểm tra lại conflict code trong kho đó
    await validators.checkBusinessRules({ 
        code: current.code, 
        warehouse_id: current.warehouse_id 
    }, id);

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