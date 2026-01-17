// apps/frontend/erp-portal/src/modules/hrm/services/salary.service.js

import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
const API_URL = "http://localhost:3001/salaries";

const STATUS = {
  DRAFT: "Dự thảo",
  ACTIVE: "Hiệu lực",
  EXPIRED: "Hết hạn",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy thông tin Lương & Phúc lợi",
  CANNOT_DELETE_ACTIVE: "Không thể xoá Lương & Phúc lợi đang có hiệu lực",
  CANNOT_EDIT_EXPIRED: "Không thể chỉnh sửa hợp đồng đã hết hạn",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
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

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichSalaryData = (salary, allEmployees) => {
  // Tìm thông tin nhân viên dựa trên employeeId trong record lương
  const employee = (Array.isArray(allEmployees) ? allEmployees : []).find(
    (e) => String(e.id) === String(salary.employeeId) || String(e.code) === String(salary.employeeId)
  );

  return {
    ...salary,
    employeeName: employee?.name || "Không xác định",
    employeeCode: employee?.code || "N/A",
    // Tính toán thêm trạng thái hiển thị nếu cần
    statusLabel: salary.status || STATUS.DRAFT,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  // Không cho phép xoá nếu trạng thái là Hiệu lực
  checkCanDelete(salaryRecord) {
    if (salaryRecord.status === STATUS.ACTIVE) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_ACTIVE);
    }
  },
  
  // Không cho phép sửa nếu trạng thái là Hết hạn
  checkCanEdit(salaryRecord) {
    if (salaryRecord.status === STATUS.EXPIRED) {
      throw new Error(ERROR_MSGS.CANNOT_EDIT_EXPIRED);
    }
  }
};

/* =========================
 * Main Service
 * ========================= */
export const salaryService = {
  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      const response = await fetch(API_URL);
      const data = await handleResponse(response);

      // Sắp xếp: Mới nhất lên đầu (dựa vào ngày tạo hoặc ngày hiệu lực)
      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const dateA = new Date(a.effectiveDate || a.createdAt).getTime();
        const dateB = new Date(b.effectiveDate || b.createdAt).getTime();
        return dateB - dateA;
      });

      const filtered = includeDeleted
        ? sortedData
        : sortedData.filter((d) => !isSoftDeleted(d?.deletedAt));

      if (!enrich) return filtered;

      // Lấy danh sách nhân viên để map tên
      const employees = await employeeService.getAll({ includeDeleted: true });

      return filtered.map((salary) => enrichSalaryData(salary, employees));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id, { enrich = true } = {}) {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      const data = await handleResponse(response);

      if (!data) return null;
      if (!enrich) return data;

      const employees = await employeeService.getAll({ includeDeleted: true });
      return enrichSalaryData(data, employees);
    } catch {
      return null;
    }
  },

  async create(data) {
    // Tạo record mới
    const newSalary = {
      ...data,
      // Đảm bảo các trường số
      baseSalary: Number(data.baseSalary),
      allowance: Number(data.allowance || 0),
      insuranceSalary: Number(data.insuranceSalary || 0),
      status: data.status || STATUS.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSalary),
    });

    return handleResponse(response);
  },

  async update(id, data) {
    try {
      const current = await this.getById(id, { enrich: false });
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      // Validate: Nếu record cũ đã Hết hạn thì cấm sửa (trừ khi admin force - ở đây làm simple logic)
      // validators.checkCanEdit(current);

      const updatedSalary = {
        ...current,
        ...data,
        // Cập nhật lại các trường số
        baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : current.baseSalary,
        allowance: data.allowance !== undefined ? Number(data.allowance) : current.allowance,
        insuranceSalary: data.insuranceSalary !== undefined ? Number(data.insuranceSalary) : current.insuranceSalary,
        updatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSalary),
      });

      return handleResponse(response);
    } catch (error) {
      if (error?.message) throw error;
      throw new Error(ERROR_MSGS.UPDATE_FAILED);
    }
  },

  async remove(id) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Business Rule: Không cho xoá Active
    validators.checkCanDelete(current);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      // Tuỳ chọn: Có thể chuyển status về Inactive/Draft khi xoá mềm
      // status: STATUS.INACTIVE 
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(softDeleteData),
    });

    return handleResponse(response);
  },

  async destroy(id) {
    try {
      // Kiểm tra tồn tại trước khi xóa
      const current = await this.getById(id, { enrich: false });
      if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      return handleResponse(response);
    } catch (error) {
       // Xử lý lỗi nếu cần
       throw error;
    }
  },

  async restore(id) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(restoreData),
    });

    return handleResponse(response);
  },
};