import { positionService } from "./position.service";

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
 * Business Validators
 * ========================= */

/**
 * Kiểm tra capacity của chức vụ
 */
async function validatePositionCapacity(positionCode, ignoreEmployeeCode) {
  if (!positionCode) return;

  const position = await positionService.getByCode(positionCode);
  if (!position) return;

  const employees = storage.get();

  const assignees = employees.filter(
    (e) =>
      !e.deletedAt &&
      e.status === "Đang làm việc" &&
      normalizeCode(e.position) === normalizeCode(positionCode) &&
      normalizeCode(e.code) !== normalizeCode(ignoreEmployeeCode)
  );

  if (assignees.length >= position.capacity) {
    throw createHttpError(
      400,
      "Chức vụ đã đủ số người đảm nhận",
      "position"
    );
  }
}

/**
 * Mỗi phòng ban chỉ có 1 Trưởng phòng
 */
async function validateSingleManager({
  department,
  positionCode,
  ignoreEmployeeCode,
}) {
  if (!department || !positionCode) return;

  const position = await positionService.getByCode(positionCode);
  if (!position) return;

  if (position.name !== "Trưởng phòng") return;

  const employees = storage.get();

  const exists = employees.some(
    (e) =>
      !e.deletedAt &&
      e.status === "Đang làm việc" &&
      normalizeCode(e.department) === normalizeCode(department) &&
      normalizeCode(e.position) === normalizeCode(positionCode) &&
      normalizeCode(e.code) !== normalizeCode(ignoreEmployeeCode)
  );

  if (exists) {
    throw createHttpError(
      400,
      "Phòng ban này đã có Trưởng phòng",
      "position"
    );
  }
}

/* =========================
 * Employee Service
 * ========================= */

export const employeeService = {
  /**
   * Lấy danh sách nhân viên
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

    // ===== BUSINESS RULES =====
    await validatePositionCapacity(data.position);
    await validateSingleManager({
      department: data.department,
      positionCode: data.position,
    });

    const employee = {
      ...data,
      code,
      department: data?.department || "",
      position: data?.position || "",
      status: data?.status ?? "Đang làm việc",
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
      resignedAt: null,
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
      (e) => normalizeCode(e.code) === targetCode
    );

    if (index === -1) {
      throw createHttpError(
        404,
        "Không tìm thấy nhân viên",
        "code"
      );
    }

    const current = list[index];

    const nextDepartment =
      data.department ?? current.department;

    const nextPosition =
      data.position ?? current.position;

    // ===== BUSINESS RULES =====
    await validatePositionCapacity(
      nextPosition,
      current.code
    );

    await validateSingleManager({
      department: nextDepartment,
      positionCode: nextPosition,
      ignoreEmployeeCode: current.code,
    });

    const updated = {
      ...current,
      ...data,
      code: current.code, // khóa mã
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

    list[index] = {
      ...list[index],
      deletedAt: now,
      resignedAt: now,
      status: "Nghỉ việc",
      updatedAt: now,
    };

    storage.set(list);
    return true;
  },

  /**
   * Xóa nhân viên vĩnh viễn (hard delete)
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

    list[index] = {
      ...list[index],
      deletedAt: null,
      resignedAt: null,
      department: "",
      position: "",
      status: "Đang làm việc",
      updatedAt: new Date().toISOString(),
    };

    storage.set(list);
    return list[index];
  },
};