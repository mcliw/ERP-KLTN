import { axiosClient } from "../../../services/axiosClient";

const API_URL = "/supply-chain/bin_locations";

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy vị trí lưu kho",
  EXISTS: "Mã vị trí đã tồn tại trong kho này",
  ID_EXISTS: "ID vị trí đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CODE_REQUIRED: "Mã vị trí là bắt buộc",
  WAREHOUSE_REQUIRED: "Phải chọn kho hàng",
};

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const validators = {
  async checkCodeUnique(code, warehouseId, currentId = null) {
    if (!code) throw new Error(ERROR_MSGS.CODE_REQUIRED);
    if (!warehouseId) throw new Error(ERROR_MSGS.WAREHOUSE_REQUIRED);

    try {
      const data = await axiosClient.get(`${API_URL}?code=${code}&warehouse_id=${warehouseId}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const exists = data.some(item => String(item.id) !== String(currentId));
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },

  async checkBusinessRules(data, currentId = null) {
    if (data.code && data.warehouse_id) {
      await this.checkCodeUnique(data.code, data.warehouse_id, currentId);
    }
  },
};

export const binService = {
  async getAll({ includeDeleted = false, warehouseId = null } = {}) {
    try {
      let url = API_URL;
      
      if (warehouseId) {
        url += `?warehouse_id=${warehouseId}`;
      }

      const data = await axiosClient.get(url);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        if (a.createdAt && b.createdAt) {
           return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return (a.code || "").localeCompare(b.code || "");
      });

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
      return await axiosClient.get(`${API_URL}/${id}`);
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

    await validators.checkBusinessRules(data);

    const now = new Date().toISOString();
    const newBin = {
      ...data,
      code: data.code.toUpperCase(),
      warehouse_id: Number(data.warehouse_id),
      max_capacity: Number(data.max_capacity) || 0,
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: now,
      updatedAt: null, 
      deletedAt: null, 
    };

    return await axiosClient.post(API_URL, newBin);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const isCodeChanged = data.code && data.code !== current.code;
    const isWarehouseChanged = data.warehouse_id && data.warehouse_id !== current.warehouse_id;

    if (isCodeChanged || isWarehouseChanged) {
        const validationData = {
            code: data.code || current.code,
            warehouse_id: data.warehouse_id || current.warehouse_id
        };
        await validators.checkBusinessRules(validationData, id);
    }

    const updatedBin = {
      ...current,
      ...data,
      code: data.code ? data.code.toUpperCase() : current.code,
      warehouse_id: data.warehouse_id ? Number(data.warehouse_id) : current.warehouse_id,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedBin);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      is_active: false,
      updatedAt: now,
    };

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    await validators.checkBusinessRules({ 
        code: current.code, 
        warehouse_id: current.warehouse_id 
    }, id);

    const restoreData = {
      ...current,
      deletedAt: null,
      is_active: true,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${id}`);
  },
};