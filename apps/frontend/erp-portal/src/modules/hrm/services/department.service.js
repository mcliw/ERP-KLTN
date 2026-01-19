// apps/frontend/erp-portal/src/modules/hrm/services/department.service.js
import { axiosClient } from "../../../services/axiosClient";
import { positionService } from "./position.service";
import { employeeService } from "./employee.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/departments";

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

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
// Logic tính toán số lượng nhân viên và chức vụ trong phòng ban
const enrichDepartmentData = (department, allEmployees, allPositions) => {
  const deptCode = department.code;
  
  const deptEmployees = allEmployees.filter(e => 
    e.department === deptCode && !isSoftDeleted(e.deletedAt)
  );
  
  const deptPositions = allPositions.filter(p => p.department === deptCode);

  return {
    ...department,
    employeeCount: deptEmployees.length,
    positionCount: deptPositions.length,
    managerName: department.manager ? (allEmployees.find(e => e.code === department.manager)?.name || department.manager) : "Chưa cập nhật"
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkHasActiveEmployees(deptCode) {
    const employees = await employeeService.getAll();
    const activeInDept = employees.filter(e => 
      e.department === deptCode && 
      e.status === "Đang làm việc" && 
      !isSoftDeleted(e.deletedAt)
    );
    
    if (activeInDept.length > 0) {
      throw new Error(ERROR_MSGS.HAS_EMPLOYEES);
    }
  }
};

/* =========================
 * Main Service
 * ========================= */
export const departmentService = {
  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      // Sử dụng axiosClient đã cấu hình interceptor để lấy data trực tiếp
      const departments = await axiosClient.get(API_URL);

      let result = Array.isArray(departments) ? departments : [];

      if (!includeDeleted) {
        result = result.filter((d) => !isSoftDeleted(d.deletedAt));
      }

      if (enrich) {
        // Lấy thêm dữ liệu liên quan để tính toán employeeCount, v.v.
        const [employees, positions] = await Promise.all([
          employeeService.getAll({ includeDeleted: true }),
          positionService.getAll({ includeDeleted: true })
        ]);
        
        result = result.map(d => enrichDepartmentData(d, employees, positions));
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
        params: { code: targetCode }
      });
      
      const dept = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      if (dept && enrich) {
        const [employees, positions] = await Promise.all([
          employeeService.getAll({ includeDeleted: true }),
          positionService.getAll({ includeDeleted: true })
        ]);
        return enrichDepartmentData(dept, employees, positions);
      }
      
      return dept;
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

    const newDepartment = {
      ...data,
      code,
      status: data.status || STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newDepartment);
  },

  async update(code, data) {
    const targetCode = normalizeCode(code);
    
    const current = await this.getByCode(targetCode, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Nếu chuyển sang Ngưng hoạt động, cần kiểm tra nhân viên
    if (data.status === STATUS.INACTIVE && current.status !== STATUS.INACTIVE) {
      await validators.checkHasActiveEmployees(targetCode);
    }

    const updatedDepartment = {
      ...current,
      ...data,
      code: targetCode,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, updatedDepartment);
  },

  async remove(code) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode, { enrich: false });
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Không cho phép xoá nếu còn nhân viên đang làm việc
    await validators.checkHasActiveEmployees(targetCode);

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