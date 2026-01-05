// apps/frontend/erp-portal/src/modules/hrm/services/position.service.js

import { employeeService } from "./employee.service";

const KEY = "POSITIONS";

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
 * Source of truth: EMPLOYEE
 * → số lượng & danh sách nhân viên giữ chức vụ này
 */
async function enrichPosition(position) {
  const employees = await employeeService.getAll();

  const assignees = employees.filter(
    (e) =>
      normalizeCode(e.position) ===
        normalizeCode(position.code) &&
      !e.deletedAt
  );

  return {
    ...position,
    assignees,
    assigneeCount: assignees.length,
  };
}

/* =========================
 * Position Service
 * ========================= */

export const positionService = {
  /**
   * Lấy danh sách chức vụ
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();

    const filtered = includeDeleted
      ? list
      : list.filter((p) => !p.deletedAt);

    return Promise.all(filtered.map(enrichPosition));
  },

  /**
   * Lấy chức vụ theo mã
   */
  async getByCode(code) {
    await delay();
    const c = normalizeCode(code);

    const found = storage
      .get()
      .find((p) => normalizeCode(p.code) === c);

    if (!found) return null;
    return enrichPosition(found);
  },

  /**
   * Kiểm tra mã chức vụ tồn tại
   */
  async checkCodeExists(code) {
    await delay(200);
    const c = normalizeCode(code);
    if (!c) return false;

    return storage
      .get()
      .some((p) => normalizeCode(p.code) === c);
  },

  /**
   * Tạo mới chức vụ
   */
  async create(data) {
    await delay();

    const list = storage.get();
    const code = normalizeCode(data?.code);

    if (!code) {
      throw createHttpError(
        400,
        "Mã chức vụ bắt buộc",
        "code"
      );
    }

    if (
      list.some(
        (p) => normalizeCode(p.code) === code
      )
    ) {
      throw createHttpError(
        409,
        "Mã chức vụ đã tồn tại",
        "code"
      );
    }

    const position = {
      ...data,
      code,
      status: data.status ?? "Hoạt động",
      capacity: Number(data.capacity ?? 1),
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([...list, position]);
    return position;
  },

  /**
   * Cập nhật chức vụ (không cho đổi mã)
   */
  async update(code, data) {
    await delay();

    const list = storage.get();
    const targetCode = normalizeCode(code);

    const index = list.findIndex(
      (p) => normalizeCode(p.code) === targetCode
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy chức vụ",
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
   * Xóa chức vụ (soft delete)
   */
  async remove(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (p) => normalizeCode(p.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy chức vụ",
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
   * Khôi phục chức vụ
   */
  async restore(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage.get();

    const index = list.findIndex(
      (p) => normalizeCode(p.code) === c
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy chức vụ",
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
   * Xóa vĩnh viễn chức vụ
   */
  async destroy(code) {
    await delay();

    const c = normalizeCode(code);
    const list = storage
      .get()
      .filter(
        (p) => normalizeCode(p.code) !== c
      );

    storage.set(list);
    return true;
  },
};
