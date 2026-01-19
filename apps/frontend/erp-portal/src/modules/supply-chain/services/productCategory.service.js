// apps/frontend/erp-portal/src/modules/supply-chain/services/productCategory.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Giả định supply chain chạy port 3002 hoặc chung port
const API_URL = "http://localhost:3002/product_categories"; 

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy danh mục",
  EXISTS: "Mã danh mục đã tồn tại",
  PARENT_NOT_FOUND: "Danh mục cha không tồn tại",
  CIRCULAR_DEPENDENCY: "Danh mục cha không thể là chính nó",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

/* =========================
 * Helpers
 * ========================= */
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
  async checkBusinessRules(data, currentId = null) {
    const parentId = data?.parentId;

    // 1) Circular Dependency Check (Basic): Parent cannot be self
    if (parentId && currentId && parentId === currentId) {
      throw new Error(ERROR_MSGS.CIRCULAR_DEPENDENCY);
    }

    // 2) Parent Existence Check
    // Nếu có chọn parentId, phải đảm bảo parentId đó tồn tại trong DB
    if (parentId) {
      const response = await fetch(`${API_URL}/${parentId}`);
      if (!response.ok) {
        throw new Error(ERROR_MSGS.PARENT_NOT_FOUND);
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const productCategoryService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

      // Sắp xếp theo mới nhất
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
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

  // Hàm kiểm tra ID tồn tại (tương tự checkCodeExists)
  async checkIdExists(id) {
    const item = await this.getById(id);
    return !!item;
  },

  async create(data) {
    // Generate ID nếu cần, hoặc giả định FE/BE đã xử lý. 
    // Ở đây giả định data đã có id hoặc BE tự sinh. 
    // Nếu data có id, check trùng:
    if (data.id) {
        const exists = await this.checkIdExists(data.id);
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    // Validate rules
    await validators.checkBusinessRules(data);

    const newCategory = {
      ...data,
      parentId: data.parentId || null, // Đảm bảo null nếu rỗng
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCategory),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const nextParentId = data.parentId !== undefined ? data.parentId : current.parentId;
    const nextStatus = data.status || current.status;

    // Check Business Rules khi thay đổi Parent
    if (nextParentId !== current.parentId) {
        await validators.checkBusinessRules({ ...data, parentId: nextParentId }, id);
    }

    const updatedCategory = {
      ...current,
      ...data,
      parentId: nextParentId || null,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedCategory),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      status: STATUS.INACTIVE,
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

    // Khi restore, kiểm tra lại xem Parent có còn tồn tại/active không
    if (current.parentId) {
        await validators.checkBusinessRules({ parentId: current.parentId }, id);
    }

    const restoreData = {
      ...current,
      deletedAt: null,
      status: STATUS.ACTIVE,
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