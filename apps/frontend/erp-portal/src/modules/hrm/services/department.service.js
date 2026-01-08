// apps/frontend/erp-portal/src/modules/hrm/services/department.service.js

import { employeeService } from "./employee.service";
import { positionService } from "./position.service";

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

/**
 * Enrich phòng ban:
 * - Số lượng nhân viên đang làm việc
 * - Tên trưởng phòng (nếu có)
 */
async function enrichDepartment(department) {
  if (!department) return null;

  const employees = await employeeService.getAll();
  const positions = await positionService.getAll();

  const deptCode = normalizeCode(department.code);

  const activeEmployees = employees.filter(
    (e) =>
      !e.deletedAt &&
      e.status === "Đang làm việc" &&
      normalizeCode(e.department) === deptCode
  );

  const manager = activeEmployees.find((e) => {
    const pos = positions.find(
      (p) =>
        normalizeCode(p.code) ===
        normalizeCode(e.position)
    );
    return pos?.name === "Trưởng phòng";
  });

  return {
    ...department,
    employeeCount: activeEmployees.length,
    managerName: manager?.name || null,
  };
}

async function hasActiveEmployees(departmentCode) {
  const employees = await employeeService.getAll();
  const code = normalizeCode(departmentCode);

  return employees.some(
    (e) =>
      !e.deletedAt &&
      e.status === "Đang làm việc" &&
      normalizeCode(e.department) === code
  );
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

    return Promise.all(
      filtered.map(enrichDepartment)
    );
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

    return found
      ? enrichDepartment(found)
      : null;
  },

  /**
   * Kiểm tra mã phòng ban đã tồn tại
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
      status: data?.status ?? "Hoạt động",
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
      code: list[index].code, // khóa mã
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

    /* ===== NGHIỆP VỤ CHẶN XOÁ ===== */
    const stillHasEmployees = await hasActiveEmployees(c);
    if (stillHasEmployees) {
      throw createHttpError(
        400,
        "Không thể xoá phòng ban vì vẫn còn nhân viên đang làm việc"
      );
    }

    const now = new Date().toISOString();

    list[index].deletedAt = now;
    list[index].updatedAt = now;

    storage.set(list);
    return true;
  },

  /**
   * Xóa phòng ban vĩnh viễn (hard delete)
   */
  async destroy(code) {
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

    list.splice(index, 1);
    storage.set(list);

    return true;
  },

  /**
   * Khôi phục phòng ban đã xóa
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

    list[index].deletedAt = null;
    list[index].updatedAt =
      new Date().toISOString();

    storage.set(list);
    return list[index];
  },
};