// apps/frontend/erp-portal/src/modules/hrm/services/employee.service.js
import { axiosClient } from "../../../services/axiosClient"; // Đảm bảo đường dẫn import đúng với cấu trúc dự án của bạn
import { positionService } from "./position.service";

/* =========================
 * Config & Constants
 * ========================= */
// Lưu ý: axiosClient đã có baseURL là ".../api", nên ở đây chỉ cần path con
const API_URL = "/hrm/employees";

const STATUS = {
  WORKING: "Đang làm việc",
  RESIGNED: "Nghỉ việc",
};

const ERROR_MSGS = {
  FETCH_FAILED: "Lỗi kết nối đến máy chủ",
  NOT_FOUND: "Không tìm thấy nhân viên",
  EXISTS: "Mã nhân viên đã tồn tại",
  CAPACITY_FULL: "Chức vụ đã đủ số người đảm nhận",
  MANAGER_EXISTS: "Phòng ban này đã có Trưởng phòng",
  UPDATE_FAILED: "Không thể cập nhật dữ liệu",
  CONTRACT_REQUIRED: "Nhân viên đang làm việc bắt buộc phải có Hợp đồng lao động",
};

/* =========================
 * Helpers
 * ========================= */
const normalizeCode = (code) => String(code || "").trim().toUpperCase();

const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");
const isWorkingAndNotDeleted = (e) => e?.status === STATUS.WORKING && !isSoftDeleted(e?.deletedAt);

// Hàm sanitize dữ liệu trước khi gửi (giữ nguyên logic cũ)
const sanitizeEmployeeData = (data) => {
  const { avatar, contractFile, cvFile, healthCertFile, degreeFile, ...rest } = data;
  return rest;
};

/* =========================
 * Business Validators
 * ========================= */
