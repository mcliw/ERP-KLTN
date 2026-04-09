// apps/frontend/erp-portal/src/modules/sales/services/order.service.js

import { axiosClient } from "../../../services/axiosClient";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL_ORDERS = "/sales/orders";
const API_URL_DETAILS = "/sales/order_details";

const STATUS = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SHIPPING: "SHIPPING"
};

const STATUS_LABEL = {
  [STATUS.PENDING]: "Chờ xử lý",
  [STATUS.COMPLETED]: "Hoàn thành",
  [STATUS.CANCELLED]: "Đã hủy",
  [STATUS.SHIPPING]: "Đang giao",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ Sales",
  NOT_FOUND: "Không tìm thấy đơn hàng",
  EXISTS: "Mã đơn hàng đã tồn tại",
  CREATE_FAILED: "Không thể tạo đơn hàng",
  UPDATE_FAILED: "Không thể cập nhật trạng thái",
};

/* =========================
 * Main Service
 * ========================= */
export const orderService = {
  
  async getAll(params = {}) {
    try {
      // Xây dựng params cho axios
      const queryParams = {};
      if (params.status) queryParams.order_status = params.status;
      if (params.customer_id) queryParams.customer_id = params.customer_id;

      const data = await axiosClient.get(API_URL_ORDERS, { params: queryParams });

      return (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        return tb - ta;
      });

    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const orderData = await axiosClient.get(`${API_URL_ORDERS}/${id}`);

      if (!orderData) return null;

      // Lấy chi tiết đơn hàng
      const detailsData = await axiosClient.get(API_URL_DETAILS, {
        params: { order_id: id }
      });

      return {
        ...orderData,
        items: detailsData || [] 
      };

    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async checkIdExists(id) {
    try {
      await axiosClient.get(`${API_URL_ORDERS}/${id}`);
      return true;
    } catch (error) {
      return false;
    }
  },

  async create(data) {
    if (data.id) {
        const exists = await this.checkIdExists(data.id);
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    const now = new Date().toISOString();

    const newOrder = {
      id: data.id ? String(data.id) : undefined,
      customer_id: String(data.customer_id), 
      voucher_detail_id: data.voucher_detail_id ? String(data.voucher_detail_id) : null,
      payment_id: String(data.payment_id),
      order_status: STATUS.PENDING, 
      payment_method: data.payment_method,
      shipping_address: data.shipping_address,
      created_at: now,
      updated_at: now,
    };

    const createdOrder = await axiosClient.post(API_URL_ORDERS, newOrder);

    if (data.items && Array.isArray(data.items)) {
      const detailPromises = data.items.map(item => {
        const detailItem = {
          order_id: String(createdOrder.id), 
          product_variant_id: String(item.product_variant_id),
          quantity: Number(item.quantity),
          price: Number(item.price) 
        };
        return axiosClient.post(API_URL_DETAILS, detailItem);
      });
      
      await Promise.all(detailPromises);
    }

    return createdOrder;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updatedOrder = {
      ...current,
      ...data,
      items: undefined,
      updated_at: new Date().toISOString(),
    };

    delete updatedOrder.items; 

    // Dùng PATCH để update một phần dữ liệu
    return await axiosClient.patch(`${API_URL_ORDERS}/${id}`, updatedOrder);
  },

  async cancel(id, reason = "") {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (current.order_status === STATUS.COMPLETED) {
        throw new Error("Không thể hủy đơn hàng đã hoàn thành");
    }

    const cancelData = {
      ...current,
      order_status: STATUS.CANCELLED,
      cancel_reason: reason, 
      updated_at: new Date().toISOString(),
    };
    
    delete cancelData.items;

    // Dùng PUT để replace trạng thái hủy (theo code cũ)
    return await axiosClient.put(`${API_URL_ORDERS}/${id}`, cancelData);
  },

  CONSTANTS: {
      STATUS,
      STATUS_LABEL
  }
};