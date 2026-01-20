import { axiosClient } from "../../../services/axiosClient";

const API_URL = "/supply-chain/product_categories";

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy danh mục",
  EXISTS: "Mã danh mục đã tồn tại",
  PARENT_NOT_FOUND: "Danh mục cha không tồn tại",
  CIRCULAR_DEPENDENCY: "Danh mục cha không thể là chính nó",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const validators = {
  async checkBusinessRules(data, currentId = null) {
    const parentId = data?.parentId;

    if (parentId && currentId && parentId === currentId) {
      throw new Error(ERROR_MSGS.CIRCULAR_DEPENDENCY);
    }

    if (parentId) {
      try {
        await axiosClient.get(`${API_URL}/${parentId}`);
      } catch (error) {
        throw new Error(ERROR_MSGS.PARENT_NOT_FOUND);
      }
    }
  },
};

export const productCategoryService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
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
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
    }

    await validators.checkBusinessRules(data);

    const newCategory = {
      ...data,
      parentId: data.parentId || null,
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newCategory);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const nextParentId = data.parentId !== undefined ? data.parentId : current.parentId;
    const nextStatus = data.status || current.status;

    if (nextParentId !== current.parentId) {
        await validators.checkBusinessRules({ ...data, parentId: nextParentId }, id);
    }

    const updatedCategory = {
      ...current,
      ...data,
      parentId: nextParentId || null,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedCategory);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      status: STATUS.INACTIVE,
      updatedAt: now,
    };

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (current.parentId) {
        await validators.checkBusinessRules({ parentId: current.parentId }, id);
    }

    const restoreData = {
      ...current,
      deletedAt: null,
      status: STATUS.ACTIVE,
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