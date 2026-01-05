// apps/frontend/erp-portal/src/modules/hrm/services/contract.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

const KEY = "CONTRACTS";

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

async function enrichContract(contract) {
  if (!contract?.employeeCode) {
    return { ...contract, employee: null };
  }

  const emp = await employeeService.getByCode(contract.employeeCode);
  if (!emp) {
    return { ...contract, employee: null };
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
    ...contract,
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
 * Contract Service
 * ========================= */

export const contractService = {
  /**
   * Lấy danh sách hợp đồng
   */
  async getAll({ includeDeleted = false } = {}) {
    await delay();
    const list = storage.get();

    const filtered = includeDeleted
      ? list
      : list.filter((c) => !c.deletedAt);

    return Promise.all(filtered.map(enrichContract));
  },

  /**
   * Lấy hợp đồng đang hiệu lực
   */
  async getActive() {
    await delay();
    const list = storage
      .get()
      .filter(
        (c) =>
          !c.deletedAt &&
          c.status === "Hiệu lực"
      );

    return Promise.all(list.map(enrichContract));
  },

  /**
   * Lấy hợp đồng theo mã
   */
  async getByCode(contractCode) {
    await delay();
    const code = normalizeCode(contractCode);

    const found = storage
      .get()
      .find(
        (c) =>
          normalizeCode(c.contractCode) ===
          code
      );

    if (!found) return null;
    return enrichContract(found);
  },

  /**
   * Kiểm tra mã hợp đồng tồn tại
   */
  async checkCodeExists(contractCode) {
    await delay(200);
    const code = normalizeCode(contractCode);
    if (!code) return false;

    return storage
      .get()
      .some(
        (c) =>
          normalizeCode(c.contractCode) ===
          code
      );
  },

  /**
   * Tạo mới hợp đồng
   */
  async create(data) {
    await delay();

    const list = storage.get();
    const contractCode = normalizeCode(
      data?.contractCode
    );

    if (!contractCode) {
      throw createHttpError(
        400,
        "Mã hợp đồng bắt buộc",
        "contractCode"
      );
    }

    if (
      list.some(
        (c) =>
          normalizeCode(c.contractCode) ===
          contractCode
      )
    ) {
      throw createHttpError(
        409,
        "Mã hợp đồng đã tồn tại",
        "contractCode"
      );
    }

    if (!data.employeeCode) {
      throw createHttpError(
        400,
        "Phải chọn nhân viên",
        "employeeCode"
      );
    }

    // Mỗi nhân viên chỉ có 1 hợp đồng hiệu lực
    const hasActive = list.some(
      (c) =>
        normalizeCode(c.employeeCode) ===
          normalizeCode(data.employeeCode) &&
        c.status === "Hiệu lực" &&
        !c.deletedAt
    );

    if (hasActive) {
      throw createHttpError(
        409,
        "Nhân viên đã có hợp đồng hiệu lực",
        "employeeCode"
      );
    }

    const now = new Date().toISOString();

    const contract = {
      ...data,
      contractCode,
      employeeCode: normalizeCode(
        data.employeeCode
      ),
      status: data.status ?? "Hiệu lực",
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    storage.set([...list, contract]);
    return enrichContract(contract);
  },

  /**
   * Cập nhật hợp đồng (không cho đổi mã)
   */
  async update(contractCode, data) {
    await delay();

    const code = normalizeCode(contractCode);
    const list = storage.get();

    const index = list.findIndex(
      (c) =>
        normalizeCode(c.contractCode) ===
        code
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy hợp đồng",
        "contractCode"
      );
    }

    const updated = {
      ...list[index],
      ...data,
      contractCode: list[index].contractCode, // khóa mã
      employeeCode: list[index].employeeCode, // khóa nhân viên
      updatedAt: new Date().toISOString(),
    };

    list[index] = updated;
    storage.set(list);

    return enrichContract(updated);
  },

  /**
   * Xóa hợp đồng (soft delete)
   */
  async remove(contractCode) {
    await delay();

    const code = normalizeCode(contractCode);
    const list = storage.get();

    const index = list.findIndex(
      (c) =>
        normalizeCode(c.contractCode) ===
        code
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy hợp đồng",
        "contractCode"
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
   * Khôi phục hợp đồng
   */
  async restore(contractCode) {
    await delay();

    const code = normalizeCode(contractCode);
    const list = storage.get();

    const index = list.findIndex(
      (c) =>
        normalizeCode(c.contractCode) ===
        code
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy hợp đồng",
        "contractCode"
      );
    }

    list[index] = {
      ...list[index],
      status: "Hiệu lực",
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    storage.set(list);
    return enrichContract(list[index]);
  },

  /**
   * Xóa vĩnh viễn hợp đồng
   */
  async destroy(contractCode) {
    await delay();

    const code = normalizeCode(contractCode);
    const list = storage
      .get()
      .filter(
        (c) =>
          normalizeCode(c.contractCode) !==
          code
      );

    storage.set(list);
    return true;
  },
};
