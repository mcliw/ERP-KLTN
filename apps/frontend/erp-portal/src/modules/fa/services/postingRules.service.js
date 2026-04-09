// apps/frontend/erp-portal/src/modules/finance/services/postingRules.service.js

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3003/posting_rules";
const ACCOUNT_API_URL = "http://localhost:3003/chart_of_accounts";

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ kế toán",
  NOT_FOUND: "Không tìm thấy quy tắc định khoản",
  EVENT_CODE_EXISTS: "Mã sự kiện (Event Code) này đã tồn tại",
  ACCOUNT_NOT_FOUND: "Tài khoản Nợ hoặc Có không tồn tại",
  ACCOUNT_INACTIVE: "Tài khoản đang bị khóa (Inactive)",
  SAME_ACCOUNT: "Tài khoản Nợ và Tài khoản Có không được trùng nhau",
  MISSING_ACCOUNTS: "Vui lòng chọn đầy đủ tài khoản Nợ và Có",
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
  // Kiểm tra tài khoản có tồn tại và đang active không
  async checkAccountValidity(accountId, typeLabel) {
    if (!accountId) return;

    const response = await fetch(`${ACCOUNT_API_URL}/${accountId}`);
    if (!response.ok) {
      throw new Error(`${ERROR_MSGS.ACCOUNT_NOT_FOUND}: ${typeLabel} (ID: ${accountId})`);
    }
    
    const account = await response.json();
    if (account.is_active === false) {
      throw new Error(`${ERROR_MSGS.ACCOUNT_INACTIVE}: ${account.account_code} - ${account.account_name}`);
    }
  },

  async checkBusinessRules(data) {
    const { debit_account_id, credit_account_id } = data;

    // 1. Validate Required
    if (!debit_account_id || !credit_account_id) {
        throw new Error(ERROR_MSGS.MISSING_ACCOUNTS);
    }

    // 2. Validate Debit != Credit
    if (String(debit_account_id) === String(credit_account_id)) {
      throw new Error(ERROR_MSGS.SAME_ACCOUNT);
    }

    // 3. Validate Account Existence & Status (Gọi song song cho nhanh)
    await Promise.all([
      this.checkAccountValidity(debit_account_id, "Tài khoản Nợ"),
      this.checkAccountValidity(credit_account_id, "Tài khoản Có"),
    ]);
  },
};

/* =========================
 * Main Service
 * ========================= */
export const postingRulesService = {

  // --- Get List ---
  // Cập nhật: Thêm tham số includeInactive để lọc dữ liệu
  async getAll({ includeInactive = false } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);
      
      let result = Array.isArray(data) ? data : [];

      // Nếu không yêu cầu lấy cả inactive, chỉ trả về các dòng đang hoạt động (hoặc chưa có cờ is_active)
      if (!includeInactive) {
        result = result.filter(item => item.is_active !== false);
      }

      // Sắp xếp theo event_code
      return result.sort((a, b) => {
        return (a.event_code || "").localeCompare(b.event_code || "");
      });
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

  // --- Check Duplicate Event Code ---
  async checkEventCodeExists(code, excludeId = null) {
    if (!code) return false;
    try {
      const response = await fetch(`${API_URL}?event_code=${code}`);
      const data = await handleResponse(response);

      if (Array.isArray(data) && data.length > 0) {
        if (!excludeId) return true;
        // So sánh ID (xử lý cả trường hợp id hoặc rule_id)
        return String(data[0].rule_id || data[0].id) !== String(excludeId);
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // --- Create ---
  async create(data) {
    // 1. Check duplicate code
    const exists = await this.checkEventCodeExists(data.event_code);
    if (exists) throw new Error(ERROR_MSGS.EVENT_CODE_EXISTS);

    // 2. Validate Accounts logic
    await validators.checkBusinessRules(data);

    // 3. Construct Payload
    const newRule = {
      event_code: data.event_code,
      event_description: data.event_description,
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id,
      module_source: data.module_source || "GENERAL",
      // Cập nhật: Mặc định active = true khi tạo mới
      is_active: true, 
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRule),
    });

    return handleResponse(response);
  },

  // --- Update ---
  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // 1. Check duplicate code nếu thay đổi
    if (data.event_code && data.event_code !== current.event_code) {
      const exists = await this.checkEventCodeExists(data.event_code, id);
      if (exists) throw new Error(ERROR_MSGS.EVENT_CODE_EXISTS);
    }

    const nextData = { ...current, ...data };

    // 2. Validate lại nếu thay đổi tài khoản
    if (
      nextData.debit_account_id !== current.debit_account_id ||
      nextData.credit_account_id !== current.credit_account_id
    ) {
      await validators.checkBusinessRules(nextData);
    }

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextData),
    });

    return handleResponse(response);
  },

  // --- Soft Delete (Xóa mềm - Vào thùng rác) ---
  async remove(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: false }),
    });
    return handleResponse(response);
  },

  // --- Restore (Khôi phục) ---
  async restore(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: true }),
    });
    return handleResponse(response);
  },

  // --- Hard Delete (Xóa vĩnh viễn) ---
  async destroy(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  }
};