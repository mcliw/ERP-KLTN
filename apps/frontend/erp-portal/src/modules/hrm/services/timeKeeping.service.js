// apps/frontend/erp-portal/src/modules/hrm/services/timeKeeping.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn chính xác tới file axiosClient.js của bạn
import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/timeKeeping";

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy bản ghi chấm công",
  EXISTS: "Nhân viên này đã có dữ liệu chấm công trong ngày đã chọn",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  INVALID_TIME: "Giờ ra phải lớn hơn giờ vào",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

const calculateWorkCount = (status) => {
  switch (status) {
    case "Đúng giờ":
    case "Đi muộn":
    case "Về sớm":
    case "Nghỉ phép":
      return 1;
    case "Vắng mặt":
    case "Đã hủy":
    default:
      return 0;
  }
};

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichTimeData = (record, allEmployees, allDepartments, allPositions) => {
  const emp = allEmployees.find((e) => e.id === record.employeeId || e.code === record.employeeCode);
  if (!emp) return record;

  return {
    ...record,
    employeeName: emp.name,
    employeeCode: emp.code,
    departmentName: allDepartments.find((d) => d.code === emp.department)?.name || emp.department,
    positionName: allPositions.find((p) => p.code === emp.position)?.name || emp.position,
  };
};

/* =========================
 * Main Service
 * ========================= */
export const timeKeepingService = {
  async getAll({ date, employeeCode, includeDeleted = false, enrich = true } = {}) {
    try {
      const records = await axiosClient.get(API_URL, {
        params: { date, employeeCode }
      });

      let result = Array.isArray(records) ? records : [];

      if (!includeDeleted) {
        result = result.filter((r) => !isSoftDeleted(r.deletedAt));
      }

      if (enrich) {
        // [FIX]: Gọi department và position với enrich: false để tránh gọi lồng nhau vô tận
        const [employees, departments, positions] = await Promise.all([
          employeeService.getAll({ includeDeleted: true }),
          departmentService.getAll({ includeDeleted: true, enrich: false }), // Quan trọng: enrich: false
          positionService.getAll({ includeDeleted: true, enrich: false }),   // Quan trọng: enrich: false
        ]);

        result = result.map((r) => enrichTimeData(r, employees, departments, positions));
      }

      return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  async checkExists(employeeCode, date) {
    const records = await this.getAll({ date, employeeCode, includeDeleted: false, enrich: false });
    return records.length > 0 ? records[0] : null;
  },

  async create(data) {
    // 1. Kiểm tra tồn tại
    const existing = await this.checkExists(data.employeeCode, data.date);
    if (existing) throw new Error(ERROR_MSGS.EXISTS);

    // 2. Validate thời gian
    if (data.checkIn && data.checkOut && data.checkIn >= data.checkOut) {
      throw new Error(ERROR_MSGS.INVALID_TIME);
    }

    const newRecord = {
      ...data,
      workCount: calculateWorkCount(data.status),
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newRecord);
  },

  async update(id, data) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    if (data.checkIn && data.checkOut && data.checkIn >= data.checkOut) {
      throw new Error(ERROR_MSGS.INVALID_TIME);
    }

    const updatedRecord = {
      ...current,
      ...data,
      workCount: calculateWorkCount(data.status || current.status),
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedRecord);
  },

  async remove(id, reason = "Hủy bởi người quản lý") {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updateData = {
      ...current,
      status: "Đã hủy",
      cancelReason: reason,
      workCount: 0,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updateData);
  },

  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    if (current.status === "Đã hủy") {
      restoreData.status = "Đúng giờ";
      restoreData.cancelReason = null;
      restoreData.workCount = 1;
    }

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${id}`);
  },
};