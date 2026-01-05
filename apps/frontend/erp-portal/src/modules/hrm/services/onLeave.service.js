// apps/frontend/erp-portal/src/modules/hrm/services/onLeave.service.js

const KEY = "ON_LEAVES";

/* =========================
 * Utils & Helpers
 * ========================= */

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const storage = {
  get() {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  },
  set(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },
};

const createHttpError = (status, message, field) => {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
};

/* =========================
 * OnLeave Service
 * ========================= */

export const onLeaveService = {
  /**
   * Lấy danh sách đơn nghỉ
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();

    return includeDeleted
      ? list
      : list.filter((i) => !i.deletedAt);
  },

  /**
   * Lấy đơn nghỉ theo ID
   */
  async getById(id) {
    await delay();
    const found = storage
      .get()
      .find((i) => i.id === id);

    return found || null;
  },

  /**
   * Tạo mới đơn nghỉ
   */
  async create(data) {
    await delay();

    if (!data?.employeeCode) {
      throw createHttpError(
        400,
        "Thiếu nhân viên",
        "employeeCode"
      );
    }

    if (!data?.fromDate || !data?.toDate) {
      throw createHttpError(
        400,
        "Thiếu thời gian nghỉ"
      );
    }

    const now = new Date().toISOString();

    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      status: data.status ?? "Chờ duyệt",
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([newItem, ...storage.get()]);
    return newItem;
  },

  /**
   * Cập nhật đơn nghỉ
   */
  async update(id, data) {
    await delay();

    const list = storage.get();
    const index = list.findIndex(
      (i) => i.id === id
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy đơn nghỉ",
        "id"
      );
    }

    const updated = {
      ...list[index],
      ...data,
      id: list[index].id, // khóa id
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return updated;
  },

  /**
   * Xóa đơn nghỉ (soft delete)
   */
  async remove(id) {
    await delay();

    const list = storage.get();
    const index = list.findIndex(
      (i) => i.id === id
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy đơn nghỉ",
        "id"
      );
    }

    list[index] = {
      ...list[index],
      deletedAt: new Date().toISOString(),
    };

    storage.set(list);
    return true;
  },

  /**
   * Khôi phục đơn nghỉ
   */
  async restore(id) {
    await delay();

    const list = storage.get();
    const index = list.findIndex(
      (i) => i.id === id
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy đơn nghỉ",
        "id"
      );
    }

    list[index] = {
      ...list[index],
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    storage.set(list);
    return list[index];
  },

  /**
   * Duyệt đơn nghỉ
   */
  async approve(id) {
    return this.update(id, {
      status: "Đã duyệt",
    });
  },

  /**
   * Từ chối đơn nghỉ
   */
  async reject(id) {
    return this.update(id, {
      status: "Từ chối",
    });
  },

  /**
   * Xóa vĩnh viễn
   */
  async destroy(id) {
    await delay();
    const list = storage
      .get()
      .filter((i) => i.id !== id);

    storage.set(list);
    return true;
  },
};
