// apps/frontend/erp-portal/src/modules/purchasing/services/paymentSlip.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Service Tài chính (FA) chạy port 3003 - Nơi lưu trữ phiếu chi
const FA_API_URL = "http://localhost:3003";

// Service Chuỗi cung ứng (SC) chạy port 3002 - Nơi tham chiếu NCC/Đơn mua
const SC_API_URL = "http://localhost:3002";

const ENDPOINTS = {
  PAYMENTS: `${FA_API_URL}/cash_transactions`, // Bảng giao dịch tiền
  SUPPLIERS: `${SC_API_URL}/suppliers`,        // Bảng nhà cung cấp
  PURCHASE_ORDERS: `${SC_API_URL}/purchase_orders`, // Bảng đơn mua hàng
};

const TRANSACTION_TYPE = {
  PAYMENT: "PAYMENT", // Phiếu chi
};

const PAYMENT_METHODS = {
  CASH: "CASH",           // Tiền mặt
  BANK_TRANSFER: "BANK_TRANSFER", // Chuyển khoản
};

const ACCOUNT_CODES = {
  CASH: "111",      // Tiền mặt
  BANK: "112",      // Tiền gửi NH
  PAYABLE: "331",   // Phải trả người bán
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy phiếu chi",
  EXISTS: "Số phiếu chi (ID) đã tồn tại",
  SUPPLIER_NOT_FOUND: "Nhà cung cấp không tồn tại trong hệ thống Supply Chain",
  PO_NOT_FOUND: "Đơn mua hàng không tồn tại hoặc chưa được duyệt",
  INVALID_DEBIT_ACC: "Tài khoản Nợ phải là 331 (Phải trả người bán)",
  INVALID_CREDIT_ACC: "Tài khoản Có phải là 111 (Tiền mặt) hoặc 112 (Tiền gửi NH)",
  INVALID_AMOUNT: "Số tiền chi phải lớn hơn 0",
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
 * Hàm làm giàu dữ liệu (Enrichment)
 * Lấy thông tin chi tiết Nhà cung cấp và PO từ Port 3002
 */
const enrichPaymentSlips = async (slips) => {
  if (!slips || slips.length === 0) return [];

  try {
    // 1. Lấy danh sách NCC và PO từ Supply Chain DB
    const [suppliersRes, posRes] = await Promise.all([
      fetch(ENDPOINTS.SUPPLIERS),
      fetch(ENDPOINTS.PURCHASE_ORDERS)
    ]);

    const suppliers = await handleResponse(suppliersRes) || [];
    const purchaseOrders = await handleResponse(posRes) || [];

    // 2. Tạo Map để tra cứu nhanh
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));
    const poMap = new Map(purchaseOrders.map(p => [p.id, p]));

    // 3. Map dữ liệu vào phiếu chi
    return slips.map(slip => {
      const supplier = supplierMap.get(slip.partner_id);
      
      // Xử lý danh sách PO (Lưu dưới dạng mảng ID hoặc chuỗi cách nhau bởi dấu phẩy)
      let poInfo = [];
      if (slip.order_reference_ids) {
          const poIds = Array.isArray(slip.order_reference_ids) 
            ? slip.order_reference_ids 
            : [slip.order_reference_ids]; // Fallback nếu lưu 1 ID

          poInfo = poIds.map(id => {
              const po = poMap.get(id);
              return po ? { id: po.id, code: po.po_code, total: po.total_amount } : { id, code: id };
          });
      }

      return {
        ...slip,
        // Thêm trường hiển thị (Display Fields)
        supplier_name: supplier ? supplier.name : slip.partner_id,
        supplier_code: supplier ? supplier.code : "",
        purchase_orders_info: poInfo // Mảng chi tiết các đơn hàng
      };
    });

  } catch (error) {
    console.warn("Lỗi khi enrich dữ liệu Supply Chain:", error);
    return slips;
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

    // 2. Validate TK Nợ (Phải trả người bán - 331)
    // Lưu ý: Phiếu Chi thì Nợ 331, Có 111/112
    if (data.debit_account_code !== ACCOUNT_CODES.PAYABLE) {
      throw new Error(ERROR_MSGS.INVALID_DEBIT_ACC);
    }

    // 3. Validate TK Có (Tiền mặt/NH)
    if (![ACCOUNT_CODES.CASH, ACCOUNT_CODES.BANK].includes(data.credit_account_code)) {
      throw new Error(ERROR_MSGS.INVALID_CREDIT_ACC);
    }

    // 4. Validate Nhà cung cấp (Cross-check sang Supply Chain DB - Port 3002)
    if (data.supplier_id) {
      try {
        const response = await fetch(`${ENDPOINTS.SUPPLIERS}/${data.supplier_id}`);
        if (!response.ok) throw new Error();
      } catch (e) {
        throw new Error(ERROR_MSGS.SUPPLIER_NOT_FOUND);
      }
    }

    // 5. Validate Danh sách Đơn mua hàng (Cross-check sang Supply Chain DB - Port 3002)
    if (data.purchase_order_ids && Array.isArray(data.purchase_order_ids)) {
       // Kiểm tra từng PO
       const checkPromises = data.purchase_order_ids.map(id => 
           fetch(`${ENDPOINTS.PURCHASE_ORDERS}/${id}`).then(res => {
               if(!res.ok) throw new Error(`PO ${id} error`);
           })
       );
       
       try {
           await Promise.all(checkPromises);
       } catch (e) {
           throw new Error(ERROR_MSGS.PO_NOT_FOUND);
       }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const paymentSlipService = {
  
  /**
   * Lấy danh sách phiếu chi
   */
  async getAll({ includeDeleted = false } = {}) {
    try {
      // Lấy từ Financial DB (Port 3003)
      const response = await fetch(`${ENDPOINTS.PAYMENTS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);
      const data = await handleResponse(response);

      // Sắp xếp mới nhất
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      // Lọc xóa mềm
      const filteredData = includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deleted_at));

      // Enrich dữ liệu từ Supply Chain DB
      return await enrichPaymentSlips(filteredData);

    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${ENDPOINTS.PAYMENTS}/${id}`);
      const data = await handleResponse(response);
      
      if (!data) return null;

      // Enrich dữ liệu
      const enrichedList = await enrichPaymentSlips([data]);
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
   * Lấy danh sách ID các PO đã được lập phiếu chi (để loại trừ)
   * @param {string} excludeSlipId - ID của phiếu chi hiện tại (nếu đang Edit) để không loại trừ chính nó
   */
  async getPaidPurchaseOrderIds(excludeSlipId = null) {
    try {
      // 1. Lấy tất cả phiếu chi
      const response = await fetch(`${ENDPOINTS.PAYMENTS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);
      const allSlips = await handleResponse(response);

      if (!Array.isArray(allSlips)) return [];

      const paidPoIds = new Set();

      allSlips.forEach(slip => {
        // Bỏ qua phiếu đã xóa mềm
        if (isSoftDeleted(slip.deleted_at)) return;

        // Bỏ qua phiếu hiện tại (nếu đang Edit)
        if (excludeSlipId && String(slip.id) === String(excludeSlipId)) return;

        // Gom ID đơn hàng
        if (slip.order_reference_ids) {
            const ids = Array.isArray(slip.order_reference_ids) 
                ? slip.order_reference_ids 
                : [slip.order_reference_ids];
            
            ids.forEach(id => paidPoIds.add(String(id)));
        }
      });

      return Array.from(paidPoIds);
    } catch (error) {
      console.error("Lỗi lấy danh sách PO đã thanh toán:", error);
      return [];
    }
  },

  /**
   * Tạo phiếu chi mới
   * @param {Object} data 
   */
  async create(data) {
    // 1. Check ID trùng
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    // 2. Validate
    await validators.checkBusinessRules(data);

    // 3. Xác định Payment Method dựa trên TK Có
    const paymentMethod = 
      data.credit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;

    // 4. Construct Payload (Lưu vào Port 3003)
    const newPayment = {
      id: data.id, // Số phiếu chi
      transaction_type: TRANSACTION_TYPE.PAYMENT,
      amount: Number(data.amount),
      payment_method: paymentMethod,
      
      // Tham chiếu Supply Chain
      partner_id: data.supplier_id, // Lưu ID nhà cung cấp vào partner_id
      order_reference_ids: data.purchase_order_ids, // Lưu mảng ID đơn mua hàng
      
      // Định khoản
      debit_account_code: data.debit_account_code, // 331
      credit_account_code: data.credit_account_code, // 111 hoặc 112
      description: data.description,

      // Metadata
      bank_account_number: data.bank_account_number || null,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null
    };

    const response = await fetch(ENDPOINTS.PAYMENTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPayment),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const mergeData = { ...current, ...data };
    await validators.checkBusinessRules(mergeData);

    // Update payment method nếu TK Có thay đổi
    let paymentMethod = current.payment_method;
    if (data.credit_account_code) {
       paymentMethod = data.credit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;
    }

    const updatedPayment = {
      ...current,
      ...data,
      payment_method: paymentMethod,
      partner_id: data.supplier_id || current.partner_id,
      order_reference_ids: data.purchase_order_ids || current.order_reference_ids,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${ENDPOINTS.PAYMENTS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayment),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deleted_at: now,
      updated_at: now,
    };

    const response = await fetch(`${ENDPOINTS.PAYMENTS}/${id}`, {
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
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    const response = await fetch(`${ENDPOINTS.PAYMENTS}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${ENDPOINTS.PAYMENTS}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};