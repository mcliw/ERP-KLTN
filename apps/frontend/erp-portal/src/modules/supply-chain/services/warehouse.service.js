import { axiosClient } from "../../../services/axiosClient";

const API_URL = "/supply-chain/warehouses";

export const WAREHOUSE_TYPES = {
  CENTRAL: "CENTRAL",
  LOCAL: "LOCAL",
  TRANSIT: "TRANSIT",
  BONDED: "BONDED",
  RETAIL: "RETAIL",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy kho hàng",
  EXISTS: "Mã kho đã tồn tại",
  ID_EXISTS: "ID kho đã tồn tại",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CODE_REQUIRED: "Mã kho là bắt buộc",
};

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const validators = {
  async checkCodeUnique(code, currentId = null) {
    if (!code) throw new Error(ERROR_MSGS.CODE_REQUIRED);

    try {
      const data = await axiosClient.get(`${API_URL}?code=${code}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const exists = data.some(item => String(item.id) !== String(currentId));
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      }
    } catch (error) {
      if (error.message === ERROR_MSGS.EXISTS) throw error;
    }
  },

  async checkBusinessRules(data, currentId = null) {
    if (data.code) {
      await this.checkCodeUnique(data.code, currentId);
    }
  },
};

export const warehouseService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        return tb - ta;
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
    const newWarehouse = {
      ...data,
      code: data.code.toUpperCase(),
      is_active: data.is_active !== undefined ? data.is_active : true,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newWarehouse);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.code && data.code !== current.code) {
        await validators.checkBusinessRules(data, id);
    }

    const updatedWarehouse = {
      ...current,
      ...data,
      code: data.code ? data.code.toUpperCase() : current.code,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedWarehouse);
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

    await validators.checkBusinessRules({ code: current.code }, id);

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