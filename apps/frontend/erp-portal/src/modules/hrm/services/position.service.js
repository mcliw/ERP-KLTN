// apps/frontend/erp-portal/src/modules/hrm/services/position.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn chính xác tới file axiosClient.js
import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/positions";

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

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichPositionData = (position, allEmployees) => {
  const posCode = position.code;
  const assignees = allEmployees.filter(
    (e) => e.position === posCode && e.status === EMP_STATUS.WORKING && !isSoftDeleted(e.deletedAt)
  );

  return {
    ...position,
    assigneeCount: assignees.length,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkHasActiveAssignees(posCode) {
    const employees = await employeeService.getAll();
    const activeInPos = employees.filter(
      (e) => e.position === posCode && e.status === EMP_STATUS.WORKING && !isSoftDeleted(e.deletedAt)
    );

    if (activeInPos.length > 0) {
      throw new Error(ERROR_MSGS.HAS_ASSIGNEES);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const positionService = {
  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      // Sử dụng axiosClient thay cho fetch
      const positions = await axiosClient.get(API_URL);

      let result = Array.isArray(positions) ? positions : [];

      if (!includeDeleted) {
        result = result.filter((p) => !isSoftDeleted(p.deletedAt));
      }

      if (enrich) {
        const employees = await employeeService.getAll({ includeDeleted: true });
        result = result.map((p) => enrichPositionData(p, employees));
      }

      return result.sort((a, b) => normalizeCode(a.code).localeCompare(normalizeCode(b.code)));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      return await axiosClient.get(`${API_URL}/${id}`);
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async getByCode(code, { enrich = true } = {}) {
    try {
      const targetCode = normalizeCode(code);
      const data = await axiosClient.get(API_URL, {
        params: { code: targetCode },
      });

      const pos = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (pos && enrich) {
        const employees = await employeeService.getAll({ includeDeleted: true });
        return enrichPositionData(pos, employees);
      }

      return pos;
    } catch {
      return null;
    }
  },

  async checkCodeExists(code) {
    const pos = await this.getByCode(code, { enrich: false });
    return !!pos;
  },

  async create(data) {
    const code = normalizeCode(data?.code);

    const exists = await this.checkCodeExists(code);
    if (exists) throw new Error(ERROR_MSGS.EXISTS);

    const newPosition = {
      ...data,
      code,
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newPosition);
  },

  async update(code, data) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.status === STATUS.INACTIVE && current.status !== STATUS.INACTIVE) {
      await validators.checkHasActiveAssignees(targetCode);
    }

    const updatedPosition = {
      ...current,
      ...data,
      code: targetCode,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, updatedPosition);
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

    return await axiosClient.put(`${API_URL}/${current.id}`, softDeleteData);
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

    return await axiosClient.put(`${API_URL}/${current.id}`, restoreData);
  },

  async destroy(code) {
    const current = await this.getByCode(code, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${current.id}`);
  },
};