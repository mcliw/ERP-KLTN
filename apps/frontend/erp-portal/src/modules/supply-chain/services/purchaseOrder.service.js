import { axiosClient } from "../../../services/axiosClient";

const SC_API_URL = "/supply-chain"; 

const ENDPOINTS = {
  PO: `${SC_API_URL}/purchase_orders`,
  PO_ITEMS: `${SC_API_URL}/po_items`,
  QUOTATIONS: `${SC_API_URL}/quotations`,
  SUPPLIERS: `${SC_API_URL}/suppliers`,
  PRODUCTS: `${SC_API_URL}/products`
};

export const PO_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
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

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

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

    try {
        const url = `${ENDPOINTS.PO}?po_code=${encodeURIComponent(poCode)}`;
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
    if ([PO_STATUS.APPROVED, PO_STATUS.COMPLETED].includes(data.status)) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_APPROVED);
    }
  }
};

export const purchaseOrderService = {
  
  async getAll({ includeDeleted = false, supplierId = null, quotationId = null } = {}) {
    try {
      let url = ENDPOINTS.PO;
      const params = [];
      
      if (supplierId) params.push(`supplier_id=${supplierId}`);
      if (quotationId) params.push(`quotation_id=${quotationId}`);
      
      params.push(`_expand=supplier`); 
      params.push(`_expand=quotation`); 

      if (params.length > 0) url += `?${params.join('&')}`;

      const data = await axiosClient.get(url);
      
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.order_date || 0).getTime();
        const tb = new Date(b?.order_date || 0).getTime();
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
      const poData = await axiosClient.get(`${ENDPOINTS.PO}/${id}?_expand=supplier&_expand=quotation`);
      
      if (!poData) return null;

      const itemsData = await axiosClient.get(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);

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

      const quotation = await axiosClient.get(`${ENDPOINTS.QUOTATIONS}/${quotationId}`);

      if (!quotation) return null;

      const mappedItems = (quotation.items || []).map(item => ({
        product_id: item.product_id,
        quantity_ordered: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        total_line_amount: Number(item.total_line) || (Number(item.quantity || 0) * Number(item.unit_price || 0))
      }));

      return {
        quotation_id: quotation.id,
        supplier_id: quotation.supplier_id, 
        total_amount: Number(quotation.total_amount || 0),
        items: mappedItems 
      };

    } catch (error) {
      console.error("Lỗi khi tham chiếu Quotation:", error);
      return null;
    }
  },

  async create(data) {
    await validators.checkBusinessRules(data);
    await validators.checkUniquePO(data.po_code);

    const { items, ...poHeaderData } = data;

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

    const createdPO = await axiosClient.post(ENDPOINTS.PO, newPO);
    
    if (createdPO && createdPO.id && items && Array.isArray(items) && items.length > 0) {
        const itemPromises = items.map(item => {
            const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
            
            return axiosClient.post(ENDPOINTS.PO_ITEMS, {
                po_id: createdPO.id,
                product_id: item.product_id,
                quantity_ordered: Number(item.quantity_ordered),
                quantity_received: 0, 
                unit_price: Number(item.unit_price),
                total_line_amount: lineTotal
            });
        });

        await Promise.all(itemPromises);
    }
    
    return createdPO;
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (current.status === PO_STATUS.APPROVED || current.status === PO_STATUS.COMPLETED) {
        throw new Error(ERROR_MSGS.CANNOT_EDIT_APPROVED);
    }

    if (data.po_code && data.po_code !== current.po_code) {
        await validators.checkUniquePO(data.po_code, id);
    }

    const { items, ...poHeaderData } = data;

    const updatedPO = {
      ...current, 
      ...poHeaderData,
      updatedAt: new Date().toISOString(),
    };
    
    delete updatedPO.supplier;
    delete updatedPO.quotation;
    delete updatedPO.po_items;
    delete updatedPO.items;

    const result = await axiosClient.put(`${ENDPOINTS.PO}/${id}`, updatedPO);

    if (items && Array.isArray(items)) {
        const oldItems = await axiosClient.get(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);

        const deletePromises = oldItems.map(item => 
            axiosClient.delete(`${ENDPOINTS.PO_ITEMS}/${item.id}`)
        );
        await Promise.all(deletePromises);

        const createPromises = items.map(item => {
            const lineTotal = Number(item.quantity_ordered) * Number(item.unit_price);
            
            return axiosClient.post(ENDPOINTS.PO_ITEMS, {
                po_id: id, 
                product_id: item.product_id,
                quantity_ordered: Number(item.quantity_ordered),
                quantity_received: 0, 
                unit_price: Number(item.unit_price),
                total_line_amount: lineTotal
            });
        });
        await Promise.all(createPromises);
    }

    return result;
  },

  async approve(id, approverId) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);
    
    const approvedPO = {
      ...current,
      status: PO_STATUS.APPROVED,
      approved_by: String(approverId), 
      updatedAt: new Date().toISOString(),
    };

    delete approvedPO.supplier;
    delete approvedPO.quotation;
    delete approvedPO.po_items;

    return await axiosClient.put(`${ENDPOINTS.PO}/${id}`, approvedPO);
  },

  async reject(id, reason) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const rejectedPO = {
      ...current,
      status: PO_STATUS.REJECTED,
      rejection_reason: reason, 
      updatedAt: new Date().toISOString(),
    };
    
    delete rejectedPO.supplier;
    delete rejectedPO.quotation;
    delete rejectedPO.po_items;
    delete rejectedPO.items;

    return await axiosClient.put(`${ENDPOINTS.PO}/${id}`, rejectedPO);
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
    delete softDeleteData.quotation;
    delete softDeleteData.po_items;

    return await axiosClient.put(`${ENDPOINTS.PO}/${id}`, softDeleteData);
  },

  async getItemsByPOId(poId) {
    try {
        return await axiosClient.get(`${ENDPOINTS.PO_ITEMS}?po_id=${poId}&_expand=product`);
    } catch (error) {
        console.warn(`Không tải được items cho PO ${poId}`, error);
        return [];
    }
  },

  async createPOItem(itemData) {
      const newItem = {
          ...itemData,
          quantity_received: 0, 
      };

      return await axiosClient.post(ENDPOINTS.PO_ITEMS, newItem);
  },

  async updatePOItem(id, itemData) {
      return await axiosClient.patch(`${ENDPOINTS.PO_ITEMS}/${id}`, itemData);
  },

  async deletePOItem(id) {
      return await axiosClient.delete(`${ENDPOINTS.PO_ITEMS}/${id}`);
  },

  async getProductsRef() {
      return await axiosClient.get(ENDPOINTS.PRODUCTS);
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
    delete restoreData.quotation;
    delete restoreData.items;    
    delete restoreData.po_items; 

    return await axiosClient.put(`${ENDPOINTS.PO}/${id}`, restoreData);
  },

  async destroy(id) {
    try {
        const items = await axiosClient.get(`${ENDPOINTS.PO_ITEMS}?po_id=${id}`);
        
        if (Array.isArray(items) && items.length > 0) {
            const deletePromises = items.map(item => 
                axiosClient.delete(`${ENDPOINTS.PO_ITEMS}/${item.id}`)
            );
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.warn("Lỗi khi xóa chi tiết PO items:", error);
    }

    return await axiosClient.delete(`${ENDPOINTS.PO}/${id}`);
  },
};