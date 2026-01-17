// apps/frontend/erp-portal/src/modules/hrm/services/account.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/accounts";

const STATUS = {
  ACTIVE: "Hoạt động",
  DELETED: "Đã xoá",
};

const EMP_STATUS = {
  WORKING: "Đang làm việc",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy tài khoản",
  EXISTS_USERNAME: "Tên đăng nhập đã tồn tại",
  EXISTS_EMPLOYEE: "Nhân viên này đã có tài khoản",
  INVALID_EMPLOYEE: "Chỉ tạo tài khoản cho nhân viên đang làm việc",
  REQUIRED_USERNAME: "Tên đăng nhập bắt buộc",
  REQUIRED_EMPLOYEE: "Phải chọn nhân viên",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeUsername = (username) => String(username || "").trim().toLowerCase();
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
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichAccountData = (account, allEmployees, allDepts, allPositions) => {
  if (!account?.employeeCode) return { ...account, employee: null };

  const empCode = normalizeCode(account.employeeCode);

  const emp = (Array.isArray(allEmployees) ? allEmployees : []).find(
    (e) => normalizeCode(e?.code) === empCode
  );
  if (!emp) return { ...account, employee: null };

  const dept = (Array.isArray(allDepts) ? allDepts : []).find(
    (d) => normalizeCode(d?.code) === normalizeCode(emp?.department)
  );
  const pos = (Array.isArray(allPositions) ? allPositions : []).find(
    (p) => normalizeCode(p?.code) === normalizeCode(emp?.position)
  );

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
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async ensureValidCreatePayload(data) {
    const username = normalizeUsername(data?.username);
    const employeeCode = normalizeCode(data?.employeeCode);

    if (!username) throw new Error(ERROR_MSGS.REQUIRED_USERNAME);
    if (!employeeCode) throw new Error(ERROR_MSGS.REQUIRED_EMPLOYEE);

    // 1) Employee must exist and be WORKING
    const emp = await employeeService.getByCode(employeeCode);
    if (!emp || String(emp?.status || "").trim() !== EMP_STATUS.WORKING) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }

    // 2) Username must be unique (active only)
    const existedByUsername = await accountService.getByUsername(username);
    if (existedByUsername && !isSoftDeleted(existedByUsername?.deletedAt)) {
      throw new Error(ERROR_MSGS.EXISTS_USERNAME);
    }

    // 3) Employee must not have another active account
    const response = await fetch(`${API_URL}?employeeCode=${encodeURIComponent(employeeCode)}`);
    const dataByEmp = await handleResponse(response);
    const hasActive = (Array.isArray(dataByEmp) ? dataByEmp : []).some(
      (a) => !isSoftDeleted(a?.deletedAt)
    );
    if (hasActive) throw new Error(ERROR_MSGS.EXISTS_EMPLOYEE);

    return { username, employeeCode };
  },

  async ensureCanRestore(current) {
    // Restore account có employeeCode => employee phải còn WORKING
    if (!current?.employeeCode) return;

    const emp = await employeeService.getByCode(current.employeeCode);
    if (!emp || String(emp?.status || "").trim() !== EMP_STATUS.WORKING) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const accountService = {
  /**
   * Lấy danh sách account (GET)
   * enrich=true => gắn thông tin nhân viên
   */
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
        : sortedData.filter((a) => !isSoftDeleted(a?.deletedAt));

      if (!enrich) return filtered;

      const [employees, depts, positions] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        departmentService.getAll({ includeDeleted: true, enrich: false }),
        positionService.getAll({ includeDeleted: true, enrich: false }),
      ]);

      return filtered.map((acc) => enrichAccountData(acc, employees, depts, positions));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  /**
   * Lấy account theo username (GET ?username=...)
   */
  async getByUsername(username) {
    try {
      const u = normalizeUsername(username);
      const response = await fetch(`${API_URL}?username=${encodeURIComponent(u)}`);
      const data = await handleResponse(response);
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  async checkUsernameExists(username) {
    const acc = await this.getByUsername(username);
    return !!acc && !isSoftDeleted(acc?.deletedAt);
  },

  /**
   * Tạo mới (POST)
   */
  async create(data) {
    const { username, employeeCode } = await validators.ensureValidCreatePayload(data);

    const newAccount = {
      ...data,
      username,
      employeeCode,
      status: data?.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });

    return handleResponse(response);
  },

  /**
   * Cập nhật (PUT) theo id
   * - Chỉ update: role/status/password (nếu có)
   */
  async update(username, data) {
    try {
      const current = await this.getByUsername(username);
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const updatedAccount = {
        ...current,
        role: data?.role ?? current.role,
        status: data?.status ?? current.status,
        ...(data?.password ? { password: data.password } : {}),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAccount),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  /**
   * Xóa mềm (PUT) theo id
   */
  async remove(username) {
    const current = await this.getByUsername(username);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      status: STATUS.DELETED,
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

  /**
   * Khôi phục (PUT) theo id
   * Rule: employee phải còn WORKING
   */
  async restore(username) {
    const current = await this.getByUsername(username);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    await validators.ensureCanRestore(current);

    const restoreData = {
      ...current,
      status: STATUS.ACTIVE,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });

    return handleResponse(response);
  },

  /**
   * Xóa cứng (DELETE) theo id
   */
  async destroy(username) {
    const current = await this.getByUsername(username);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "DELETE",
    });

    return handleResponse(response);
  },
};
