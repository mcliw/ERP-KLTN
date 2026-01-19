// apps/frontend/erp-portal/src/modules/hrm/services/position.service.js

import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/positions";

const STATUS = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngưng hoạt động",
};

const EMP_STATUS = {
  WORKING: "Đang làm việc",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy chức vụ",
  EXISTS: "Mã chức vụ đã tồn tại",
  HAS_ASSIGNEES: "Không thể ngưng hoạt động chức vụ vì đang có nhân viên đảm nhận",
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
const enrichPositionData = (position, allEmployees) => {
  const posCode = normalizeCode(position?.code);

  const assignees = (Array.isArray(allEmployees) ? allEmployees : []).filter(
    (e) =>
      !isSoftDeleted(e?.deletedAt) &&
      String(e?.status || "").trim() === EMP_STATUS.WORKING &&
      normalizeCode(e?.position) === posCode
  );

  return {
    ...position,
    assignees,
    assigneeCount: assignees.length,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkHasActiveAssignees(posCode) {
    const employees = await employeeService.getAll({ includeDeleted: false });

    const hasActive = (Array.isArray(employees) ? employees : []).some(
      (e) =>
        !isSoftDeleted(e?.deletedAt) &&
        String(e?.status || "").trim() === EMP_STATUS.WORKING &&
        normalizeCode(e?.position) === normalizeCode(posCode)
    );

    if (hasActive) throw new Error(ERROR_MSGS.HAS_ASSIGNEES);
  },
};

/* =========================
 * Main Service
 * ========================= */
export const positionService = {
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
        : sortedData.filter((p) => !isSoftDeleted(p?.deletedAt));

      if (!enrich) return filtered;

      const employees = await employeeService.getAll({ includeDeleted: true });
      return filtered.map((p) => enrichPositionData(p, employees));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  /**
   * Lấy chi tiết theo code (GET ?code=...)
   * + hỗ trợ enrich để có assigneeCount/assignees cho màn edit
   */
  async getByCode(code, { enrich = true } = {}) {
    try {
      const targetCode = normalizeCode(code);
      const response = await fetch(`${API_URL}?code=${encodeURIComponent(targetCode)}`);
      const data = await handleResponse(response);

      const pos = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!pos || !enrich) return pos;

      const employees = await employeeService.getAll({ includeDeleted: true });
      return enrichPositionData(pos, employees);
    } catch {
      return null;
    }
  },

  async checkCodeExists(code) {
    const item = await this.getByCode(code, { enrich: false });
    return !!item;
  },

  async create(data) {
    const code = normalizeCode(data?.code);

    const exists = await this.checkCodeExists(code);
    if (exists) throw new Error(ERROR_MSGS.EXISTS);

    const capacityNum = Number(data?.capacity ?? 1);
    const newPosition = {
      ...data,
      code,
      status: data?.status || STATUS.ACTIVE,
      capacity: Number.isFinite(capacityNum) ? capacityNum : 1,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPosition),
    });

    return handleResponse(response);
  },

  /**
   * Cập nhật (PUT) theo id
   * Rule: KHÔNG cho chuyển sang "Ngưng hoạt động" nếu còn NV WORKING đang đảm nhận
   */
  async update(code, data) {
    try {
      const targetCode = normalizeCode(code);

      const current = await this.getByCode(targetCode, { enrich: false });
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const nextStatus = (data?.status ?? current.status)?.trim();

      // Chỉ check khi có ý định chuyển ACTIVE -> INACTIVE
      if (nextStatus === STATUS.INACTIVE && current.status !== STATUS.INACTIVE) {
        await validators.checkHasActiveAssignees(targetCode);
      }

      const nextCapacity = Number(data?.capacity ?? current?.capacity ?? 1);

      const updatedPosition = {
        ...current,
        ...data,
        code: targetCode,
        capacity: Number.isFinite(nextCapacity) ? nextCapacity : Number(current?.capacity ?? 1),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPosition),
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

    await validators.checkHasActiveAssignees(targetCode);

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

    const response = await fetch(`${API_URL}/${current.id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};
