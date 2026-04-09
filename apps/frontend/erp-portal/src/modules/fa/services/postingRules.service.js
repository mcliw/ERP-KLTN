// apps/frontend/erp-portal/src/modules/finance/services/postingRules.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "/accounting/posting_rules";
const ACCOUNT_API_URL = "/accounting/chart_of_accounts";

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
 * Business Validators
 * ========================= */
const validators = {
  // Kiểm tra tài khoản có tồn tại và đang active không
  async checkAccountValidity(accountId, typeLabel) {
    if (!accountId) return;

    try {
      const account = await axiosClient.get(`${ACCOUNT_API_URL}/${accountId}`);
      
      if (account.is_active === false) {
        throw new Error(`${ERROR_MSGS.ACCOUNT_INACTIVE}: ${account.account_code} - ${account.account_name}`);
      }
    } catch (error) {
        // Phân biệt lỗi do logic is_active hay do 404
        if (error.message.includes(ERROR_MSGS.ACCOUNT_INACTIVE)) throw error;
        throw new Error(`${ERROR_MSGS.ACCOUNT_NOT_FOUND}: ${typeLabel} (ID: ${accountId})`);
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

    // 3. Validate Account Existence & Status
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
  async getAll({ includeInactive = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);
      
      let result = Array.isArray(data) ? data : [];

      if (!includeInactive) {
        result = result.filter(item => item.is_active !== false);
      }

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
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  // --- Check Duplicate Event Code ---
  async checkEventCodeExists(code, excludeId = null) {
    if (!code) return false;
    try {
      const data = await axiosClient.get(`${API_URL}?event_code=${code}`);

      if (Array.isArray(data) && data.length > 0) {
        if (!excludeId) return true;
        return String(data[0].rule_id || data[0].id) !== String(excludeId);
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // --- Create ---
  async create(data) {
    const exists = await this.checkEventCodeExists(data.event_code);
    if (exists) throw new Error(ERROR_MSGS.EVENT_CODE_EXISTS);

    await validators.checkBusinessRules(data);

    const newRule = {
      event_code: data.event_code,
      event_description: data.event_description,
      debit_account_id: data.debit_account_id,
      credit_account_id: data.credit_account_id,
      module_source: data.module_source || "GENERAL",
      is_active: true, 
    };

    return await axiosClient.post(API_URL, newRule);
  },

  // --- Update ---
  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.event_code && data.event_code !== current.event_code) {
      const exists = await this.checkEventCodeExists(data.event_code, id);
      if (exists) throw new Error(ERROR_MSGS.EVENT_CODE_EXISTS);
    }

    const nextData = { ...current, ...data };

    if (
      nextData.debit_account_id !== current.debit_account_id ||
      nextData.credit_account_id !== current.credit_account_id
    ) {
      await validators.checkBusinessRules(nextData);
    }

    return await axiosClient.put(`${API_URL}/${id}`, nextData);
  },

  // --- Soft Delete ---
  async remove(id) {
    return await axiosClient.patch(`${API_URL}/${id}`, { is_active: false });
  },

  // --- Restore ---
  async restore(id) {
    return await axiosClient.patch(`${API_URL}/${id}`, { is_active: true });
  },

  // --- Hard Delete ---
  async destroy(id) {
    return await axiosClient.delete(`${API_URL}/${id}`);
  }
};