// apps/frontend/erp-portal/src/modules/hrm/services/employee.service.js

const KEY = "EMPLOYEES";

/* =========================
 * Utils & Helpers
 * ========================= */

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const storage = {
  get() {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  },
  set(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },
};

const normalizeCode = (code) =>
  String(code || "").trim().toUpperCase();

const createHttpError = (status, message, field) => {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
};

/* =========================
 * Employee Service
 * ========================= */

export const employeeService = {
  /**
   * Lấy danh sách nhân viên
   * @param {Object} options
   * @param {boolean} options.includeDeleted
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();
    return includeDeleted
      ? list
      : list.filter((e) => !e.deletedAt);
  },

  /**
   * Lấy nhân viên theo mã
   */
  async getByCode(code) {
    await delay();
    const c = normalizeCode(code);
    return (
      storage
        .get()
        .find((e) => normalizeCode(e.code) === c) || null
    );
  },

  /**
   * Kiểm tra mã nhân viên đã tồn tại
   */
  async checkCodeExists(code) {
    await delay(200);
    const c = normalizeCode(code);
    if (!c) return false;
    return storage
      .get()
      .some((e) => normalizeCode(e.code) === c);
  },

  /**
   * Tạo mới nhân viên
   */
  async create(data) {
    await delay();

    const list = storage.get();
    const code = normalizeCode(data?.code);

    if (!code) {
      throw createHttpError(
        400,
        "Mã nhân viên bắt buộc",
        "code"
      );
    }

    if (
      list.some(
        (e) => normalizeCode(e.code) === code
      )
    ) {
      throw createHttpError(
        409,
        "Mã nhân viên đã tồn tại",
        "code"
      );
    }

    const employee = {
      ...data,
      code,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([...list, employee]);
    return employee;
  },

  /**
   * Cập nhật nhân viên (không cho đổi mã)
   */
  async update(code, data) {
    await delay();

    const list = storage.get();
    const targetCode = normalizeCode(code);

    const index = list.findIndex(
      (e) =>
        normalizeCode(e.code) === targetCode
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy nhân viên",
        "code"
      );
    }

    const updated = {
      ...list[index],
      ...data,
      code: list[index].code, // khóa mã
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return updated;
  },

  /**
   * Xóa nhân viên (soft delete)
   */
  async remove(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (e) => normalizeCode(e.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy nhân viên",
        "code"
      );
    }

    const now = new Date().toISOString();

    list[index].deletedAt = now;
    list[index].resignedAt = now;
    list[index].status = "Nghỉ việc";
    list[index].updatedAt = now;

    storage.set(list);

    return true;
  },

  /**
   * Xoá nhân viên vĩnh viễn (hard delete)
   */
  async destroy(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (e) => normalizeCode(e.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy nhân viên",
        "code"
      );
    }

    list.splice(index, 1);
    storage.set(list);

    return true;
  },

  /**
   * Khôi phục nhân viên đã xóa
   */
  async restore(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (e) => normalizeCode(e.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy nhân viên",
        "code"
      );
    }

    list[index].deletedAt = null;
    list[index].resignedAt = null;
    list[index].status = "Đang làm việc";
    list[index].department = "";
    list[index].position = "";
    list[index].updatedAt = new Date().toISOString();

    storage.set(list);
    return list[index];
  },
};
