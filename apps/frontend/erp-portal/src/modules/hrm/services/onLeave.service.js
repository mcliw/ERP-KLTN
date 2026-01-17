// apps/frontend/erp-portal/src/modules/hrm/services/onLeave.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/onLeaves";

const EMP_STATUS = {
  WORKING: "Đang làm việc",
};

export const LEAVE_STATUS = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy đơn nghỉ",
  MISSING_EMPLOYEE: "Thiếu nhân viên",
  INVALID_EMPLOYEE: "Chỉ tạo đơn nghỉ cho nhân viên đang làm việc",
  MISSING_RANGE: "Thiếu thời gian nghỉ",
  INVALID_RANGE: "Khoảng thời gian nghỉ không hợp lệ",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  // [UPDATE] Thêm thông báo lỗi mới
  CANNOT_DELETE_PENDING: "Không được xóa đơn khi đang chờ duyệt",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async ensureEmployeeWorking(employeeCode) {
    const code = normalizeCode(employeeCode);
    if (!code) throw new Error(ERROR_MSGS.MISSING_EMPLOYEE);

    const emp = await employeeService.getByCode(code);

    if (
      !emp ||
      isSoftDeleted(emp?.deletedAt) ||
      String(emp?.status || "").trim() !== EMP_STATUS.WORKING
    ) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }

    return emp;
  },

  ensureValidRange(fromDate, toDate) {
    if (!fromDate || !toDate) throw new Error(ERROR_MSGS.MISSING_RANGE);

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new Error(ERROR_MSGS.INVALID_RANGE);
    }
  },
};

/* =========================
 * Enrich helper
 * ========================= */
const enrichOnLeaveData = (item, allEmployees, allDepts, allPositions) => {
  const empCode = item?.employeeCode ? normalizeCode(item.employeeCode) : null;
  if (!empCode) {
    return { ...item, employeeName: null, departmentName: null, positionName: null };
  }

  const emp = (Array.isArray(allEmployees) ? allEmployees : []).find(
    (e) => normalizeCode(e?.code) === empCode
  );

  if (!emp) {
    return { ...item, employeeName: null, departmentName: null, positionName: null };
  }

  const dept = (Array.isArray(allDepts) ? allDepts : []).find(
    (d) => normalizeCode(d?.code) === normalizeCode(emp?.department)
  );
  const pos = (Array.isArray(allPositions) ? allPositions : []).find(
    (p) => normalizeCode(p?.code) === normalizeCode(emp?.position)
  );

  return {
    ...item,
    employeeName: emp?.name || null,
    departmentName: dept?.name || emp?.department || null,
    positionName: pos?.name || emp?.position || null,
  };
};

/* =========================
 * Main Service
 * ========================= */
export const onLeaveService = {
  // ... (giữ nguyên các hàm getAll, getById, create) ...

  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return tb - ta;
      });

      const filtered = includeDeleted
        ? sortedData
        : sortedData.filter((i) => !isSoftDeleted(i?.deletedAt));

      if (!enrich) return filtered;

      const [employees, depts, positions] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        departmentService.getAll({ includeDeleted: true, enrich: false }),
        positionService.getAll({ includeDeleted: true, enrich: false }),
      ]);

      return filtered.map((item) => enrichOnLeaveData(item, employees, depts, positions));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      if (response.status === 404) return null;
      return handleResponse(response);
    } catch {
      return null;
    }
  },

  async create(data) {
    await validators.ensureEmployeeWorking(data?.employeeCode);
    validators.ensureValidRange(data?.fromDate, data?.toDate);

    const now = new Date().toISOString();

    const newItem = {
      ...data,
      employeeCode: normalizeCode(data?.employeeCode),
      status: data?.status ?? LEAVE_STATUS.PENDING,
      approvedAt: null,
      approvedBy: null,
      rejectReason: null,
      createdAt: now,
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const nextFrom = data?.fromDate ?? current.fromDate;
      const nextTo = data?.toDate ?? current.toDate;

      if (data?.fromDate != null || data?.toDate != null) {
        validators.ensureValidRange(nextFrom, nextTo);
      }

      const updatedItem = {
        ...current,
        ...data,
        id: current.id,
        employeeCode: current.employeeCode,
        fromDate: nextFrom,
        toDate: nextTo,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  /**
   * Xóa mềm (PUT) theo id
   * [UPDATE] Không cho phép xóa nếu status là PENDING
   */
  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // --- LOGIC MỚI BẮT ĐẦU ---
    // Kiểm tra nếu trạng thái là CHỜ DUYỆT thì chặn lại
    if (current.status === LEAVE_STATUS.PENDING) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_PENDING);
    }
    // --- LOGIC MỚI KẾT THÚC ---

    const now = new Date().toISOString();

    const softDeleteData = {
      ...current,
      deletedAt: now,
      updatedAt: now,
    };

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });

    return handleResponse(response);
  },

  // ... (giữ nguyên các hàm restore, approve, reject, destroy) ...

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      // status: LEAVE_STATUS.PENDING,
      // approvedAt: null,
      // approvedBy: null,
      // rejectReason: null,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });

    return handleResponse(response);
  },

  async approve(id, approver = "admin") {
    return this.update(id, {
      status: LEAVE_STATUS.APPROVED,
      approvedAt: new Date().toISOString(),
      approvedBy: approver,
      rejectReason: null,
    });
  },

  async reject(id, reason, approver = "admin") {
    return this.update(id, {
      status: LEAVE_STATUS.REJECTED,
      rejectReason: reason || null,
      approvedAt: new Date().toISOString(),
      approvedBy: approver,
    });
  },

  async destroy(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};