// apps/frontend/erp-portal/src/modules/purchasing/services/paymentSlip.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const FA_API_URL = "/accounting";
const SC_API_URL = "/supply-chain";

const ENDPOINTS = {
  PAYMENTS: `${FA_API_URL}/cash_transactions`,
  SUPPLIERS: `${SC_API_URL}/suppliers`,
  PURCHASE_ORDERS: `${SC_API_URL}/purchase_orders`,
};

const TRANSACTION_TYPE = {
  PAYMENT: "PAYMENT",
};

const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
};

const ACCOUNT_CODES = {
  CASH: "111",
  BANK: "112",
  PAYABLE: "331",
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

/**
 * Hàm làm giàu dữ liệu (Enrichment)
 */
const enrichPaymentSlips = async (slips) => {
  if (!slips || slips.length === 0) return [];

  try {
    const [suppliers, purchaseOrders] = await Promise.all([
      axiosClient.get(ENDPOINTS.SUPPLIERS).catch(() => []),
      axiosClient.get(ENDPOINTS.PURCHASE_ORDERS).catch(() => [])
    ]);

    const supplierMap = new Map((Array.isArray(suppliers) ? suppliers : []).map(s => [s.id, s]));
    const poMap = new Map((Array.isArray(purchaseOrders) ? purchaseOrders : []).map(p => [p.id, p]));

    return slips.map(slip => {
      const supplier = supplierMap.get(slip.partner_id);
      
      let poInfo = [];
      if (slip.order_reference_ids) {
          const poIds = Array.isArray(slip.order_reference_ids) 
            ? slip.order_reference_ids 
            : [slip.order_reference_ids];

          poInfo = poIds.map(id => {
              const po = poMap.get(id);
              return po ? { id: po.id, code: po.po_code, total: po.total_amount } : { id, code: id };
          });
      }

      return {
        ...slip,
        supplier_name: supplier ? supplier.name : slip.partner_id,
        supplier_code: supplier ? supplier.code : "",
        purchase_orders_info: poInfo
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
    if (!data.amount || Number(data.amount) <= 0) {
      throw new Error(ERROR_MSGS.INVALID_AMOUNT);
    }

    if (data.debit_account_code !== ACCOUNT_CODES.PAYABLE) {
      throw new Error(ERROR_MSGS.INVALID_DEBIT_ACC);
    }

    if (![ACCOUNT_CODES.CASH, ACCOUNT_CODES.BANK].includes(data.credit_account_code)) {
      throw new Error(ERROR_MSGS.INVALID_CREDIT_ACC);
    }

    // 4. Validate Nhà cung cấp
    if (data.supplier_id) {
      try {
        await axiosClient.get(`${ENDPOINTS.SUPPLIERS}/${data.supplier_id}`);
      } catch (e) {
        throw new Error(ERROR_MSGS.SUPPLIER_NOT_FOUND);
      }
    }

    // 5. Validate Danh sách Đơn mua hàng
    if (data.purchase_order_ids && Array.isArray(data.purchase_order_ids)) {
       const checkPromises = data.purchase_order_ids.map(id => 
           axiosClient.get(`${ENDPOINTS.PURCHASE_ORDERS}/${id}`).catch(() => {
               throw new Error(`PO ${id} error`);
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
  
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(`${ENDPOINTS.PAYMENTS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

      const filteredData = includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deleted_at));

      return await enrichPaymentSlips(filteredData);

    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const data = await axiosClient.get(`${ENDPOINTS.PAYMENTS}/${id}`);
      
      if (!data) return null;

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

  async getPaidPurchaseOrderIds(excludeSlipId = null) {
    try {
      const allSlips = await axiosClient.get(`${ENDPOINTS.PAYMENTS}?transaction_type=${TRANSACTION_TYPE.PAYMENT}`);

      if (!Array.isArray(allSlips)) return [];

      const paidPoIds = new Set();

      allSlips.forEach(slip => {
        if (isSoftDeleted(slip.deleted_at)) return;
        if (excludeSlipId && String(slip.id) === String(excludeSlipId)) return;

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

  async create(data) {
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    await validators.checkBusinessRules(data);

    const paymentMethod = 
      data.credit_account_code === ACCOUNT_CODES.CASH 
        ? PAYMENT_METHODS.CASH 
        : PAYMENT_METHODS.BANK_TRANSFER;

    const newPayment = {
      id: data.id,
      transaction_type: TRANSACTION_TYPE.PAYMENT,
      amount: Number(data.amount),
      payment_method: paymentMethod,
      partner_id: data.supplier_id,
      order_reference_ids: data.purchase_order_ids,
      debit_account_code: data.debit_account_code,
      credit_account_code: data.credit_account_code,
      description: data.description,
      bank_account_number: data.bank_account_number || null,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null
    };

    return await axiosClient.post(ENDPOINTS.PAYMENTS, newPayment);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const mergeData = { ...current, ...data };
    await validators.checkBusinessRules(mergeData);

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

    return await axiosClient.put(`${ENDPOINTS.PAYMENTS}/${id}`, updatedPayment);
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

    return await axiosClient.put(`${ENDPOINTS.PAYMENTS}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    return await axiosClient.put(`${ENDPOINTS.PAYMENTS}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${ENDPOINTS.PAYMENTS}/${id}`);
  },
};