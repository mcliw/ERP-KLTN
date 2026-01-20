// apps/frontend/erp-portal/src/modules/sales/services/order.service.js

/* =========================
 * Config & Constants
 * ========================= */
const BASE_URL = "http://localhost:3004";
const API_URL_ORDERS = `${BASE_URL}/orders`;
const API_URL_DETAILS = `${BASE_URL}/order_details`;

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
 * Helpers
 * ========================= */
const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

/* =========================
 * Main Service
 * ========================= */
export const orderService = {
  
  /**
   * Lấy danh sách đơn hàng
   * (Đã bỏ logic lọc deleted_at/trashed)
   */
  async getAll(params = {}) {
    try {
      const url = new URL(API_URL_ORDERS);
      
      if (params.status) {
        url.searchParams.append("order_status", params.status);
      }
      
      if (params.customer_id) {
        url.searchParams.append("customer_id", params.customer_id);
      }

      const response = await fetch(url.toString());
      const data = await handleResponse(response);

      // Sắp xếp theo mới nhất (created_at)
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

  /**
   * Lấy chi tiết đơn hàng
   */
  async getById(id) {
    try {
      const orderResponse = await fetch(`${API_URL_ORDERS}/${id}`);
      const orderData = await handleResponse(orderResponse);

      if (!orderData) return null;

      const detailsResponse = await fetch(`${API_URL_DETAILS}?order_id=${id}`);
      const detailsData = await handleResponse(detailsResponse);

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
    const response = await fetch(`${API_URL_ORDERS}/${id}`);
    return response.ok; 
  },

  /**
   * Tạo đơn hàng mới
   */
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
      // Đã bỏ trường deleted_at
    };

    const orderRes = await fetch(API_URL_ORDERS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    });
    const createdOrder = await handleResponse(orderRes);

    if (data.items && Array.isArray(data.items)) {
      const detailPromises = data.items.map(item => {
        const detailItem = {
          order_id: String(createdOrder.id), 
          product_variant_id: String(item.product_variant_id),
          quantity: Number(item.quantity),
          price: Number(item.price) 
        };
        return fetch(API_URL_DETAILS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailItem)
        });
      });
      
      await Promise.all(detailPromises);
    }

    return createdOrder;
  },

  /**
   * Cập nhật trạng thái đơn hàng (Duyệt/Giao)
   * (Đã bỏ validators.checkBusinessRules để tránh lỗi logic khi update)
   */
  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updatedOrder = {
      ...current,
      ...data, // Chỉ merge data mới (thường là status)
      items: undefined, // Không update items ở đây
      updated_at: new Date().toISOString(),
    };

    delete updatedOrder.items; 

    const response = await fetch(`${API_URL_ORDERS}/${id}`, {
      method: "PATCH", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedOrder),
    });

    return handleResponse(response);
  },

  /**
   * Hủy đơn hàng (Cancel)
   */
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

    const response = await fetch(`${API_URL_ORDERS}/${id}`, {
      method: "PUT", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cancelData),
    });
    return handleResponse(response);
  },

  CONSTANTS: {
      STATUS,
      STATUS_LABEL
  }
};