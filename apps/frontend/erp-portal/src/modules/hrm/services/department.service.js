// apps/frontend/erp-portal/src/modules/hrm/services/department.service.js

import { positionService } from "./position.service";
import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/departments";

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngưng hoạt động",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy phòng ban",
  EXISTS: "Mã phòng ban đã tồn tại",
  HAS_EMPLOYEES: "Không thể ngưng hoạt động phòng ban vì vẫn còn nhân viên đang làm việc",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
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
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichDepartmentData = (department, allEmployees, allPositions) => {
  const deptCode = normalizeCode(department?.code);

  const activeEmployees = (Array.isArray(allEmployees) ? allEmployees : []).filter(
    (e) =>
      !isSoftDeleted(e?.deletedAt) &&
      String(e?.status || "").trim() === "Đang làm việc" &&
      normalizeCode(e?.department) === deptCode
  );

  const manager = activeEmployees.find((e) => {
    const pos = (Array.isArray(allPositions) ? allPositions : []).find(
      (p) => normalizeCode(p?.code) === normalizeCode(e?.position)
    );
    return String(pos?.name || "").trim().toLowerCase().includes("trưởng phòng");
  });

  return {
    ...department,
    employeeCount: activeEmployees.length,
    managerName: manager?.name || null,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkHasActiveEmployees(deptCode) {
    const employees = await employeeService.getAll({ includeDeleted: false });

    const hasActiveEmp = (Array.isArray(employees) ? employees : []).some(
      (e) =>
        !isSoftDeleted(e?.deletedAt) &&
        String(e?.status || "").trim() === "Đang làm việc" &&
        normalizeCode(e?.department) === normalizeCode(deptCode)
    );

    if (hasActiveEmp) throw new Error(ERROR_MSGS.HAS_EMPLOYEES);
  },
};

/* =========================
 * Main Service
 * ========================= */
export const departmentService = {
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
        : sortedData.filter((d) => !isSoftDeleted(d?.deletedAt));

      if (!enrich) return filtered;

      const [employees, positions] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        positionService.getAll({ includeDeleted: true }),
      ]);

      return filtered.map((dept) => enrichDepartmentData(dept, employees, positions));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  /**
   * Lấy chi tiết theo code (GET ?code=...)
   * + hỗ trợ enrich để có employeeCount/managerName cho màn edit
   */
  async getByCode(code, { enrich = true } = {}) {
    try {
      const targetCode = normalizeCode(code);
      const response = await fetch(`${API_URL}?code=${encodeURIComponent(targetCode)}`);
      const data = await handleResponse(response);

      const dept = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!dept || !enrich) return dept;

      const [employees, positions] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        positionService.getAll({ includeDeleted: true }),
      ]);

      return enrichDepartmentData(dept, employees, positions);
    } catch {
      return null;
    }
  },

  async checkCodeExists(code) {
    const dept = await this.getByCode(code, { enrich: false });
    return !!dept;
  },

  async create(data) {
    const code = normalizeCode(data?.code);

    const exists = await this.checkCodeExists(code);
    if (exists) throw new Error(ERROR_MSGS.EXISTS);

    const newDept = {
      ...data,
      code,
      status: data?.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDept),
    });

    return handleResponse(response);
  },

  /**
   * Cập nhật (PUT) theo id
   * Rule: KHÔNG cho chuyển sang "Ngưng hoạt động" nếu còn NV đang làm việc
   */
  async update(code, data) {
    try {
      const targetCode = normalizeCode(code);

      // lấy current có đủ info (enrich không bắt buộc, nhưng giữ nguyên cũng ok)
      const current = await this.getByCode(targetCode, { enrich: false });
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const nextStatus = (data?.status ?? current.status)?.trim();

      // Chỉ check khi có ý định chuyển ACTIVE -> INACTIVE
      if (nextStatus === STATUS.INACTIVE && current.status !== STATUS.INACTIVE) {
        await validators.checkHasActiveEmployees(targetCode);
      }

      const updatedDept = {
        ...current,
        ...data,
        code: targetCode, // không cho đổi mã
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedDept),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  async remove(code) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    await validators.checkHasActiveEmployees(targetCode);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      status: STATUS.INACTIVE,
      updatedAt: now,
    };

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });

    return handleResponse(response);
  },

  async restore(code) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      status: STATUS.ACTIVE,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });

    return handleResponse(response);
  },

  async destroy(code) {
    const current = await this.getByCode(code, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${current.id}`, {
      method: "DELETE",
    });

    return handleResponse(response);
  },
};
