// apps/frontend/erp-portal/src/modules/supply-chain/services/purchaseRequest.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
// 1. Supply Chain Service (Chứa PR, Items, Products) - Port 3002
const SC_API_URL = "/supply-chain"; 
const API_URL = `${SC_API_URL}/purchase_requests`;
const ITEM_API_URL = `${SC_API_URL}/pr_items`;
const PRODUCT_API_URL = `${SC_API_URL}/products`;

// 2. HRM Service (Chứa Employees, Departments) - Port 3001
const HRM_API_URL = "/hrm"; 

const STATUS = {
  DRAFT: "DRAFT",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED"
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy yêu cầu mua hàng",
  EXISTS: "Mã phiếu (PR Code) đã tồn tại",
  ITEM_FETCH_FAILED: "Không thể tải danh sách sản phẩm",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CANNOT_DELETE_APPROVED: "Không thể xóa phiếu đã được duyệt",
  CANNOT_EDIT_APPROVED: "Không thể chỉnh sửa phiếu khi đã được Phê duyệt, Hoàn tất hoặc Đã hủy.",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, currentId = null) {
    if (data.pr_code) {
      // Dùng axios để check code
      const result = await axiosClient.get(`${API_URL}?pr_code=${data.pr_code}`);
      const exists = result && result.length > 0 && result[0].id !== currentId;
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }
  },
  checkDeletable(status) {
    if (status === STATUS.APPROVED || status === STATUS.COMPLETED) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_APPROVED);
    }
  }
};

/* =========================
 * Main Service
 * ========================= */
export const purchaseRequestService = {
  // --- 1. CORE FUNCTIONS (CRUD Purchase Request) ---

  async getAll({ includeDeleted = false, includeItems = false } = {}) {
    try {
      let url = API_URL;
      if (includeItems) url += `?_embed=pr_items`; 
      
      const data = await axiosClient.get(url);
      
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta;
      });
      return includeDeleted ? sortedData : sortedData.filter((item) => !isSoftDeleted(item?.deletedAt));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const prData = await axiosClient.get(`${API_URL}/${id}`);
      if (!prData) return null;
      
      // Lấy items bằng axios
      const itemsData = await axiosClient.get(`${ITEM_API_URL}?pr_id=${id}`);
      return { ...prData, items: itemsData || [] };
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async create(data) {
    await validators.checkBusinessRules(data);
    const newPR = {
      pr_code: data.pr_code,
      requester_id: data.requester_id,
      department_id: data.department_id,
      request_date: data.request_date,
      reason: data.reason,
      status: data.status || STATUS.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const createdPR = await axiosClient.post(API_URL, newPR);
    
    // Lưu Items
    if (data.items && Array.isArray(data.items) && createdPR.id) {
      const itemPromises = data.items.map(item => {
        return axiosClient.post(ITEM_API_URL, { ...item, pr_id: createdPR.id });
      });
      await Promise.all(itemPromises);
    }
    return createdPR;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const lockedStatuses = [STATUS.APPROVED, STATUS.COMPLETED, STATUS.CANCELLED];
    if (lockedStatuses.includes(current.status)) {
        throw new Error(ERROR_MSGS.CANNOT_EDIT_APPROVED);
    }

    if (data.pr_code && data.pr_code !== current.pr_code) {
        await validators.checkBusinessRules(data, id);
    }
    
    const updatedPR = {
      ...current, ...data,
      items: undefined, 
      updatedAt: new Date().toISOString(),
    };
    
    return await axiosClient.put(`${API_URL}/${id}`, updatedPR);
  },

  // --- NEW: CHỨC NĂNG DUYỆT / TỪ CHỐI ---

  async approve(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const approvedPR = {
      ...current,
      items: undefined,
      status: STATUS.APPROVED,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, approvedPR);
  },

  async reject(id, reason) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const rejectedPR = {
      ...current,
      items: undefined,
      status: STATUS.REJECTED,
      rejection_reason: reason,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, rejectedPR);
  },

  // ----------------------------------------

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    validators.checkDeletable(current.status);
    
    const now = new Date().toISOString();
    const softDeleteData = { ...current, items: undefined, deletedAt: now, updatedAt: now };
    
    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const restoreData = { ...current, items: undefined, deletedAt: null, status: STATUS.DRAFT, updatedAt: new Date().toISOString() };
    
    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    // Xóa items con
    if (current.items && current.items.length > 0) {
        const deleteItemPromises = current.items.map(item => 
            axiosClient.delete(`${ITEM_API_URL}/${item.id}`)
        );
        await Promise.all(deleteItemPromises);
    }
    
    return await axiosClient.delete(`${API_URL}/${id}`);
  },

  // --- 2. REFERENCE DATA FUNCTIONS ---

  async getEmployeesRef() {
    try {
      return await axiosClient.get(`${HRM_API_URL}/employees`);
    } catch (error) {
      console.warn("Không tải được danh sách Employees từ HRM.", error);
      return [];
    }
  },

  async getDepartmentsRef() {
    try {
      return await axiosClient.get(`${HRM_API_URL}/departments`);
    } catch (error) {
      console.warn("Không tải được danh sách Departments từ HRM.", error);
      return [];
    }
  },

  async getProductsRef() {
    try {
      return await axiosClient.get(PRODUCT_API_URL);
    } catch (error) {
      console.warn("Không tải được danh sách Products.", error);
      return [];
    }
  }
};