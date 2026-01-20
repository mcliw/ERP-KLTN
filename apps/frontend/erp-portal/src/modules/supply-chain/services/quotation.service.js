import { axiosClient } from "../../../services/axiosClient";

const SC_API_URL = "/supply-chain"; 
const API_URL = `${SC_API_URL}/quotations`;
const SUPPLIER_API_URL = `${SC_API_URL}/suppliers`;
const PR_API_URL = `${SC_API_URL}/purchase_requests`;

const STATUS = {
  PENDING: "PENDING",
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

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const validators = {
  async checkBusinessRules(data) {
    if (!data.pr_id) {
        throw new Error(ERROR_MSGS.PR_ID_REQUIRED);
    }
  },
  async checkUniqueRFQ(rfqCode, currentId = null) {
    if (!rfqCode) return;

    try {
      const url = `${API_URL}?rfq_code=${encodeURIComponent(rfqCode)}`;
      const result = await axiosClient.get(url);

      const duplicate = result.find(item => {
          if (currentId && String(item.id) === String(currentId)) return false;
          return true; 
      });

      if (duplicate) {
        throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },
  checkDeletable(data) {
    if (data.status === STATUS.APPROVED || data.is_selected === true) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_APPROVED);
    }
  }
};

export const quotationService = {

  async getAll({ includeDeleted = false, prId = null } = {}) {
    try {
      let url = API_URL;
      const params = [];
      
      if (prId) params.push(`pr_id=${prId}`);
      params.push(`_expand=supplier`); 

      if (params.length > 0) url += `?${params.join('&')}`;

      const data = await axiosClient.get(url);
      
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.quotation_date || 0).getTime();
        const tb = new Date(b?.quotation_date || 0).getTime();
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
      return await axiosClient.get(`${API_URL}/${id}?_expand=supplier&_expand=purchase_request`);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

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
      is_selected: false, 
      items: data.items || [],
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newQuotation);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

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
    
    delete updatedQuotation.supplier;
    delete updatedQuotation.purchase_request;

    return await axiosClient.put(`${API_URL}/${id}`, updatedQuotation);
  },

  async approve(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const approvedQuotation = {
      ...current,
      status: STATUS.APPROVED,
      updatedAt: new Date().toISOString(),
    };
    delete approvedQuotation.supplier;
    delete approvedQuotation.purchase_request;

    return await axiosClient.put(`${API_URL}/${id}`, approvedQuotation);
  },

  async reject(id, reason) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const rejectedQuotation = {
      ...current,
      status: STATUS.REJECTED,
      rejection_reason: reason, 
      is_selected: false, 
      updatedAt: new Date().toISOString(),
    };
    delete rejectedQuotation.supplier;
    delete rejectedQuotation.purchase_request;

    return await axiosClient.put(`${API_URL}/${id}`, rejectedQuotation);
  },

  async select(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const selectedQuotation = {
        ...current,
        is_selected: true,
        status: STATUS.APPROVED, 
        updatedAt: new Date().toISOString(),
    };
    delete selectedQuotation.supplier;
    delete selectedQuotation.purchase_request;

    return await axiosClient.put(`${API_URL}/${id}`, selectedQuotation);
  },

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

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
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

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    return await axiosClient.delete(`${API_URL}/${id}`);
  },

  async getSuppliersRef() {
    try {
      return await axiosClient.get(SUPPLIER_API_URL);
    } catch (error) {
      console.warn("Không tải được danh sách Suppliers.", error);
      return [];
    }
  },

  async getPurchaseRequestInfo(prId) {
    try {
        return await axiosClient.get(`${PR_API_URL}/${prId}`);
    } catch (error) {
        console.warn("Không tải được thông tin PR.", error);
        return null;
    }
  }
};