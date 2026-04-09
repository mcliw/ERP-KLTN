// apps/frontend/erp-portal/src/modules/finance/services/faAccount.service.js

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3003/chart_of_accounts"; 

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ kế toán",
  NOT_FOUND: "Không tìm thấy tài khoản",
  CODE_EXISTS: "Số hiệu tài khoản đã tồn tại",
  PARENT_NOT_FOUND: "Tài khoản cha không tồn tại",
  CIRCULAR_DEPENDENCY: "Tài khoản cha không thể là chính nó",
  TYPE_MISMATCH: "Tài khoản con phải cùng loại (Account Type) với tài khoản cha",
};

/* =========================
 * Helpers
 * ========================= */
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
    const parentId = data?.parent_account_id;

    // 1. Circular Dependency Check
    if (parentId && currentId && String(parentId) === String(currentId)) {
      throw new Error(ERROR_MSGS.CIRCULAR_DEPENDENCY);
    }

    // 2. Parent Validation
    if (parentId) {
      // Gọi trực tiếp ID vì giờ đây ID là chuẩn
      const response = await fetch(`${API_URL}/${parentId}`);
      if (!response.ok) throw new Error(ERROR_MSGS.PARENT_NOT_FOUND);
      
      const parentAccount = await response.json();

      if (data.account_type && parentAccount.account_type !== data.account_type) {
        throw new Error(
            `${ERROR_MSGS.TYPE_MISMATCH}. Cha: ${parentAccount.account_type}, Con: ${data.account_type}`
        );
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
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

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

  // --- Get Detail (Chuẩn REST) ---
  async getById(id) {
    try {
      // Giờ đây có thể gọi thẳng URL này vì JSON DB đã có trường "id"
      const response = await fetch(`${API_URL}/${id}`);
      return await handleResponse(response);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  // --- Check Duplicate Code ---
  async checkCodeExists(code, excludeId = null) {
    if (!code) return false;
    try {
      const response = await fetch(`${API_URL}?account_code=${code}`);
      const data = await handleResponse(response);
      
      if (Array.isArray(data) && data.length > 0) {
        // So sánh với trường id chuẩn
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

    // Không cần tự sinh ID nữa nếu để JSON Server tự lo (nếu POST body không có id), 
    // hoặc tự sinh chuỗi string nếu muốn kiểm soát.
    const newAccount = {
      ...data,
      balance_side: data.balance_side || "DEBIT",
      account_code: data.account_code,
      account_name: data.account_name,
      parent_account_id: data.parent_account_id || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      created_at: new Date().toISOString(),
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });

    return handleResponse(response);
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
    
    // Validate lại nếu thay đổi cha hoặc loại TK
    if (nextData.parent_account_id !== current.parent_account_id || nextData.account_type !== current.account_type) {
        await validators.checkBusinessRules(nextData, id);
    }

    // Gọi thẳng PUT vào ID
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData),
    });

    return handleResponse(response);
  },

  // --- Soft Delete ---
  async remove(id) {
    // Gọi patch để chỉ update 1 trường is_active (nhanh gọn hơn PUT toàn bộ)
    // JSON Server hỗ trợ PATCH
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    return handleResponse(response);
  },

  // --- Restore ---
  async restore(id) {
    // Cẩn thận: Cần check cha trước khi restore
    const current = await this.getById(id);
    if (current && current.parent_account_id) {
        // Check xem cha có tồn tại không
        await validators.checkBusinessRules(current, id);
    }

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    return handleResponse(response);
  },

  // --- Hard Delete ---
  async destroy(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};