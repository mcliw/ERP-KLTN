// apps/frontend/erp-portal/src/modules/sales/services/voucher.service.js

/* =========================
 * Config & Constants
 * ========================= */
// Giả định service chạy port 3004
const BASE_URL = "http://localhost:3004";
const API_URL = `${BASE_URL}/vouchers`;
const API_URL_DETAILS = `${BASE_URL}/voucher_details`;
const API_URL_CONSTRAINTS = `${BASE_URL}/voucher_constraints`;

// Map trạng thái để thống nhất với UI (mặc dù DB lưu boolean)
const STATUS = {
  ACTIVE: "ACTIVE",   // Tương ứng is_active = true
  INACTIVE: "INACTIVE" // Tương ứng is_active = false
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy voucher",
  EXISTS: "ID voucher đã tồn tại",
  CODE_EXISTS: "Mã giảm giá (Code) đã tồn tại trong hệ thống",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

// Helper chuyển đổi status từ Boolean (DB) sang String (UI) và ngược lại
const mapStatusToBoolean = (status) => status === STATUS.ACTIVE;
const mapBooleanToStatus = (bool) => (bool ? STATUS.ACTIVE : STATUS.INACTIVE);

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
  /**
   * Kiểm tra các quy tắc nghiệp vụ
   * @param {Object} data - Dữ liệu voucher
   * @param {string|null} currentId - ID hiện tại (nếu đang update)
   */
  async checkBusinessRules(data, currentId = null) {
    // 1) Check Duplicate Code (Mã Code trong voucher_details phải duy nhất)
    // Lưu ý: data ở đây có thể là voucher cha, nhưng nếu form tạo cả code, ta cần check code đó.
    if (data.code) {
      try {
        // Gọi API vào bảng voucher_details để check code
        const response = await fetch(`${API_URL_DETAILS}?code=${data.code}`);
        const result = await handleResponse(response);

        // Nếu tìm thấy mảng > 0 phần tử
        if (Array.isArray(result) && result.length > 0) {
          const existingItem = result[0];
          // Logic: Code là duy nhất toàn hệ thống, không phụ thuộc vào voucher cha
          // Nếu đang update voucher_detail (logic mở rộng) hoặc tạo mới
          if (!currentId || existingItem.voucher_id !== currentId) { 
             // Note: Logic check ID này tương đối, tuỳ thuộc vào việc UI gửi voucher_id hay detail_id
             // Ở đây assume check chặt: Cứ trùng code là báo lỗi.
             throw new Error(ERROR_MSGS.CODE_EXISTS);
          }
        }
      } catch (e) {
        if (e.message === ERROR_MSGS.CODE_EXISTS) throw e;
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const voucherService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      // Sử dụng _embed để join dữ liệu từ bảng constraints và details (tính năng của json-server)
      const response = await fetch(`${API_URL}?_embed=voucher_constraints&_embed=voucher_details`);
      const data = await handleResponse(response);

      // Sắp xếp theo mới nhất (ưu tiên created_at nếu có, không thì id)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        // Nếu không có created_at, sort theo ID giảm dần (giả lập mới nhất)
        if (ta === 0 && tb === 0) return Number(b.id) - Number(a.id);
        return tb - ta;
      });

      // Map field is_active -> status cho UI dễ dùng
      const mappedData = sortedData.map(item => ({
        ...item,
        status: mapBooleanToStatus(item.is_active)
      }));

      return includeDeleted
        ? mappedData
        : mappedData.filter((item) => !isSoftDeleted(item?.deleted_at));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      // Lấy chi tiết voucher kèm constraints và details
      const response = await fetch(`${API_URL}/${id}?_embed=voucher_constraints&_embed=voucher_details`);
      const data = await handleResponse(response);
      if (data) {
        return {
          ...data,
          status: mapBooleanToStatus(data.is_active)
        };
      }
      return null;
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async checkIdExists(id) {
    // Chỉ cần check head request hoặc get đơn giản
    const response = await fetch(`${API_URL}/${id}`);
    return response.ok; 
  },

  async create(data) {
    // 1. Validate Business Rules (Check trùng Code)
    // Lấy mã code từ payload gửi lên (do logic transform ở VoucherCreate)
    const inputCode = data.voucher_details?.[0]?.code;
    if (inputCode) {
        await validators.checkBusinessRules({ code: inputCode });
    }

    const voucherPayload = {
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      is_active: data.is_active,
      created_at: new Date().toISOString(),
      updated_at: null,
      deleted_at: null,
    };

    const voucherResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(voucherPayload),
    });
    const newVoucher = await handleResponse(voucherResponse);

    if (!newVoucher || !newVoucher.id) {
      throw new Error("Không thể tạo Voucher");
    }

    try {
      // 2. Tạo Detail (SỬA Ở ĐÂY: Đổi voucher_id thành voucherId)
      if (data.voucher_details && data.voucher_details.length > 0) {
        const detailPayload = {
          ...data.voucher_details[0],
          
          // QUAN TRỌNG: json-server yêu cầu format "tên_bảng_số_ít + Id" 
          // để tính năng _embed hoạt động tự động.
          voucherId: newVoucher.id, // <-- Đổi từ voucher_id thành voucherId
          
          // Nếu bạn muốn giữ cả 2 format để tương thích SQL sau này thì để cả 2:
          // voucher_id: newVoucher.id, 
          
          is_active: true
        };
        
        await fetch(API_URL_DETAILS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(detailPayload),
        });
      }

      // 3. Tạo Constraint (SỬA Ở ĐÂY: Đổi voucher_id thành voucherId)
      if (data.voucher_constraints && data.voucher_constraints.length > 0) {
        const constraintPayload = {
          ...data.voucher_constraints[0],
          voucherId: newVoucher.id, // <-- Đổi từ voucher_id thành voucherId
        };

        await fetch(API_URL_CONSTRAINTS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(constraintPayload),
        });
      }

      return newVoucher;

    } catch (error) {
      console.error("Lỗi tạo dữ liệu con", error);
      await this.destroy(newVoucher.id); 
      throw error;
    }
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Validate logic nếu cần (ví dụ không cho sửa loại voucher nếu đã có đơn hàng sử dụng - logic phức tạp)

    const updatedVoucher = {
      ...current,
      ...data,
      is_active: data.status ? mapStatusToBoolean(data.status) : current.is_active,
      updated_at: new Date().toISOString(),
    };

    // Loại bỏ các trường join (_embed) trước khi gửi PUT để tránh lỗi dư dữ liệu
    delete updatedVoucher.voucher_constraints;
    delete updatedVoucher.voucher_details;
    delete updatedVoucher.status; // Xóa field ảo status

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedVoucher),
    });

    return handleResponse(response);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    
    // Soft delete: set is_active = false và điền deleted_at
    const softDeleteData = {
      ...current,
      is_active: false,
      deleted_at: now,
      updated_at: now,
    };
    
    // Clean up join fields
    delete softDeleteData.voucher_constraints;
    delete softDeleteData.voucher_details;
    delete softDeleteData.status;

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
      is_active: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    delete restoreData.voucher_constraints;
    delete restoreData.voucher_details;
    delete restoreData.status;

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

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};