// apps/frontend/erp-portal/src/modules/sales/services/customer.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Giả định service chạy port 3004
const API_URL = "http://localhost:3004/customers"; 

const STATUS = {
  ACTIVE: "ACTIVE", // Giữ nguyên theo JSON data
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
// Lưu ý: JSON data mẫu không có deleted_at, nhưng logic service mẫu có soft delete.
// Tôi sẽ giữ logic này để đảm bảo tính nhất quán của hệ thống.
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
  /**
   * Kiểm tra các quy tắc nghiệp vụ
   * @param {Object} data - Dữ liệu khách hàng
   * @param {string|null} currentId - ID hiện tại (nếu đang update)
   */
  async checkBusinessRules(data, currentId = null) {
    // 1) Check Duplicate Code (Mã KH phải duy nhất)
    if (data.code) {
      // Gọi API để tìm xem có thằng nào có code này chưa
      // Giả định json-server hỗ trợ filter: ?code=KH001
      try {
        const response = await fetch(`${API_URL}?code=${data.code}`);
        const result = await handleResponse(response);
        
        // Nếu tìm thấy mảng > 0 phần tử
        if (Array.isArray(result) && result.length > 0) {
          const existingItem = result[0];
          // Nếu đang tạo mới (currentId null) -> Lỗi
          // Nếu đang update -> Check xem ID có khác ID hiện tại không
          if (!currentId || existingItem.id !== currentId) {
            throw new Error(ERROR_MSGS.CODE_EXISTS);
          }
        }
      } catch (e) {
        // Bỏ qua lỗi fetch, hoặc throw nếu muốn chặn chặt chẽ
        if (e.message === ERROR_MSGS.CODE_EXISTS) throw e;
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
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

      // Sắp xếp theo mới nhất dựa trên created_at
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
    // 1. Check ID trùng (nếu FE tự sinh ID)
    if (data.id) {
        const exists = await this.checkIdExists(data.id);
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    // 2. Validate Business Rules (Check trùng Code)
    await validators.checkBusinessRules(data);

    const newCustomer = {
      ...data,
      // Đảm bảo các trường bắt buộc
      status: data.status || STATUS.ACTIVE,
      created_at: new Date().toISOString(), // Dùng snake_case theo mẫu JSON
      updated_at: null,
      deleted_at: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Validate Business Rules (Check trùng Code nếu code thay đổi)
    if (data.code && data.code !== current.code) {
        await validators.checkBusinessRules(data, id);
    }

    const updatedCustomer = {
      ...current,
      ...data,
      status: data.status || current.status,
      updated_at: new Date().toISOString(), // update thời gian
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCustomer),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deleted_at: now, // snake_case
      status: STATUS.INACTIVE,
      updated_at: now,
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

    // Với Customer, khi restore có thể cần check lại xem Code có bị trùng 
    // với một customer mới tạo trong lúc customer này bị xóa không.
    await validators.checkBusinessRules({ code: current.code }, id);

    const restoreData = {
      ...current,
      deleted_at: null,
      status: STATUS.ACTIVE,
      updated_at: new Date().toISOString(),
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