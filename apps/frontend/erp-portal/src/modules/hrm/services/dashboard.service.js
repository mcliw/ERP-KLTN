// apps/frontend/erp-portal/src/modules/hrm/services/dashboard.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";
import { onLeaveService } from "./onLeave.service";

/* =========================
 * Constants
 * ========================= */
const EMP_STATUS = {
  WORKING: "Đang làm việc",
};

const LEAVE_STATUS = {
  APPROVED: "Đã duyệt",
};

/* =========================
 * Helpers
 * ========================= */
const isSoftDeleted = (deletedAt) => !!(deletedAt && String(deletedAt).trim() !== "");

function isTodayInRange(fromDate, toDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return today >= from && today <= to;
}

/* =========================
 * Dashboard Service
 * ========================= */
export const dashboardService = {
  /**
   * Tổng quan dashboard
   * - Chỉ lấy dữ liệu chưa soft-delete (theo chuẩn service)
   * - Thống kê: tổng NV, NV đang làm việc, số đơn nghỉ đã duyệt hôm nay, số phòng ban
   */
  async getOverview() {
    try {
      const [employees, departments, positions, onLeaves] = await Promise.all([
        employeeService.getAll({ includeDeleted: false }),
        departmentService.getAll({ includeDeleted: false, enrich: false }),
        positionService.getAll({ includeDeleted: false, enrich: false }),
        onLeaveService.getAll({ includeDeleted: false, enrich: false }),
      ]);

      // ===== EMPLOYEE STATS =====
      const totalEmployees = (Array.isArray(employees) ? employees : []).length;

      const workingEmployees = (Array.isArray(employees) ? employees : []).filter(
        (e) => !isSoftDeleted(e?.deletedAt) && String(e?.status || "").trim() === EMP_STATUS.WORKING
      ).length;

      // ===== DEPARTMENT STATS =====
      const departmentCount = (Array.isArray(departments) ? departments : []).length;

      // ===== ON LEAVE TODAY =====
      const todayLeaveCount = (Array.isArray(onLeaves) ? onLeaves : []).filter(
        (l) =>
          !isSoftDeleted(l?.deletedAt) &&
          String(l?.status || "").trim() === LEAVE_STATUS.APPROVED &&
          l?.fromDate &&
          l?.toDate &&
          isTodayInRange(l.fromDate, l.toDate)
      ).length;

      return {
        stats: {
          totalEmployees,
          workingEmployees,
          todayLeaveCount,
          departmentCount,
        },
        raw: {
          employees,
          departments,
          positions,
          onLeaves,
        },
      };
    } catch (error) {
      // Đồng bộ style với các service khác: log + fallback
      console.error("Lỗi lấy dữ liệu dashboard:", error);
      return {
        stats: {
          totalEmployees: 0,
          workingEmployees: 0,
          todayLeaveCount: 0,
          departmentCount: 0,
        },
        raw: {
          employees: [],
          departments: [],
          positions: [],
          onLeaves: [],
        },
      };
    }
  },

  /**
   * Lấy danh sách nhân viên gần đây
   * - Dựa trên createdAt/updatedAt giống chuẩn getAll
   */
  async getRecentEmployees(limit = 5) {
    try {
      const employees = await employeeService.getAll({ includeDeleted: false });

      return (Array.isArray(employees) ? employees : [])
        .filter((e) => !isSoftDeleted(e?.deletedAt))
        .sort((a, b) => {
          const ta = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
          const tb = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
          return tb - ta;
        })
        .slice(0, Math.max(0, Number(limit) || 5));
    } catch (error) {
      console.error("Lỗi lấy nhân viên gần đây:", error);
      return [];
    }
  },
};
