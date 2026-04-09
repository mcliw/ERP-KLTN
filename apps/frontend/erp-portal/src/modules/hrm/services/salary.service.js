// apps/frontend/erp-portal/src/modules/hrm/services/salary.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn chính xác tới file axiosClient.js
import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/salaries";

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

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichSalaryData = (salary, allEmployees) => {
  // Tìm thông tin nhân viên dựa trên employeeId hoặc employeeCode tuỳ theo schema
  const emp = allEmployees.find(e => e.id === salary.employeeId || e.code === salary.employeeCode);
  
  return {
    ...salary,
    employeeName: emp ? emp.name : "N/A",
    employeeCode: emp ? emp.code : (salary.employeeCode || "N/A"),
    totalSalary: Number(salary.baseSalary || 0) + Number(salary.allowance || 0)
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  checkCanDelete(salary) {
    if (salary.status === STATUS.ACTIVE) {
      throw new Error(ERROR_MSGS.CANNOT_DELETE_ACTIVE);
    }
  },
  checkCanEdit(salary) {
    if (salary.status === STATUS.EXPIRED) {
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
      // Sử dụng axiosClient thay cho fetch
      const salaries = await axiosClient.get(API_URL);
      
      let result = Array.isArray(salaries) ? salaries : [];

      if (!includeDeleted) {
        result = result.filter((s) => !isSoftDeleted(s.deletedAt));
      }

      if (enrich) {
        const employees = await employeeService.getAll({ includeDeleted: true });
        result = result.map((s) => enrichSalaryData(s, employees));
      }

      // Sắp xếp: Ưu tiên Active lên đầu, sau đó tới ngày tạo mới nhất
      return result.sort((a, b) => {
        if (a.status === STATUS.ACTIVE && b.status !== STATUS.ACTIVE) return -1;
        if (a.status !== STATUS.ACTIVE && b.status === STATUS.ACTIVE) return 1;
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      });
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id, { enrich = true } = {}) {
    try {
      const salary = await axiosClient.get(`${API_URL}/${id}`);
      
      if (salary && enrich) {
        const employees = await employeeService.getAll({ includeDeleted: true });
        return enrichSalaryData(salary, employees);
      }
      return salary;
    } catch (error) {
      console.error("getById failed:", error);
      return null;
    }
  },

  async create(data) {
    const newSalary = {
      ...data,
      status: data.status || STATUS.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newSalary);
  },

  async update(id, data) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Business Rule: Không cho sửa Expired
    validators.checkCanEdit(current);

    const updatedSalary = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, updatedSalary);
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
    };

    return await axiosClient.put(`${API_URL}/${id}`, softDeleteData);
  },

  async restore(id) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const restoreData = {
      ...current,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${id}`, restoreData);
  },

  async destroy(id) {
    const current = await this.getById(id, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${id}`);
  },
};