const validators = {
  async checkBusinessRules(data, ignoreId = null) {
    const posCode = data?.position;
    const deptCode = data?.department;

    // 0) Enforce contract for WORKING
    const nextStatus = data?.status;
    if (nextStatus === STATUS.WORKING && !data?.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // 1) Capacity check: chỉ tính WORKING + not deleted
    if (posCode) {
      const position = await positionService.getByCode(posCode);
      if (position) {
        // Thay fetch bằng axiosClient.get
        // axiosClient trả về data trực tiếp (do interceptor)
        let employeesInPos = await axiosClient.get(API_URL, {
          params: { position: posCode }
        });

        // Nếu API trả về Page object, cần lấy .content, nhưng logic cũ là array nên giả định array
        employeesInPos = (Array.isArray(employeesInPos) ? employeesInPos : [])
          .filter(isWorkingAndNotDeleted)
          .filter((e) => (ignoreId ? e.id !== ignoreId : true));

        if (employeesInPos.length >= Number(position.capacity || 0)) {
          throw new Error(ERROR_MSGS.CAPACITY_FULL);
        }
      }
    }

    // 2) Manager unique per department: check theo "Trưởng phòng" trong phòng ban
    if (deptCode && posCode) {
      const position = await positionService.getByCode(posCode);

      const isManager =
        position && String(position.name || "").trim().toLowerCase().includes("trưởng phòng");

      if (isManager) {
        let employeesInDept = await axiosClient.get(API_URL, {
          params: { department: deptCode }
        });

        employeesInDept = (Array.isArray(employeesInDept) ? employeesInDept : [])
          .filter(isWorkingAndNotDeleted)
          .filter((e) => (ignoreId ? e.id !== ignoreId : true));

        for (const emp of employeesInDept) {
          if (!emp.position) continue;
          const p = await positionService.getByCode(emp.position);
          const empIsManager =
            p && String(p.name || "").trim().toLowerCase().includes("trưởng phòng");

          if (empIsManager) {
            throw new Error(ERROR_MSGS.MANAGER_EXISTS);
          }
        }
      }
    }
  },
};

/* =========================
 * Main Service
 * ========================= */
export const employeeService = {
  async getAll({ includeDeleted = false } = {}) {
    try {
      // axiosClient tự động gắn Token từ localStorage
      const data = await axiosClient.get(API_URL);

      const sortedData = (Array.isArray(data) ? data : []).sort((a, b) => {
        const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
        const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
        return tb - ta;
      });

      return includeDeleted ? sortedData : sortedData.filter((e) => !isSoftDeleted(e?.deletedAt));
    } catch (error) {
      console.error(ERROR_MSGS.FETCH_FAILED, error);
      return [];
    }
  },

  async getById(id) {
    try {
      const data = await axiosClient.get(`${API_URL}/${id}`);
      return data;
    } catch (error) {
      // Xử lý lỗi 404 nếu cần trả về null giống logic cũ
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error("getById failed:", error);
      return null;
    }
  },

  async getByCode(code) {
    try {
      const targetCode = normalizeCode(code);
      const data = await axiosClient.get(API_URL, {
        params: { code: targetCode }
      });
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  },

  async checkCodeExists(code) {
    const user = await this.getByCode(code);
    return !!user;
  },

  async create(data) {
    const code = normalizeCode(data?.code);

    const exists = await this.checkCodeExists(code);
    if (exists) throw new Error(ERROR_MSGS.EXISTS);

    // enforce contract for working (create default working)
    const createStatus = data.status || STATUS.WORKING;
    if (createStatus === STATUS.WORKING && !data?.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    await validators.checkBusinessRules({ ...data, status: createStatus });

    const cleanData = sanitizeEmployeeData(data);

    const newEmployee = {
      ...cleanData,
      code,
      status: createStatus,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
      resignedAt: null,
    };

    // axiosClient.post tự động stringify body và set Content-Type
    return await axiosClient.post(API_URL, newEmployee);
  },

  async update(code, data) {
    const targetCode = normalizeCode(code);

    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const nextPos = data.position ?? current.position;
    const nextDept = data.department ?? current.department;
    const nextStatus = data.status ?? current.status;
    const nextContractUrl = data.contractUrl ?? current.contractUrl;

    // Enforce contract for WORKING
    if (nextStatus === STATUS.WORKING && !nextContractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // Khi đổi phòng/chức vụ, nếu vẫn working thì check business rules
    if (nextPos !== current.position || nextDept !== current.department) {
      if (nextStatus === STATUS.WORKING) {
        await validators.checkBusinessRules(
          { ...data, position: nextPos, department: nextDept, status: nextStatus, contractUrl: nextContractUrl },
          current.id
        );
      }
    }

    let resignedAt = current.resignedAt;
    if (nextStatus === STATUS.RESIGNED && current.status !== STATUS.RESIGNED) {
      resignedAt = new Date().toISOString();
    } else if (nextStatus === STATUS.WORKING) {
      resignedAt = null;
    }

    const cleanData = sanitizeEmployeeData(data);

    const updatedEmployee = {
      ...current,
      ...cleanData,
      code: targetCode,
      status: nextStatus,
      resignedAt,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, updatedEmployee);
  },

  async remove(code) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    const now = new Date().toISOString();
    const softDeleteData = {
      ...current,
      deletedAt: now,
      resignedAt: now,
      status: STATUS.RESIGNED,
      updatedAt: now,
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, softDeleteData);
  },

  async restore(code) {
    const targetCode = normalizeCode(code);
    const current = await this.getByCode(targetCode);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    // Restore về WORKING => bắt buộc hợp đồng
    if (current.status === STATUS.WORKING && !current.contractUrl) {
      throw new Error(ERROR_MSGS.CONTRACT_REQUIRED);
    }

    // Check capacity/manager nếu restore là working
    if (current.status === STATUS.WORKING) {
      await validators.checkBusinessRules(
        {
          position: current.position,
          department: current.department,
          status: current.status,
          contractUrl: current.contractUrl,
        },
        current.id
      );
    }

    const restoreData = {
      ...current,
      deletedAt: null,
      resignedAt: null,
      status: STATUS.WORKING,
      updatedAt: new Date().toISOString(),
    };

    return await axiosClient.put(`${API_URL}/${current.id}`, restoreData);
  },

  async destroy(code) {
    const current = await this.getByCode(code);
    if (!current) throw new Error(ERROR_MSGS.NOT_FOUND);

    return await axiosClient.delete(`${API_URL}/${current.id}`);
  },
};