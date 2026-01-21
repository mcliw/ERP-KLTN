// apps/frontend/erp-portal/src/modules/sales/services/receipt.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const FA_API_URL = "/accounting";
const SALES_API_URL = "/sales";

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

/**
 * Hàm hỗ trợ ghép nối dữ liệu (Data Enrichment)
 */
const enrichReceipts = async (receipts) => {
  if (!receipts || receipts.length === 0) return [];

  try {
    // Gọi song song API Sales. Sử dụng catch(() => []) để nếu Sales service chết thì không crash trang Finance
    const [customers, orders] = await Promise.all([
      axiosClient.get(ENDPOINTS.CUSTOMERS).catch(() => []),
      axiosClient.get(ENDPOINTS.ORDERS).catch(() => [])
    ]);

    const customerMap = new Map((Array.isArray(customers) ? customers : []).map(c => [c.id, c]));
    const orderMap = new Map((Array.isArray(orders) ? orders : []).map(o => [o.id, o]));

    return receipts.map(receipt => {
      const customer = customerMap.get(receipt.customer_id);
      const order = orderMap.get(receipt.order_reference_id);

      return {
        ...receipt,
        customer_name: customer ? customer.full_name : receipt.customer_id,
        customer_phone: customer ? customer.phone : "",
        order_info: order ? `Đơn #${order.id} (${order.order_status})` : receipt.order_reference_id
      };
    });

  } catch (error) {
    console.warn("Lỗi khi enrich dữ liệu tham chiếu:", error);
    return receipts;
  }
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data) {
    if (!data.amount || Number(data.amount) <= 0) {
      throw new Error(ERROR_MSGS.INVALID_AMOUNT);
    }

    if (![ACCOUNT_CODES.CASH, ACCOUNT_CODES.BANK].includes(data.debit_account_code)) {
      throw new Error(ERROR_MSGS.INVALID_DEBIT_ACC);
    }

    if (data.credit_account_code !== ACCOUNT_CODES.RECEIVABLE) {
      throw new Error(ERROR_MSGS.INVALID_CREDIT_ACC);
    }

    // 4. Validate Khách hàng
    if (data.customer_id) {
      try {
        await axiosClient.get(`${ENDPOINTS.CUSTOMERS}/${data.customer_id}`);
      } catch {
        throw new Error(ERROR_MSGS.CUSTOMER_NOT_FOUND);
      }
    }

    // 5. Validate Đơn hàng
    if (data.order_id) {
      try {
        await axiosClient.get(`${ENDPOINTS.ORDERS}/${data.order_id}`);
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
  
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(`${ENDPOINTS.RECEIPTS}?transaction_type=${TRANSACTION_TYPE.RECEIPT}`);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      const filteredData = includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deleted_at));

      return await enrichReceipts(filteredData);

    } catch (error) {
      console.error("Lỗi lấy danh sách phiếu thu:", error);
      return [];
    }
  },

  async getById(id) {
    try {
      const data = await axiosClient.get(`${ENDPOINTS.RECEIPTS}/${id}`);
      
      if (!data) return null;

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

  async getPaidOrderIds(excludeReceiptId = null) {
    try {
      const allReceipts = await axiosClient.get(`${ENDPOINTS.RECEIPTS}?transaction_type=${TRANSACTION_TYPE.RECEIPT}`);

      if (!Array.isArray(allReceipts)) return [];

      const paidOrderIds = new Set();

      allReceipts.forEach(receipt => {
        if (isSoftDeleted(receipt.deleted_at)) return;
        if (excludeReceiptId && String(receipt.id) === String(excludeReceiptId)) return;

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
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    await validators.checkBusinessRules(data);

    const paymentMethod = data.debit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;

    const newReceipt = {
      id: data.id,
      transaction_type: TRANSACTION_TYPE.RECEIPT,
      amount: Number(data.amount),
      payment_method: paymentMethod,
      customer_id: data.customer_id,
      order_reference_id: data.order_id,
      debit_account_code: data.debit_account_code,
      credit_account_code: data.credit_account_code,
      bank_account_number: data.bank_account_number || null,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null
    };

    return await axiosClient.post(ENDPOINTS.RECEIPTS, newReceipt);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const mergeData = { ...current, ...data };
    await validators.checkBusinessRules(mergeData);

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

    return await axiosClient.put(`${ENDPOINTS.RECEIPTS}/${id}`, updatedReceipt);
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

    return await axiosClient.put(`${ENDPOINTS.RECEIPTS}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    return await axiosClient.put(`${ENDPOINTS.RECEIPTS}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${ENDPOINTS.RECEIPTS}/${id}`);
  },
};