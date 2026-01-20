// apps/frontend/erp-portal/src/modules/finance/services/faAccount.service.js

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3003/chart_of_accounts"; 

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ kế toán",
  NOT_FOUND: "Không tìm thấy tài khoản",
  CODE_EXISTS: "Số hiệu tài khoản đã tồn tại trong hệ thống",
  PARENT_NOT_FOUND: "Tài khoản cha không tồn tại",
  CIRCULAR_DEPENDENCY: "Tài khoản cha không thể là chính nó",
  TYPE_MISMATCH: "Tài khoản con phải cùng loại (Account Type) với tài khoản cha",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu tài khoản",
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
  /**
   * Kiểm tra các quy tắc nghiệp vụ
   * @param {Object} data - Dữ liệu đầy đủ của account đang xử lý (đã merge nếu là update)
   * @param {Number|String} currentId - ID của account hiện tại (nếu đang update)
   */
  async checkBusinessRules(data, currentId = null) {
    const parentId = data?.parent_account_id;

    // 1. Circular Dependency Check
    if (parentId && currentId && String(parentId) === String(currentId)) {
      throw new Error(ERROR_MSGS.CIRCULAR_DEPENDENCY);
    }

    // 2. Parent Validation (Existence & Type Consistency)
    if (parentId) {
      const response = await fetch(`${API_URL}/${parentId}`);
      
      if (!response.ok) {
        throw new Error(ERROR_MSGS.PARENT_NOT_FOUND);
      }
      
      const parentAccount = await response.json();

      // [NEW RULE] Kiểm tra loại tài khoản cha và con phải giống nhau
      // Ví dụ: Cha là ASSET thì con phải là ASSET
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

      // Sắp xếp theo Account Code tăng dần
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
      // Tìm trong DB xem có thằng nào có code này không
      const response = await fetch(`${API_URL}?account_code=${code}`);
      const data = await handleResponse(response);
      
      if (Array.isArray(data) && data.length > 0) {
        // Nếu tìm thấy, kiểm tra xem có phải chính nó đang update không
        // Json-server trả về id (hoặc account_id tùy config), ta so sánh cả 2 cho chắc
        const existingItem = data[0];
        const existingId = existingItem.id || existingItem.account_id;

        if (!excludeId) return true; // Tạo mới mà thấy => Trùng
        return String(existingId) !== String(excludeId); // Update mà ID khác nhau => Trùng
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // --- Create ---
  async create(data) {
    // 1. [RULE] Check trùng mã tài khoản
    const exists = await this.checkCodeExists(data.account_code);
    if (exists) {
        throw new Error(ERROR_MSGS.CODE_EXISTS);
    }

    // 2. [RULE] Validate Parent & Type Consistency
    await validators.checkBusinessRules(data);

    const newAccount = {
      ...data,
      // Đảm bảo các trường quan trọng có giá trị chuẩn
      account_code: data.account_code,
      account_name: data.account_name,
      account_type: data.account_type, // Bắt buộc phải có để validate với cha
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

    // 1. [RULE] Check trùng mã nếu người dùng đổi mã
    if (data.account_code && data.account_code !== current.account_code) {
        const exists = await this.checkCodeExists(data.account_code, id);
        if (exists) throw new Error(ERROR_MSGS.CODE_EXISTS);
    }

    // Merge data mới vào data cũ để có object đầy đủ thông tin (phục vụ validation)
    const nextData = { ...current, ...data };
    
    // 2. [RULE] Validate Parent & Type Consistency với dữ liệu sau khi merge
    // (Vì có thể người dùng chỉ update parent_id mà không gửi account_type, hoặc ngược lại)
    if (nextData.parent_account_id !== current.parent_account_id || nextData.account_type !== current.account_type) {
        await validators.checkBusinessRules(nextData, id);
    }

    const updatedAccount = {
      ...nextData,
      parent_account_id: nextData.parent_account_id || null,
      // updated_at: new Date().toISOString() // Uncomment nếu DB có cột này
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedAccount),
    });

    return handleResponse(response);
  },

  // --- Soft Delete (Set Active = False) ---
  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Kế toán thường chỉ ẩn (inactive) chứ không xóa vật lý
    const softDeleteData = {
      ...current,
      is_active: false,
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  // --- Restore ---
  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Khi restore, cần đảm bảo cha (nếu có) vẫn hợp lệ
    if (current.parent_account_id) {
        await validators.checkBusinessRules(current, id);
    }

    const restoreData = {
      ...current,
      is_active: true,
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  // --- Hard Delete (Ít dùng) ---
  async destroy(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};