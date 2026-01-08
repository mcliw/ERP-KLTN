// apps/frontend/erp-portal/src/modules/hrm/services/account.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

const KEY = "ACCOUNTS";

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

const normalizeUsername = (username) =>
  String(username || "").trim().toLowerCase();

const createHttpError = (status, message, field) => {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
};

/* =========================
 * Enrich helpers
 * ========================= */

// Gắn thông tin nhân viên / phòng ban / chức vụ vào account
async function enrichAccount(account) {
  if (!account?.employeeCode) return { ...account, employee: null };

  const emp = await employeeService.getByCode(account.employeeCode);
  if (!emp) {
    return { ...account, employee: null };
  }

  const [dept, pos] = await Promise.all([
    emp.department
      ? departmentService.getByCode(emp.department)
      : null,
    emp.position
      ? positionService.getByCode(emp.position)
      : null,
  ]);

  return {
    ...account,
    employee: {
      code: emp.code,
      name: emp.name,
      email: emp.email,
      departmentCode: emp.department,
      departmentName: dept?.name || emp.department,
      positionCode: emp.position,
      positionName: pos?.name || emp.position,
    },
  };
}

/* =========================
 * Account Service
 * ========================= */

export const accountService = {
  /**
   * Lấy toàn bộ tài khoản
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();
    const filtered = includeDeleted
      ? list
      : list.filter((a) => !a.deletedAt);

    return Promise.all(filtered.map(enrichAccount));
  },

  /**
   * Lấy tài khoản đang hoạt động
   */
  async getActive() {
    const list = await this.getAll();
    return list.filter(
      (a) => a.status === "Hoạt động" && !a.deletedAt
    );
  },

  /**
   * Lấy tài khoản theo username
   */
  async getByUsername(username) {
    await delay();
    const u = normalizeUsername(username);

    const found = storage
      .get()
      .find((a) => normalizeUsername(a.username) === u);

    if (!found) return null;
    return enrichAccount(found);
  },

  /**
   * Kiểm tra username tồn tại
   */
  async checkUsernameExists(username) {
    await delay(200);
    const u = normalizeUsername(username);
    if (!u) return false;

    return storage
      .get()
      .some((a) => normalizeUsername(a.username) === u);
  },

  /**
   * Kiểm tra nhân viên đã có account chưa
   */
  async checkEmployeeHasAccount(employeeCode) {
    await delay(200);
    if (!employeeCode) return false;

    return storage
      .get()
      .some(
        (a) =>
          a.employeeCode === employeeCode &&
          !a.deletedAt
      );
  },

  /**
   * Tạo mới tài khoản
   */
  async create(data) {
    await delay();

    const list = storage.get();
    const username = normalizeUsername(data?.username);

    const emp = await employeeService.getByCode(data.employeeCode);
    if (!emp || emp.status !== "Đang làm việc") {
      throw createHttpError(
        400,
        "Chỉ tạo tài khoản cho nhân viên đang làm việc",
        "employeeCode"
      );
    }

    if (!username) {
      throw createHttpError(
        400,
        "Tên đăng nhập bắt buộc",
        "username"
      );
    }

    if (
      list.some(
        (a) => normalizeUsername(a.username) === username
      )
    ) {
      throw createHttpError(
        409,
        "Tên đăng nhập đã tồn tại",
        "username"
      );
    }

    if (!data.employeeCode) {
      throw createHttpError(
        400,
        "Phải chọn nhân viên",
        "employeeCode"
      );
    }

    if (
      list.some(
        (a) =>
          a.employeeCode === data.employeeCode &&
          !a.deletedAt
      )
    ) {
      throw createHttpError(
        409,
        "Nhân viên này đã có tài khoản",
        "employeeCode"
      );
    }

    const account = {
      username,
      employeeCode: data.employeeCode,
      role: data.role,
      status: data.status ?? "Hoạt động",
      password: data.password,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([...list, account]);
    return enrichAccount(account);
  },

  /**
   * Cập nhật tài khoản (không cho đổi username & employee)
   */
  async update(username, data) {
    await delay();

    const list = storage.get();
    const u = normalizeUsername(username);

    const index = list.findIndex(
      (a) => normalizeUsername(a.username) === u
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy tài khoản",
        "username"
      );
    }

    const updated = {
      ...list[index],
      role: data.role ?? list[index].role,
      status: data.status ?? list[index].status,
      ...(data.password
        ? { password: data.password }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return enrichAccount(updated);
  },

  /**
   * Xóa tài khoản (soft delete)
   */
  async remove(username) {
    await delay();

    const u = normalizeUsername(username);
    const list = storage.get();

    const index = list.findIndex(
      (a) => normalizeUsername(a.username) === u
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy tài khoản",
        "username"
      );
    }

    list[index] = {
      ...list[index],
      status: "Đã xoá",
      deletedAt: new Date().toISOString(),
    };

    storage.set(list);
    return true;
  },

  /**
   * Khôi phục tài khoản đã xóa
   */
  async restore(username) {
    await delay();

    const u = normalizeUsername(username);
    const list = storage.get();

    const index = list.findIndex(
      (a) => normalizeUsername(a.username) === u
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy tài khoản",
        "username"
      );
    }

    list[index] = {
      ...list[index],
      status: "Hoạt động",
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    storage.set(list);
    return enrichAccount(list[index]);
  },

  /**
   * Xóa vĩnh viễn
   */
  async destroy(username) {
    await delay();
    const u = normalizeUsername(username);
    const list = storage.get();

    const index = list.findIndex(
      (a) => normalizeUsername(a.username) === u
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy tài khoản",
        "username"
      );
    }

    list.splice(index, 1);
    storage.set(list);
    return true;
  },
};
