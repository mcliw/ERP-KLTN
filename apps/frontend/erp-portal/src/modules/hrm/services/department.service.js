// apps/frontend/erp-portal/src/modules/hrm/services/department.service.js

import { employeeService } from "./employee.service";

const KEY = "DEPARTMENTS";

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
 * Enrich helpers
 * ========================= */

async function enrichDepartment(department) {
  const employees = await employeeService.getAll();

  const activeEmployees = employees.filter(
    (e) =>
      normalizeCode(e.department) ===
        normalizeCode(department.code) &&
      !e.deletedAt
  );

  return {
    ...department,
    employeeCount: activeEmployees.length,
  };
}

/* =========================
 * Department Service
 * ========================= */

export const departmentService = {
  /**
   * Lấy danh sách phòng ban
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();

    const filtered = includeDeleted
      ? list
      : list.filter((d) => !d.deletedAt);

    return Promise.all(filtered.map(enrichDepartment));
  },

  /**
   * Lấy phòng ban theo mã
   */
  async getByCode(code) {
    await delay();
    const c = normalizeCode(code);

    const found = storage
      .get()
      .find((d) => normalizeCode(d.code) === c);

    if (!found) return null;
    return enrichDepartment(found);
  },

  /**
   * Kiểm tra mã phòng ban tồn tại
   */
  async checkCodeExists(code) {
    await delay(200);
    const c = normalizeCode(code);
    if (!c) return false;

    return storage
      .get()
      .some((d) => normalizeCode(d.code) === c);
  },

  /**
   * Tạo mới phòng ban
   */
  async create(data) {
    await delay();

    const list = storage.get();
    const code = normalizeCode(data?.code);

    if (!code) {
      throw createHttpError(
        400,
        "Mã phòng ban bắt buộc",
        "code"
      );
    }

    if (
      list.some(
        (d) => normalizeCode(d.code) === code
      )
    ) {
      throw createHttpError(
        409,
        "Mã phòng ban đã tồn tại",
        "code"
      );
    }

    const department = {
      ...data,
      code,
      status: data.status ?? "Hoạt động",
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([...list, department]);
    return department;
  },

  /**
   * Cập nhật phòng ban (không cho đổi mã)
   */
  async update(code, data) {
    await delay();

    const list = storage.get();
    const targetCode = normalizeCode(code);

    const index = list.findIndex(
      (d) => normalizeCode(d.code) === targetCode
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy phòng ban",
        "code"
      );
    }

    const updated = {
      ...list[index],
      ...data,
      code: list[index].code, // khóa code
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return updated;
  },

  /**
   * Xóa phòng ban (soft delete)
   */
  async remove(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (d) => normalizeCode(d.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy phòng ban",
        "code"
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
   * Khôi phục phòng ban
   */
  async restore(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (d) => normalizeCode(d.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy phòng ban",
        "code"
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
   * Xóa vĩnh viễn phòng ban
   */
  async destroy(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage
      .get()
      .filter(
        (d) => normalizeCode(d.code) !== c
      );

    storage.set(list);
    return true;
  },
};
