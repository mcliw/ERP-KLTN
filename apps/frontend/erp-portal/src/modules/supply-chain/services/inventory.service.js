// apps/frontend/erp-portal/src/modules/supply-chain/services/inventory.service.js

/* =========================
 * Config & Constants
 * ========================= */
const BASE_URL = "http://localhost:3002";
const API_URL = `${BASE_URL}/current_stock`;
const TRANSACTION_API_URL = `${BASE_URL}/inventory_transaction_logs`;
const BIN_API_URL = `${BASE_URL}/bin_locations`;

export const TRANSACTION_TYPES = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
  ADJUSTMENT: "ADJUSTMENT",
  TRANSFER: "TRANSFER",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy dữ liệu tồn kho",
  EXISTS: "Sản phẩm đã tồn tại trong vị trí kho này",
  ID_EXISTS: "ID bản ghi đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu tồn kho",
  REQUIRED_FIELDS: "Vui lòng nhập đầy đủ Kho, Vị trí và Sản phẩm",
  NEGATIVE_QTY: "Số lượng không thể âm",
  HAS_STOCK: "Không thể xóa khi vẫn còn tồn kho (On Hand > 0)",
  CAPACITY_EXCEEDED: "Số lượng khả dụng vượt quá sức chứa tối đa của vị trí này",
};

/* =========================
 * Helpers
 * ========================= */
// Kiểm tra xem trường deletedAt có giá trị không (Soft delete)
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

const calculateAvailable = (onHand, allocated) => {
  const available = Number(onHand || 0) - Number(allocated || 0);
  return available < 0 ? 0 : available;
};

