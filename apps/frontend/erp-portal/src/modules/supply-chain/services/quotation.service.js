// apps/frontend/erp-portal/src/modules/supply-chain/services/quotation.service.js

/* =========================
 * Config & Constants
 * ========================= */
// 1. Supply Chain Service (Chứa PR, Quotations, Suppliers) - Port 3002
const SC_API_URL = "http://localhost:3002"; 
const API_URL = `${SC_API_URL}/quotations`;
const SUPPLIER_API_URL = `${SC_API_URL}/suppliers`; // Giả định có endpoint suppliers
const PR_API_URL = `${SC_API_URL}/purchase_requests`;

// 2. Constants
const STATUS = {
  PENDING: "PENDING", // Trạng thái mặc định nếu chưa duyệt
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED"
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy báo giá",
  EXISTS: "Mã RFQ hoặc Báo giá đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CANNOT_DELETE_APPROVED: "Không thể xóa báo giá đã được duyệt hoặc đã chọn",
  CANNOT_EDIT_APPROVED: "Không thể chỉnh sửa báo giá khi đã được Phê duyệt hoặc Đã chọn.",
  PR_ID_REQUIRED: "Mã yêu cầu mua hàng (PR ID) là bắt buộc"
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
    if (!data.pr_id) {
        throw new Error(ERROR_MSGS.PR_ID_REQUIRED);
    }
  },
  async checkUniqueRFQ(rfqCode, currentId = null) {
    if (!rfqCode) return;

    const url = `${API_URL}?rfq_code=${encodeURIComponent(rfqCode)}`;
    const response = await fetch(url);
    const result = await handleResponse(response);

    const duplicate = result.find(item => {
        if (currentId && String(item.id) === String(currentId)) return false;
        return true; 
    });

    if (duplicate) {
      throw new Error(ERROR_MSGS.EXISTS);
    }
  },
  checkDeletable(data) {
    if (data.status === STATUS.APPROVED || data.is_selected === true) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_APPROVED);
    }
  }
};

/* =========================
 * Main Service
 * ========================= */
export const quotationService = {
  // --- 1. CORE FUNCTIONS (CRUD Quotation) ---

  async getAll({ includeDeleted = false, prId = null } = {}) {
    try {
      let url = API_URL;
      const params = [];
      
      // Filter theo PR nếu có
      if (prId) params.push(`pr_id=${prId}`);
      
      // Embed Supplier để lấy tên nhà cung cấp (json-server support _expand)
      params.push(`_expand=supplier`); 

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url);
      const data = await handleResponse(response);
      
      // Sort theo ngày báo giá mới nhất
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.quotation_date || 0).getTime();
        const tb = new Date(b?.quotation_date || 0).getTime();
        return tb - ta;
      });

      // Lọc soft delete (Dựa trên cấu trúc mẫu, dù JSON quotation chưa có deletedAt nhưng giữ logic để đồng bộ)
      return includeDeleted ? sortedData : sortedData.filter((item) => !isSoftDeleted(item?.deletedAt));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      // Expand supplier và purchase_request để lấy thông tin chi tiết
      const response = await fetch(`${API_URL}/${id}?_expand=supplier&_expand=purchase_request`);
      return await handleResponse(response);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  // Hàm tiện ích lấy danh sách báo giá theo PR ID
  async getByPrId(prId) {
    return this.getAll({ prId });
  },

  async create(data) {
    await validators.checkBusinessRules(data);
    await validators.checkUniqueRFQ(data.rfq_code);

    const newQuotation = {
      rfq_code: data.rfq_code,
      supplier_id: data.supplier_id,
      pr_id: data.pr_id,
      quotation_date: data.quotation_date || new Date().toISOString().split('T')[0],
      valid_until: data.valid_until,
      total_amount: Number(data.total_amount),
      status: data.status || STATUS.PENDING,
      is_selected: false, // Mặc định là false khi tạo mới
      items: data.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQuotation),
    });
    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Khóa chỉnh sửa nếu đã được duyệt hoặc đã được chọn
    if (current.status === STATUS.APPROVED || current.is_selected) {
        throw new Error(ERROR_MSGS.CANNOT_EDIT_APPROVED);
    }

    if (data.rfq_code && data.rfq_code !== current.rfq_code) {
        await validators.checkUniqueRFQ(data.rfq_code, id);
    }

    const updatedQuotation = {
      ...current, ...data,
      items: data.items || current.items || [],
      updatedAt: new Date().toISOString(),
    };
    
    // Loại bỏ các trường expand khi update ngược lại server
    delete updatedQuotation.supplier;
    delete updatedQuotation.purchase_request;

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedQuotation),
    });
    return handleResponse(response);
  },

  // --- NEW: CHỨC NĂNG DUYỆT / CHỌN BÁO GIÁ ---

  async approve(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const approvedQuotation = {
      ...current,
      status: STATUS.APPROVED,
      updatedAt: new Date().toISOString(),
    };
    // Clean expanded fields
    delete approvedQuotation.supplier;
    delete approvedQuotation.purchase_request;

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvedQuotation),
    });
    return handleResponse(response);
  },

  async reject(id, reason) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const rejectedQuotation = {
      ...current,
      status: STATUS.REJECTED,
      rejection_reason: reason, // Nếu DB Quotation có trường này
      is_selected: false, // Bị từ chối thì chắc chắn không được chọn
      updatedAt: new Date().toISOString(),
    };
    delete rejectedQuotation.supplier;
    delete rejectedQuotation.purchase_request;

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejectedQuotation),
    });
    return handleResponse(response);
  },

  // Chức năng đặc thù: Chọn báo giá (Select for Purchase Order)
  async select(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Logic: Khi chọn 1 báo giá, status thường chuyển thành Approved (nếu chưa)
    const selectedQuotation = {
        ...current,
        is_selected: true,
        status: STATUS.APPROVED, 
        updatedAt: new Date().toISOString(),
    };
    delete selectedQuotation.supplier;
    delete selectedQuotation.purchase_request;

    const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedQuotation),
    });
    return handleResponse(response);
  },

  // ----------------------------------------

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    validators.checkDeletable(current);

    const now = new Date().toISOString();
    const softDeleteData = { 
        ...current, 
        deletedAt: now, 
        updatedAt: now 
    };
    delete softDeleteData.supplier;
    delete softDeleteData.purchase_request;

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
    
    const restoreData = { 
        ...current, 
        deletedAt: null, 
        updatedAt: new Date().toISOString() 
    };
    delete restoreData.supplier;
    delete restoreData.purchase_request;

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  async destroy(id) {
    // Hard delete
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },

  // --- 2. REFERENCE DATA FUNCTIONS ---

  async getSuppliersRef() {
    try {
      const response = await fetch(SUPPLIER_API_URL);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.warn("Không tải được danh sách Suppliers.", error);
      return [];
    }
  },

  async getPurchaseRequestInfo(prId) {
    try {
        const response = await fetch(`${PR_API_URL}/${prId}`);
        return await handleResponse(response);
    } catch (error) {
        console.warn("Không tải được thông tin PR.", error);
        return null;
    }
  }
};