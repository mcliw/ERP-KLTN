// apps/frontend/erp-portal/src/modules/hrm/services/onLeave.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn chính xác tới file axiosClient.js của bạn
import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/onLeaves";

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
  CANNOT_DELETE_PENDING: "Không được xóa đơn khi đang chờ duyệt",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichLeaveData = (leave, allEmployees, allDepartments, allPositions) => {
  const emp = allEmployees.find((e) => e.code === leave.employeeCode);
  if (!emp) return leave;

  return {
    ...leave,
    employeeName: emp.name,
    departmentName: allDepartments.find((d) => d.code === emp.department)?.name || emp.department,
    positionName: allPositions.find((p) => p.code === emp.position)?.name || emp.position,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async validate(data) {
    if (!data.employeeCode) throw new Error(ERROR_MSGS.MISSING_EMPLOYEE);
    if (!data.fromDate || !data.toDate) throw new Error(ERROR_MSGS.MISSING_RANGE);

    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      throw new Error(ERROR_MSGS.INVALID_RANGE);
    }

    const emp = await employeeService.getByCode(data.employeeCode);
    if (!emp || emp.status !== EMP_STATUS.WORKING || isSoftDeleted(emp.deletedAt)) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const onLeaveService = {
  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      // Sử dụng axiosClient đã cấu hình interceptor để lấy data trực tiếp
      const leaves = await axiosClient.get(API_URL);
      
      let result = Array.isArray(leaves) ? leaves : [];

      if (!includeDeleted) {
        result = result.filter((l) => !isSoftDeleted(l.deletedAt));
      }

      if (enrich) {
        const [employees, departments, positions] = await Promise.all([
          employeeService.getAll({ includeDeleted: true }),
          departmentService.getAll({ includeDeleted: true, enrich: false }),
          positionService.getAll({ includeDeleted: true }),
        ]);

        result = result.map((l) => enrichLeaveData(l, employees, departments, positions));
      }

      return result.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da; // Mới nhất lên đầu
      });
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

  async create(data) {
    await validators.validate(data);

    const newLeave = {
      ...data,
      status: LEAVE_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
      approvedAt: null,
      approvedBy: null,
      rejectReason: null,
    };

    return await axiosClient.post(API_URL, newLeave);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updatedLeave = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedLeave);
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // [RULE] Không được xóa đơn khi đang chờ duyệt (Tránh mất data)
    if (current.status === LEAVE_STATUS.PENDING) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_PENDING);
    }

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      updatedAt: now,
    };

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
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
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${id}`);
  },
};