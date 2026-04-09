// apps/frontend/erp-portal/src/modules/sales/services/receipt.service.js

/* =========================
 * Config & Constants
 * ========================= */
const FA_API_URL = "http://localhost:3003";
const SALES_API_URL = "http://localhost:3004";

const ENDPOINTS = {
  RECEIPTS: `${FA_API_URL}/cash_transactions`,
  CUSTOMERS: `${SALES_API_URL}/customers`,
  ORDERS: `${SALES_API_URL}/orders`,
};

const TRANSACTION_TYPE = {
  RECEIPT: "RECEIPT",
};

const ACCOUNT_CODES = {
  CASH: "111",
  BANK: "112",
  RECEIVABLE: "131",
};

const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy phiếu thu",
  EXISTS: "Số phiếu thu (ID) đã tồn tại",
  CUSTOMER_NOT_FOUND: "Khách hàng không tồn tại trong hệ thống Bán hàng",
  ORDER_NOT_FOUND: "Đơn hàng không tồn tại trong hệ thống Bán hàng",
  INVALID_DEBIT_ACC: "TK Nợ phải là 111 (Tiền mặt) hoặc 112 (Tiền gửi NH)",
  INVALID_CREDIT_ACC: "TK Có phải là 131 (Phải thu khách hàng)",
  INVALID_AMOUNT: "Số tiền thu phải lớn hơn 0",
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

/**
 * Hàm hỗ trợ ghép nối dữ liệu (Data Enrichment)
 * Lấy danh sách phiếu thu thô -> Gọi API Sales lấy tên KH/Đơn hàng -> Gộp lại
 */