const createTransactionLog = async (logData) => {
  try {
    const logEntry = {
      ...logData,
      id: String(Date.now()), // Tự sinh ID giả lập
      transaction_date: new Date().toISOString(),
      performed_by: 1, // Giả định ID user đang login là 1 (Cần lấy từ AuthContext thực tế)
    };

    await fetch(TRANSACTION_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logEntry),
    });
  } catch (error) {
    console.error("Lỗi ghi log giao dịch:", error);
    // Lưu ý: Trong thực tế, nếu ghi log lỗi thì nên rollback transaction
  }
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkStockUnique(warehouseId, binId, productId, currentId = null) {
    if (!warehouseId || !binId || !productId) {
      throw new Error(ERROR_MSGS.REQUIRED_FIELDS);
    }
    const query = new URLSearchParams({
      warehouse_id: warehouseId,
      bin_id: binId,
      product_id: productId,
    }).toString();

    try {
      const response = await fetch(`${API_URL}?${query}`);
      const data = await handleResponse(response);

      if (Array.isArray(data) && data.length > 0) {
        // Nếu tìm thấy record trùng, check xem có phải chính nó không
        const exists = data.some((item) => String(item.id) !== String(currentId));
        // Nếu record trùng đó ĐÃ BỊ XÓA MỀM, ta vẫn coi là conflict (cần restore thay vì tạo mới)
        // Hoặc tùy nghiệp vụ, ở đây ta chặn luôn để user vào Restore.
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },

  async checkBinCapacity(binId, quantityAvailable) {
    if (!binId) return;

    try {
      // 1. Lấy thông tin Bin để xem max_capacity
      const response = await fetch(`${BIN_API_URL}/${binId}`);
      if (!response.ok) return; // Nếu không tìm thấy bin thì bỏ qua check (hoặc throw lỗi tùy logic)
      
      const binData = await response.json();
      const maxCapacity = Number(binData.max_capacity) || 0;

      // 2. Kiểm tra logic
      // Nếu max_capacity = 0 nghĩa là không giới hạn (tùy quy ước, ở đây giả sử > 0 mới check)
      if (maxCapacity > 0 && Number(quantityAvailable) > maxCapacity) {
         throw new Error(ERROR_MSGS.CAPACITY_EXCEEDED);
      }
    } catch (error) {
      // Ném lỗi ra ngoài để hàm create/update bắt được
      if (error.message === ERROR_MSGS.CAPACITY_EXCEEDED) throw error;
      console.error("Check capacity failed:", error); 
    }
  },

  validateQuantities(data) {
    if (data.quantity_on_hand < 0 || data.quantity_allocated < 0) {
      throw new Error(ERROR_MSGS.NEGATIVE_QTY);
    }
  },

  async checkBusinessRules(data, currentId = null) {
    // 1. Check trùng sản phẩm
    if (data.warehouse_id && data.bin_id && data.product_id) {
      await this.checkStockUnique(data.warehouse_id, data.bin_id, data.product_id, currentId);
    }
    
    // 2. Validate số âm
    this.validateQuantities(data);

    // 3. Check sức chứa vị trí
    // Chỉ check khi có bin_id và quantity_available
    if (data.bin_id && data.quantity_available !== undefined) {
        await this.checkBinCapacity(data.bin_id, data.quantity_available);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const inventoryService = {
  async getAll({ warehouseId = null, productId = null, includeDeleted = false } = {}) {
    try {
      let url = API_URL;
      const params = [];
      if (warehouseId) params.push(`warehouse_id=${warehouseId}`);
      if (productId) params.push(`product_id=${productId}`);
      
      if (params.length > 0) url += `?${params.join("&")}`;

      const response = await fetch(url);
      const data = await handleResponse(response);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.updatedAt || 0).getTime();
        const tb = new Date(b?.updatedAt || 0).getTime();
        return tb - ta;
      });

      // Lọc Soft Delete
      return includeDeleted 
        ? sortedData 
        : sortedData.filter((item) => !isSoftDeleted(item?.deletedAt));

    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      return await handleResponse(response);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async checkIdExists(id) {
    const item = await this.getById(id);
    return !!item;
  },

  async create(data) {
    if (data.id) {
      const exists = await this.checkIdExists(data.id);
      if (exists) throw new Error(ERROR_MSGS.ID_EXISTS);
    }

    const payload = { ...data };
    payload.quantity_available = calculateAvailable(payload.quantity_on_hand, payload.quantity_allocated);

    await validators.checkBusinessRules(payload);

    const newStock = {
      ...payload,
      updatedAt: new Date().toISOString(),
      deletedAt: null, // Mặc định chưa xóa
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStock),
    });

    const createdStock = await handleResponse(response);

    // Chỉ ghi log nếu số lượng > 0
    if (payload.quantity_on_hand > 0) {
        await createTransactionLog({
            type: TRANSACTION_TYPES.INBOUND,
            warehouse_id: createdStock.warehouse_id,
            product_id: createdStock.product_id,
            bin_id: createdStock.bin_id,
            quantity_change: Number(payload.quantity_on_hand),
            reference_code: `INIT-${createdStock.id}`, // Mã tham chiếu tự sinh
        });
    }

    return createdStock;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const mergedData = { ...current, ...data };

    mergedData.quantity_available = calculateAvailable(mergedData.quantity_on_hand, mergedData.quantity_allocated);

    await validators.checkBusinessRules(mergedData, id);
    
    if (
      mergedData.warehouse_id !== current.warehouse_id ||
      mergedData.bin_id !== current.bin_id ||
      mergedData.product_id !== current.product_id
    ) {
      await validators.checkBusinessRules(mergedData, id);
    } else {
        validators.validateQuantities(mergedData);
        if (mergedData.bin_id) {
             await validators.checkBinCapacity(mergedData.bin_id, mergedData.quantity_available);
        }
    }

    const updatedStock = {
      ...mergedData,
      quantity_available: calculateAvailable(mergedData.quantity_on_hand, mergedData.quantity_allocated),
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedStock),
    });

    const result = await handleResponse(response);

    // So sánh số lượng cũ và mới (On Hand)
    const oldQty = Number(current.quantity_on_hand) || 0;
    const newQty = Number(mergedData.quantity_on_hand) || 0;
    const diff = newQty - oldQty;

    // Nếu có sự thay đổi số lượng thực tế
    if (diff !== 0) {
        await createTransactionLog({
            type: TRANSACTION_TYPES.ADJUSTMENT, // Hoặc tách ra AUDIT, COUNT
            warehouse_id: current.warehouse_id,
            product_id: current.product_id,
            bin_id: current.bin_id,
            quantity_change: diff, // Số âm nếu giảm, dương nếu tăng
            // Nếu form có gửi notes thì dùng, không thì tự sinh mã
            reference_code: data.notes ? "MANUAL-ADJ" : `ADJ-${id}-${Date.now()}`,
        });
    }

    return result;
  },

  // 1. Soft Delete (Xóa mềm)
  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Business Rule: Không cho phép xóa (dù là xóa mềm) nếu vẫn còn hàng tồn
    if (current.quantity_on_hand > 0) {
        throw new Error(ERROR_MSGS.HAS_STOCK);
    }

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,      // Đánh dấu đã xóa
      updatedAt: now,
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  // 2. Restore (Khôi phục)
  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Kiểm tra xem vị trí này đã bị chiếm dụng bởi 1 record mới chưa?
    // Nếu có, cần xử lý conflict (ở đây tạm bỏ qua hoặc báo lỗi)
    await validators.checkStockUnique(current.warehouse_id, current.bin_id, current.product_id, id);

    const restoreData = {
      ...current,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  // 3. Hard Delete (Xóa vĩnh viễn - Dùng trong trang Restore)
  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },

  async getTransactionHistory({ warehouseId, productId, binId } = {}) {
    try {
        const params = new URLSearchParams();
        if (warehouseId) params.append("warehouse_id", warehouseId);
        if (productId) params.append("product_id", productId);
        if (binId) params.append("bin_id", binId);

        const response = await fetch(`${TRANSACTION_API_URL}?${params.toString()}`);
        const data = await handleResponse(response);
        
        // Sắp xếp mới nhất lên đầu
        return (Array.isArray(data) ? data : []).sort((a, b) => {
            return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
        });
    } catch (error) {
        console.error("Failed to fetch transactions", error);
        return [];
    }
  }
};