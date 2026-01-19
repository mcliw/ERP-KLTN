/* =========================
 * Config & Constants
 * ========================= */
// Cấu hình URL dựa trên giả định JSON Server chạy ở port 3002
const SC_API_URL = "http://localhost:3002"; 

const ENDPOINTS = {
  PO: `${SC_API_URL}/purchase_orders`,
  PO_ITEMS: `${SC_API_URL}/po_items`,
  QUOTATIONS: `${SC_API_URL}/quotations`,
  SUPPLIERS: `${SC_API_URL}/suppliers`,
  PRODUCTS: `${SC_API_URL}/products` // Thêm endpoint products để tham chiếu
};

// Trạng thái đơn hàng (Khớp với dữ liệu JSON và Business Logic)
export const PO_STATUS = {
  PENDING: "PENDING",       // Chờ duyệt
  APPROVED: "APPROVED",     // Đã duyệt (Sẵn sàng nhập kho)
  REJECTED: "REJECTED",     // Từ chối
  COMPLETED: "COMPLETED",   // Đã hoàn thành (Nhập kho đủ)
  CANCELLED: "CANCELLED"    // Đã hủy
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy Đơn mua hàng",
  EXISTS: "Mã Đơn mua hàng (PO Code) đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CANNOT_DELETE_APPROVED: "Không thể xóa PO đã được duyệt hoặc hoàn thành",
  CANNOT_EDIT_APPROVED: "Không thể chỉnh sửa PO khi đã được Phê duyệt.",
  QUOTATION_ID_REQUIRED: "Mã báo giá (Quotation ID) là bắt buộc",
  SUPPLIER_ID_REQUIRED: "Thông tin nhà cung cấp là bắt buộc"
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
  async checkBusinessRules(data) {
    if (!data.quotation_id) {
        throw new Error(ERROR_MSGS.QUOTATION_ID_REQUIRED);
    }
    if (!data.supplier_id) {
        throw new Error(ERROR_MSGS.SUPPLIER_ID_REQUIRED);
    }
  },
  
  async checkUniquePO(poCode, currentId = null) {
    if (!poCode) return;

    // JSON Server hỗ trợ filter qua query params
    const url = `${ENDPOINTS.PO}?po_code=${encodeURIComponent(poCode)}`;
    const response = await fetch(url);
    const result = await handleResponse(response);

    const duplicate = result.find(item => {
        // So sánh String ID để an toàn (vì JSON có id dạng "1001" chuỗi)
        if (currentId && String(item.id) === String(currentId)) return false;
        return true; 
    });

    if (duplicate) {
      throw new Error(ERROR_MSGS.EXISTS);
    }
  },

  checkDeletable(data) {
    // Logic: Không xóa đơn đã duyệt hoặc hoàn thành
    if ([PO_STATUS.APPROVED, PO_STATUS.COMPLETED].includes(data.status)) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_APPROVED);
    }
  }
};

/* =========================
 * Main Service
 * ========================= */