const enrichReceipts = async (receipts) => {
  if (!receipts || receipts.length === 0) return [];

  try {
    // 1. Lấy danh sách Khách hàng & Đơn hàng từ Sales DB (Port 3004)
    // Lưu ý: Trong thực tế nên dùng API getByIds hoặc cache, ở đây fetch all cho demo json-server
    const [customersRes, ordersRes] = await Promise.all([
      fetch(ENDPOINTS.CUSTOMERS),
      fetch(ENDPOINTS.ORDERS)
    ]);

    const customers = await handleResponse(customersRes) || [];
    const orders = await handleResponse(ordersRes) || [];

    // 2. Tạo Map để tra cứu nhanh (O(1))
    const customerMap = new Map(customers.map(c => [c.id, c]));
    const orderMap = new Map(orders.map(o => [o.id, o]));

    // 3. Map dữ liệu vào phiếu thu
    return receipts.map(receipt => {
      const customer = customerMap.get(receipt.customer_id);
      const order = orderMap.get(receipt.order_reference_id);

      return {
        ...receipt,
        // Thêm trường hiển thị (Display Fields)
        customer_name: customer ? customer.full_name : receipt.customer_id, // Nếu không tìm thấy thì fallback về ID
        customer_phone: customer ? customer.phone : "",
        order_info: order ? `Đơn #${order.id} (${order.order_status})` : receipt.order_reference_id
      };
    });

  } catch (error) {
    console.warn("Lỗi khi enrich dữ liệu tham chiếu:", error);
    // Nếu lỗi kết nối sang Sales DB, vẫn trả về dữ liệu gốc (chấp nhận hiển thị ID)
    return receipts;
  }
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data) {
    // 1. Validate Số tiền
    if (!data.amount || Number(data.amount) <= 0) {
      throw new Error(ERROR_MSGS.INVALID_AMOUNT);
    }

    // 2. Validate TK Nợ (111 hoặc 112)
    if (![ACCOUNT_CODES.CASH, ACCOUNT_CODES.BANK].includes(data.debit_account_code)) {
      throw new Error(ERROR_MSGS.INVALID_DEBIT_ACC);
    }

    // 3. Validate TK Có (131)
    if (data.credit_account_code !== ACCOUNT_CODES.RECEIVABLE) {
      throw new Error(ERROR_MSGS.INVALID_CREDIT_ACC);
    }

    // 4. Validate Khách hàng (Sales DB)
    if (data.customer_id) {
      try {
        const res = await fetch(`${ENDPOINTS.CUSTOMERS}/${data.customer_id}`);
        if (!res.ok) throw new Error();
      } catch {
        throw new Error(ERROR_MSGS.CUSTOMER_NOT_FOUND);
      }
    }

    // 5. Validate Đơn hàng (Sales DB)
    if (data.order_id) {
      try {
        const res = await fetch(`${ENDPOINTS.ORDERS}/${data.order_id}`);
        if (!res.ok) throw new Error();
      } catch {
        throw new Error(ERROR_MSGS.ORDER_NOT_FOUND);
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const receiptService = {
  /**
   * Lấy danh sách phiếu thu
   * @param {Object} options - { includeDeleted: boolean }
   */
  async getAll({ includeDeleted = false } = {}) {
    try {
      const response = await fetch(`${ENDPOINTS.RECEIPTS}?transaction_type=${TRANSACTION_TYPE.RECEIPT}`);
      const data = await handleResponse(response);

      // Sắp xếp trước
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      // Lọc dữ liệu thô
      const filteredData = includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deleted_at));

      // Gọi hàm enrich để lấy tên Khách hàng/Đơn hàng
      return await enrichReceipts(filteredData);

    } catch (error) {
      console.error("Lỗi lấy danh sách phiếu thu:", error);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${ENDPOINTS.RECEIPTS}/${id}`);
      const data = await handleResponse(response);
      
      if (!data) return null;

      // Enrich cho 1 item (đưa vào mảng rồi lấy phần tử đầu tiên)
      const enrichedList = await enrichReceipts([data]);
      return enrichedList[0];

    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async checkIdExists(id) {
    const item = await this.getById(id);
    return !!item;
  },

  /**
   * Lấy danh sách ID các Đơn hàng đã được lập phiếu thu
   * @param {string} excludeReceiptId - ID của phiếu thu hiện tại (nếu đang Edit) để ngoại trừ
   */
  async getPaidOrderIds(excludeReceiptId = null) {
    try {
      // 1. Lấy tất cả phiếu thu
      const response = await fetch(`${ENDPOINTS.RECEIPTS}?transaction_type=${TRANSACTION_TYPE.RECEIPT}`);
      const allReceipts = await handleResponse(response);

      if (!Array.isArray(allReceipts)) return [];

      const paidOrderIds = new Set();

      allReceipts.forEach(receipt => {
        // Bỏ qua phiếu đã xóa mềm
        if (isSoftDeleted(receipt.deleted_at)) return;

        // Bỏ qua chính phiếu đang sửa (để ID đơn hàng hiện tại không bị coi là "đã dùng")
        if (excludeReceiptId && String(receipt.id) === String(excludeReceiptId)) return;

        // Lưu order_reference_id vào Set
        if (receipt.order_reference_id) {
            paidOrderIds.add(String(receipt.order_reference_id));
        }
      });

      return Array.from(paidOrderIds);
    } catch (error) {
      console.error("Lỗi lấy danh sách đơn hàng đã thanh toán:", error);
      return [];
    }
  },

  async create(data) {
    // 1. Check trùng ID
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    // 2. Validate nghiệp vụ
    await validators.checkBusinessRules(data);

    // 3. Tự động xác định phương thức thanh toán dựa trên TK Nợ
    const paymentMethod = data.debit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;

    const newReceipt = {
      id: data.id,
      transaction_type: TRANSACTION_TYPE.RECEIPT,
      amount: Number(data.amount),
      payment_method: paymentMethod,
      
      // Tham chiếu Sales DB
      customer_id: data.customer_id,
      order_reference_id: data.order_id,
      
      // Định khoản
      debit_account_code: data.debit_account_code,
      credit_account_code: data.credit_account_code,
      
      // Metadata
      bank_account_number: data.bank_account_number || null,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null // Mặc định chưa xóa
    };

    const response = await fetch(ENDPOINTS.RECEIPTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReceipt),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Merge data để validate
    const mergeData = { ...current, ...data };
    await validators.checkBusinessRules(mergeData);

    // Cập nhật lại payment method nếu TK nợ thay đổi
    let paymentMethod = current.payment_method;
    if (data.debit_account_code) {
       paymentMethod = data.debit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;
    }

    const updatedReceipt = {
      ...current,
      ...data,
      payment_method: paymentMethod,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${ENDPOINTS.RECEIPTS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedReceipt),
    });

    return handleResponse(response);
  },

  /**
   * Xóa mềm (Soft Delete)
   * Đánh dấu bản ghi là đã xóa bằng cách set deleted_at
   */
  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deleted_at: now,
      updated_at: now,
    };

    const response = await fetch(`${ENDPOINTS.RECEIPTS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  /**
   * Khôi phục (Restore)
   * Khôi phục bản ghi đã xóa mềm
   */
  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Có thể validate lại logic nếu cần thiết tại đây
    // Ví dụ: kiểm tra xem khách hàng/đơn hàng liên quan có còn tồn tại không
    
    const restoreData = {
      ...current,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${ENDPOINTS.RECEIPTS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  /**
   * Xóa cứng (Hard Delete / Destroy)
   * Xóa vĩnh viễn khỏi Database
   */
  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${ENDPOINTS.RECEIPTS}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};