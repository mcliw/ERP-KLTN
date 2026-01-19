// apps/frontend/erp-portal/src/modules/supply-chain/services/purchaseRequest.service.js

/* =========================
 * Config & Constants
 * ========================= */
// 1. Supply Chain Service (Chứa PR, Items, Products) - Port 3002
const SC_API_URL = "http://localhost:3002"; 
const API_URL = `${SC_API_URL}/purchase_requests`;
const ITEM_API_URL = `${SC_API_URL}/pr_items`;
const PRODUCT_API_URL = `${SC_API_URL}/products`; // <--- MỚI: Endpoint sản phẩm

// 2. HRM Service (Chứa Employees, Departments) - Port 3001
const HRM_API_URL = "http://localhost:3001"; 

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
    if (data.pr_code) {
      const allUrl = `${API_URL}?pr_code=${data.pr_code}`;
      const response = await fetch(allUrl);
      const result = await handleResponse(response);
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
      const response = await fetch(url);
      const data = await handleResponse(response);
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
      const prResponse = await fetch(`${API_URL}/${id}`);
      const prData = await handleResponse(prResponse);
      if (!prData) return null;
      const itemsResponse = await fetch(`${ITEM_API_URL}?pr_id=${id}`);
      const itemsData = await handleResponse(itemsResponse);
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
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPR),
    });
    const createdPR = await handleResponse(response);
    
    // Lưu Items
    if (data.items && Array.isArray(data.items) && createdPR.id) {
      const itemPromises = data.items.map(item => {
        return fetch(ITEM_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, pr_id: createdPR.id })
        });
      });
      await Promise.all(itemPromises);
    }
    return createdPR;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    if (data.pr_code && data.pr_code !== current.pr_code) {
        await validators.checkBusinessRules(data, id);
    }
    const updatedPR = {
      ...current, ...data,
      items: undefined, 
      updatedAt: new Date().toISOString(),
    };
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPR),
    });
    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    validators.checkDeletable(current.status);
    const now = new Date().toISOString();
    const softDeleteData = { ...current, items: undefined, deletedAt: now, updatedAt: now };
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
    const restoreData = { ...current, items: undefined, deletedAt: null, status: STATUS.DRAFT, updatedAt: new Date().toISOString() };
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
    if (current.items && current.items.length > 0) {
        const deleteItemPromises = current.items.map(item => 
            fetch(`${ITEM_API_URL}/${item.id}`, { method: "DELETE" })
        );
        await Promise.all(deleteItemPromises);
    }
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },

  // --- 2. REFERENCE DATA FUNCTIONS ---
  // Các hàm này dùng để lấy dữ liệu tham chiếu (Dropdown, Map tên...)

  // Lấy nhân viên từ HRM (Port 3001)
  async getEmployeesRef() {
    try {
      const response = await fetch(`${HRM_API_URL}/employees`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn("Không tải được danh sách Employees từ HRM.", error);
      return [];
    }
  },

  // Lấy phòng ban từ HRM (Port 3001)
  async getDepartmentsRef() {
    try {
      const response = await fetch(`${HRM_API_URL}/departments`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn("Không tải được danh sách Departments từ HRM.", error);
      return [];
    }
  },

  // Lấy sản phẩm từ Supply Chain (Port 3002)
  // <--- HÀM BẠN CẦN THÊM
  async getProductsRef() {
    try {
      const response = await fetch(PRODUCT_API_URL);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn("Không tải được danh sách Products.", error);
      return [];
    }
  }
};