export const purchaseOrderService = {
  
  // --- 1. CORE FUNCTIONS (CRUD Purchase Order) ---

  async getAll({ includeDeleted = false, supplierId = null, quotationId = null } = {}) {
    try {
      let url = ENDPOINTS.PO;
      const params = [];
      
      // Filter params
      if (supplierId) params.push(`supplier_id=${supplierId}`);
      if (quotationId) params.push(`quotation_id=${quotationId}`);
      
      // Expand Supplier và Quotation để hiển thị tên NCC và mã Báo giá trên UI
      params.push(`_expand=supplier`); 
      params.push(`_expand=quotation`); 

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await fetch(url);
      const data = await handleResponse(response);
      
      // Sắp xếp: Mới nhất lên đầu (dựa vào order_date)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.order_date || 0).getTime();
        const tb = new Date(b?.order_date || 0).getTime();
        return tb - ta;
      });

      // Lọc Soft Delete (dựa vào trường deletedAt trong JSON)
      return includeDeleted ? sortedData : sortedData.filter((item) => !isSoftDeleted(item?.deletedAt));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      // 1. Lấy thông tin Header của PO (Kèm thông tin NCC và Báo giá)
      // Bỏ _embed=po_items vì nó không hoạt động với field po_id tùy chỉnh
      const poResponse = await fetch(`${ENDPOINTS.PO}/${id}?_expand=supplier&_expand=quotation`);
      const poData = await handleResponse(poResponse);
      
      if (!poData) return null;

      // 2. Lấy danh sách Items thủ công bằng cách filter theo po_id
      // Expand product để lấy tên sản phẩm hiển thị (nếu cần)
      const itemsResponse = await fetch(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);
      const itemsData = await handleResponse(itemsResponse);

      // 3. Gộp dữ liệu lại để trả về cho Form
      // Form đang đợi field 'items' hoặc 'po_items', ta gán cả 2 cho chắc
      return { 
          ...poData, 
          items: itemsData || [],
          po_items: itemsData || [] 
      };

    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async getDataFromQuotation(quotationId) {
    try {
      if (!quotationId) return null;

      // 1. Gọi API lấy thông tin báo giá (JSON Server)
      const response = await fetch(`${ENDPOINTS.QUOTATIONS}/${quotationId}`);
      const quotation = await handleResponse(response);

      if (!quotation) return null;

      // 2. Mapping Items:
      // Quotation dùng: quantity, total_line
      // PO cần: quantity_ordered, total_line_amount
      
      const mappedItems = (quotation.items || []).map(item => ({
        product_id: item.product_id,
        
        // Mapping quan trọng: quantity -> quantity_ordered
        quantity_ordered: Number(item.quantity || 0),
        
        unit_price: Number(item.unit_price || 0),
        
        // Mapping quan trọng: total_line -> total_line_amount
        total_line_amount: Number(item.total_line) || (Number(item.quantity || 0) * Number(item.unit_price || 0))
      }));

      // 3. Trả về object đã format
      return {
        quotation_id: quotation.id,
        supplier_id: quotation.supplier_id, // Lấy ID nhà cung cấp từ báo giá
        total_amount: Number(quotation.total_amount || 0),
        // Mặc định các giá trị khác
        items: mappedItems 
      };

    } catch (error) {
      console.error("Lỗi khi tham chiếu Quotation:", error);
      return null;
    }
  },

  async create(data) {
    // 1. Validate logic nghiệp vụ
    await validators.checkBusinessRules(data);
    await validators.checkUniquePO(data.po_code);

    // 2. Tách Items ra khỏi dữ liệu PO Header
    const { items, ...poHeaderData } = data;

    // 3. Chuẩn bị object PO Header
    const newPO = {
      po_code: poHeaderData.po_code,
      quotation_id: poHeaderData.quotation_id,
      supplier_id: poHeaderData.supplier_id,
      order_date: poHeaderData.order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date: poHeaderData.expected_delivery_date,
      
      total_amount: Number(poHeaderData.total_amount) || 0,
      tax_amount: Number(poHeaderData.tax_amount) || 0,
      discount_amount: Number(poHeaderData.discount_amount) || 0,
      
      status: poHeaderData.status || PO_STATUS.PENDING,
      approved_by: null,
      
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    // 4. Gọi API tạo Header trước
    const response = await fetch(ENDPOINTS.PO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPO),
    });
    const createdPO = await handleResponse(response);
    
    // 5. Nếu tạo Header thành công & có items -> Gọi API tạo từng Item
    if (createdPO && createdPO.id && items && Array.isArray(items) && items.length > 0) {
        const itemPromises = items.map(item => {
            // Tính toán lại thành tiền dòng (đề phòng FE gửi lên sai)
            const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
            
            return fetch(ENDPOINTS.PO_ITEMS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    po_id: createdPO.id, // LIÊN KẾT VỚI PO VỪA TẠO
                    product_id: item.product_id,
                    quantity_ordered: Number(item.quantity_ordered),
                    quantity_received: 0, // Mặc định chưa nhận hàng
                    unit_price: Number(item.unit_price),
                    total_line_amount: lineTotal
                })
            });
        });

        // Chờ tất cả items được tạo xong
        await Promise.all(itemPromises);
    }
    
    return createdPO;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Guard clause: Không sửa đơn đã duyệt (trừ khi có logic riêng cho phép sửa Approved)
    if (current.status === PO_STATUS.APPROVED || current.status === PO_STATUS.COMPLETED) {
        throw new Error(ERROR_MSGS.CANNOT_EDIT_APPROVED);
    }

    if (data.po_code && data.po_code !== current.po_code) {
        await validators.checkUniquePO(data.po_code, id);
    }

    // 1. Tách Items ra khỏi dữ liệu Header
    const { items, ...poHeaderData } = data;

    // 2. Chuẩn bị dữ liệu Header
    const updatedPO = {
      ...current, 
      ...poHeaderData,
      updatedAt: new Date().toISOString(),
    };
    
    // Cleanup: Xóa các trường expand/embed/items trước khi lưu Header
    delete updatedPO.supplier;
    delete updatedPO.quotation;
    delete updatedPO.po_items;
    delete updatedPO.items; // Xóa cả trường items do Form gửi lên (nếu có)

    // 3. Cập nhật Header
    const response = await fetch(`${ENDPOINTS.PO}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPO),
    });
    const result = await handleResponse(response);

    // 4. Xử lý đồng bộ Items (Quan trọng)
    if (items && Array.isArray(items)) {
        // A. Lấy danh sách items cũ đang có trong DB
        const oldItemsRes = await fetch(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);
        const oldItems = await oldItemsRes.json();

        // B. Xóa tất cả items cũ (Clean up)
        // json-server không hỗ trợ delete batch, phải loop xóa từng cái
        const deletePromises = oldItems.map(item => 
            fetch(`${ENDPOINTS.PO_ITEMS}/${item.id}`, { method: "DELETE" })
        );
        await Promise.all(deletePromises);

        // C. Tạo lại các items mới từ Form
        const createPromises = items.map(item => {
            const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
            
            return fetch(ENDPOINTS.PO_ITEMS, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    po_id: id, // ID của PO đang sửa
                    product_id: item.product_id,
                    quantity_ordered: Number(item.quantity_ordered),
                    quantity_received: 0, // Reset hoặc giữ nguyên logic nghiệp vụ
                    unit_price: Number(item.unit_price),
                    total_line_amount: lineTotal
                })
            });
        });
        await Promise.all(createPromises);
    }

    return result;
  },

  // --- 2. APPROVAL WORKFLOW (Quy trình duyệt) ---

  async approve(id, approverId) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const approvedPO = {
      ...current,
      status: PO_STATUS.APPROVED,
      approved_by: String(approverId), // ID người duyệt
      updatedAt: new Date().toISOString(),
    };

    delete approvedPO.supplier;
    delete approvedPO.quotation;
    delete approvedPO.po_items;

    const response = await fetch(`${ENDPOINTS.PO}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(approvedPO),
    });
    return handleResponse(response);
  },

  async reject(id, reason) { // <--- Thêm tham số reason
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const rejectedPO = {
      ...current,
      status: PO_STATUS.REJECTED,
      rejection_reason: reason, // <--- Lưu lý do vào JSON
      updatedAt: new Date().toISOString(),
    };
    
    // Cleanup các trường expand/embed trước khi lưu
    delete rejectedPO.supplier;
    delete rejectedPO.quotation;
    delete rejectedPO.po_items;
    delete rejectedPO.items;

    const response = await fetch(`${ENDPOINTS.PO}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejectedPO),
    });
    return handleResponse(response);
  },

  // --- 3. SOFT DELETE / RESTORE ---

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
    delete softDeleteData.quotation;
    delete softDeleteData.po_items;

    const response = await fetch(`${ENDPOINTS.PO}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });
    return handleResponse(response);
  },

  // --- 4. PO ITEMS (Chi tiết hàng hóa) ---
  
  /**
   * Lấy chi tiết items của 1 PO.
   * QUAN TRỌNG: Expand 'product' để lấy tên SP, ĐVT từ bảng products.
   */
  async getItemsByPOId(poId) {
    try {
        const response = await fetch(`${ENDPOINTS.PO_ITEMS}?po_id=${poId}&_expand=product`);
        return await handleResponse(response);
    } catch (error) {
        console.warn(`Không tải được items cho PO ${poId}`, error);
        return [];
    }
  },

  async createPOItem(itemData) {
      // itemData cần khớp với JSON: { po_id, product_id, quantity_ordered, unit_price, total_line_amount }
      const newItem = {
          ...itemData,
          quantity_received: 0, // Mặc định khi mới tạo PO là chưa nhận hàng
      };

      const response = await fetch(ENDPOINTS.PO_ITEMS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
      });
      return handleResponse(response);
  },

  async updatePOItem(id, itemData) {
      const response = await fetch(`${ENDPOINTS.PO_ITEMS}/${id}`, {
          method: "PATCH", // Dùng PATCH để update từng phần
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData)
      });
      return handleResponse(response);
  },

  async deletePOItem(id) {
      const response = await fetch(`${ENDPOINTS.PO_ITEMS}/${id}`, { method: "DELETE" });
      return handleResponse(response);
  },

  // --- 5. REFERENCE DATA ---

  async getProductsRef() {
      // Dùng để load dropdown chọn sản phẩm khi tạo PO Item
      const response = await fetch(ENDPOINTS.PRODUCTS);
      return await handleResponse(response);
  },

  // 1. Khôi phục đơn hàng đã xóa mềm
  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    // Tạo payload khôi phục: Xóa deletedAt
    const restoreData = { 
        ...current, 
        deletedAt: null, 
        updatedAt: new Date().toISOString() 
    };

    // Cleanup: Xóa các trường dữ liệu quan hệ (expand/embed) trước khi lưu
    delete restoreData.supplier;
    delete restoreData.quotation;
    delete restoreData.items;    // form items
    delete restoreData.po_items; // db items

    const response = await fetch(`${ENDPOINTS.PO}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });
    return handleResponse(response);
  },

  // 2. Xóa vĩnh viễn (Hard Delete)
  async destroy(id) {
    // Bước 1: Tìm và xóa tất cả các items con trong bảng po_items trước
    // (Để tránh rác dữ liệu, dù JSON Server không bắt buộc foreign key strict)
    try {
        const itemsRes = await fetch(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);
        const items = await itemsRes.json();
        
        if (Array.isArray(items) && items.length > 0) {
            const deletePromises = items.map(item => 
                fetch(`${ENDPOINTS.PO_ITEMS}/${item.id}`, { method: "DELETE" })
            );
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.warn("Lỗi khi xóa chi tiết PO items:", error);
    }

    // Bước 2: Xóa Header đơn hàng
    const response = await fetch(`${ENDPOINTS.PO}/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};