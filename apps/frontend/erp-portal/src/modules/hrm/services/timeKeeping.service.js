// apps/frontend/erp-portal/src/modules/hrm/services/timeKeeping.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/timeKeeping";

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

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 404) return null;
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Lỗi API: ${response.statusText}`);
  }
  return response.json();
};

const calculateWorkCount = (status) => {
  switch (status) {
    case "Đúng giờ":
    case "Đi muộn":
    case "Về sớm":
    case "Nghỉ phép":
      return 1;
    case "Vắng mặt":
      return 0;
    default:
      return 0;
  }
};

/* =========================
 * Internal Logic
 * ========================= */
const enrichTimeKeepingData = (record, allEmployees, allDepartments, allPositions) => {
  const employee = (Array.isArray(allEmployees) ? allEmployees : []).find(
    (e) => String(e.id) === String(record.employeeId)
  );

  const department = employee
    ? (Array.isArray(allDepartments) ? allDepartments : []).find(
        (d) => d.code === employee.department
      )
    : null;

  const position = employee
    ? (Array.isArray(allPositions) ? allPositions : []).find(
        (p) => p.code === employee.position
      )
    : null;

  return {
    ...record,
    employeeCode: employee?.code || "N/A",
    employeeName: employee?.name || "Không xác định",
    departmentName: department?.name || "—",
    positionName: position?.name || "—",
    workCount: record.workCount ?? calculateWorkCount(record.status),
  };
};

const validators = {
  async checkDuplicate(employeeId, date, excludeId = null) {
    const query = `?employeeId=${employeeId}&date=${date}`;
    const response = await fetch(`${API_URL}${query}`);
    const data = await handleResponse(response);
    
    if (Array.isArray(data) && data.length > 0) {
      if (excludeId) {
        const exists = data.some(d => String(d.id) !== String(excludeId));
        if (exists) throw new Error(ERROR_MSGS.EXISTS);
      } else {
        throw new Error(ERROR_MSGS.EXISTS);
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const timeKeepingService = {
  async getAll({ 
    includeDeleted = false, 
    date = "", 
    departmentId = "", 
    keyword = "",
  } = {}) {
    try {
      let url = API_URL;
      const params = [];
      if (date) params.push(`date=${date}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const response = await fetch(url);
      const data = await handleResponse(response);

      let sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      if (!includeDeleted) {
        sortedData = sortedData.filter((d) => !isSoftDeleted(d?.deletedAt));
      }

      const [employees, departments, positions] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        departmentService.getAll({ includeDeleted: true, enrich: false }),
        positionService.getAll({ includeDeleted: true }),
      ]);

      const enrichedData = sortedData.map((record) => 
        enrichTimeKeepingData(record, employees, departments, positions)
      );

      let finalData = enrichedData;

      if (departmentId) {
        finalData = finalData.filter(d => 
            employees.find(e => String(e.id) === String(d.employeeId))?.department === departmentId
        );
      }

      if (keyword) {
        const lowerKey = keyword.toLowerCase();
        finalData = finalData.filter(d => 
            d.employeeName?.toLowerCase().includes(lowerKey) ||
            d.employeeCode?.toLowerCase().includes(lowerKey)
        );
      }

      return finalData;

    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      return await handleResponse(response);
    } catch {
      return null;
    }
  },

  async create(data) {
    if (data.checkInTime && data.checkOutTime && data.checkOutTime < data.checkInTime) {
        throw new Error(ERROR_MSGS.INVALID_TIME);
    }
    await validators.checkDuplicate(data.employeeId, data.date);

    const newRecord = {
      ...data,
      workCount: calculateWorkCount(data.status),
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRecord),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const nextCheckIn = data.checkInTime ?? current.checkInTime;
      const nextCheckOut = data.checkOutTime ?? current.checkOutTime;
      
      if (nextCheckIn && nextCheckOut && nextCheckOut < nextCheckIn) {
         throw new Error(ERROR_MSGS.INVALID_TIME);
      }

      if ((data.date && data.date !== current.date) || (data.employeeId && data.employeeId !== current.employeeId)) {
         await validators.checkDuplicate(
            data.employeeId || current.employeeId, 
            data.date || current.date, 
            id
         );
      }

      const updatedRecord = {
        ...current,
        ...data,
        workCount: calculateWorkCount(data.status || current.status),
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRecord),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  async remove(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      updatedAt: now,
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });

    return handleResponse(response);
  },

  // === THÊM HÀM NÀY ĐỂ SỬA LỖI RESTORE ===
  async restore(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null, // Bỏ đánh dấu xóa
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });

    return handleResponse(response);
  },
  // =======================================

  async destroy(id) {
    const current = await this.getById(id);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};