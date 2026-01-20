// apps/frontend/erp-portal/src/modules/hrm/services/account.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn chính xác tới file axiosClient.js
import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
// axiosClient đã có baseURL là "/api", nên ở đây chỉ cần path tương đối
const API_URL = "/hrm/accounts";

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

/* =========================
 * Internal Logic (Enrich Data)
 * ========================= */
const enrichAccountData = (account, allEmployees, allDepartments, allPositions) => {
  const emp = allEmployees.find((e) => e.id === account.employeeId || e.code === account.employeeCode);
  if (!emp) return account;

  return {
    ...account,
    employeeName: emp.name,
    employeeCode: emp.code,
    departmentName: allDepartments.find((d) => d.code === emp.department)?.name || emp.department,
    positionName: allPositions.find((p) => p.code === emp.position)?.name || emp.position,
  };
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async ensureCanCreate(data) {
    if (!data.username) throw new Error(ERROR_MSGS.REQUIRED_USERNAME);
    if (!data.employeeId && !data.employeeCode) throw new Error(ERROR_MSGS.REQUIRED_EMPLOYEE);

    const emp = data.employeeId 
      ? await employeeService.getById(data.employeeId)
      : await employeeService.getByCode(data.employeeCode);

    if (!emp || emp.status !== EMP_STATUS.WORKING || isSoftDeleted(emp.deletedAt)) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }

    const allAccounts = await axiosClient.get(API_URL);
    const accounts = Array.isArray(allAccounts) ? allAccounts : [];
    
    if (accounts.some((a) => normalizeUsername(a.username) === normalizeUsername(data.username))) {
      throw new Error(ERROR_MSGS.EXISTS_USERNAME);
    }
    if (accounts.some((a) => a.employeeId === emp.id || a.employeeCode === emp.code)) {
      throw new Error(ERROR_MSGS.EXISTS_EMPLOYEE);
    }
  },

  async ensureCanRestore(account) {
    const emp = account.employeeId 
      ? await employeeService.getById(account.employeeId)
      : await employeeService.getByCode(account.employeeCode);
      
    if (!emp || emp.status !== EMP_STATUS.WORKING || isSoftDeleted(emp.deletedAt)) {
      throw new Error(ERROR_MSGS.INVALID_EMPLOYEE);
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const accountService = {
  async getAll({ includeDeleted = false, enrich = true } = {}) {
    try {
      // Sử dụng axiosClient thay cho fetch
      const accounts = await axiosClient.get(API_URL);
      
      let result = Array.isArray(accounts) ? accounts : [];

      if (!includeDeleted) {
        result = result.filter((a) => a.status !== STATUS.DELETED && !isSoftDeleted(a.deletedAt));
      }

      if (enrich) {
        const [employees, departments, positions] = await Promise.all([
          employeeService.getAll({ includeDeleted: true }),
          departmentService.getAll({ includeDeleted: true, enrich: false }),
          positionService.getAll({ includeDeleted: true }),
        ]);

        result = result.map((a) => enrichAccountData(a, employees, departments, positions));
      }

      return result.sort((a, b) => normalizeUsername(a.username).localeCompare(normalizeUsername(b.username)));
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

  async getByUsername(username) {
    try {
      const target = normalizeUsername(username);
      const data = await axiosClient.get(API_URL, {
        params: { username: target }
      });
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  async create(data) {
    await validators.ensureCanCreate(data);

    const newAccount = {
      ...data,
      username: normalizeUsername(data.username),
      status: STATUS.ACTIVE,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    };

    return await axiosClient.post(API_URL, newAccount);
  },

  async update(username, data) {
    const current = await this.getByUsername(username);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const updatedAccount = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, updatedAccount);
  },

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

    return await axiosClient.put(`${API_URL}/${current.id}`, softDeleteData);
  },

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

    return await axiosClient.put(`${API_URL}/${current.id}`, restoreData);
  },

  async destroy(username) {
    const current = await this.getByUsername(username);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${current.id}`);
  },
};