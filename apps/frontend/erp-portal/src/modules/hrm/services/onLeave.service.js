// apps/frontend/erp-portal/src/modules/hrm/services/onLeave.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

const KEY = "ON_LEAVES";

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

const normalizeId = (id) => String(id || "").trim();

const createHttpError = (status, message, field) => {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
};

/* =========================
 * Business Validators
 * ========================= */

async function validateEmployeeWorking(employeeCode) {
  if (!employeeCode) {
    throw createHttpError(400, "Thiếu nhân viên", "employeeCode");
  }

  const emp = await employeeService.getByCode(employeeCode);

  if (!emp || emp.deletedAt || emp.status !== "Đang làm việc") {
    throw createHttpError(
      400,
      "Chỉ tạo đơn nghỉ cho nhân viên đang làm việc",
      "employeeCode"
    );
  }

  return emp;
}

function validateLeaveRange(fromDate, toDate) {
  if (!fromDate || !toDate) {
    throw createHttpError(400, "Thiếu thời gian nghỉ");
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (isNaN(from) || isNaN(to) || from > to) {
    throw createHttpError(
      400,
      "Khoảng thời gian nghỉ không hợp lệ",
      "fromDate"
    );
  }
}

/* =========================
 * Enrich helper (CHUẨN HÓA)
 * ========================= */

async function enrichOnLeave(item) {
  if (!item) return null;

  let employeeName = null;
  let departmentName = null;
  let positionName = null;

  if (item.employeeCode) {
    const emp = await employeeService.getByCode(item.employeeCode);

    if (emp) {
      employeeName = emp.name;

      const [dept, pos] = await Promise.all([
        emp.department
          ? departmentService.getByCode(emp.department)
          : null,
        emp.position
          ? positionService.getByCode(emp.position)
          : null,
      ]);

      departmentName = dept?.name || emp.department;
      positionName = pos?.name || emp.position;
    }
  }

  return {
    ...item,
    employeeName,
    departmentName,
    positionName,
  };
}

/* =========================
 * OnLeave Service
 * ========================= */

export const onLeaveService = {
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();

    const filtered = includeDeleted
      ? list
      : list.filter((i) => !i.deletedAt);

    return Promise.all(filtered.map(enrichOnLeave));
  },

  async getById(id) {
    await delay();
    const i = normalizeId(id);

    const found = storage
      .get()
      .find((x) => normalizeId(x.id) === i);

    return found ? enrichOnLeave(found) : null;
  },

  async create(data) {
    await delay();

    await validateEmployeeWorking(data?.employeeCode);
    validateLeaveRange(data?.fromDate, data?.toDate);

    const now = new Date().toISOString();

    const item = {
      ...data,
      id: crypto.randomUUID(),
      status: data?.status ?? "Chờ duyệt",
      approvedAt: null,
      approvedBy: null,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([item, ...storage.get()]);
    return enrichOnLeave(item);
  },

  async update(id, data) {
    await delay();

    const list = storage.get();
    const i = normalizeId(id);

    const index = list.findIndex(
      (x) => normalizeId(x.id) === i
    );

    if (index === -1) {
      throw createHttpError(404, "Không tìm thấy đơn nghỉ", "id");
    }

    if (data?.fromDate || data?.toDate) {
      validateLeaveRange(
        data.fromDate ?? list[index].fromDate,
        data.toDate ?? list[index].toDate
      );
    }

    const updated = {
      ...list[index],
      ...data,
      id: list[index].id,
      employeeCode: list[index].employeeCode,
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return enrichOnLeave(updated);
  },

  async remove(id) {
    await delay();

    const list = storage.get();
    const i = normalizeId(id);

    const index = list.findIndex(
      (x) => normalizeId(x.id) === i
    );

    if (index === -1) {
      throw createHttpError(404, "Không tìm thấy đơn nghỉ", "id");
    }

    list[index] = {
      ...list[index],
      deletedAt: new Date().toISOString(),
    };

    storage.set(list);
    return true;
  },

  async restore(id) {
    await delay();

    const list = storage.get();
    const i = normalizeId(id);

    const index = list.findIndex(
      (x) => normalizeId(x.id) === i
    );

    if (index === -1) {
      throw createHttpError(404, "Không tìm thấy đơn nghỉ", "id");
    }

    list[index] = {
      ...list[index],
      deletedAt: null,
      approvedAt: null,
      approvedBy: null,
      updatedAt: new Date().toISOString(),
    };

    storage.set(list);
    return enrichOnLeave(list[index]);
  },

  async approve(id, approver = "admin") {
    await delay();
    return this.update(id, {
      status: "Đã duyệt",
      approvedAt: new Date().toISOString(),
      approvedBy: approver,
      updatedAt: new Date().toISOString(),
    });
  },

  // async reject(id, reason, approver = "admin") {
  //   await delay();
  //   const list = storage.get();
  //   const i = normalizeId(id);
  //   const index = list.findIndex((x) => normalizeId(x.id) === i);

  //   if (index === -1) {
  //     throw createHttpError(404, "Không tìm thấy đơn nghỉ", "id");
  //   }
  //   const updated = {
  //     ...list[index],
  //     status: "Từ chối",
  //     reason: reason,
  //     approvedAt: new Date().toISOString(),
  //     approvedBy: approver,
  //     updatedAt: new Date().toISOString(),
  //   };

  //   list[index] = updated;
  //   storage.set(list);

  //   return enrichOnLeave(updated);
  // },

  async reject(id, reason, approver = "admin") {
    await delay();
    return this.update(id, {
      status: "Từ chối",
      rejectReason: reason,
      approvedAt: new Date().toISOString(),
      approvedBy: approver, // Lưu tên người từ chối vào đây
      updatedAt: new Date().toISOString(),
    });
  },

  async destroy(id) {
    await delay();

    const list = storage.get();
    const i = normalizeId(id);

    const index = list.findIndex(
      (x) => normalizeId(x.id) === i
    );

    if (index === -1) {
      throw createHttpError(404, "Không tìm thấy đơn nghỉ", "id");
    }

    list.splice(index, 1);
    storage.set(list);
    return true;
  },
};