// apps/frontend/erp-portal/src/modules/hrm/services/dashboard.service.js

import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";
import { onLeaveService } from "./onLeave.service";

/* =========================
 * Helpers
 * ========================= */

function isTodayInRange(fromDate, toDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const from = new Date(fromDate);
  const to = new Date(toDate);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return today >= from && today <= to;
}

/* =========================
 * Dashboard Service
 * ========================= */

export const dashboardService = {

  async getOverview() {
    const [employees, departments, positions, onLeaves] = await Promise.all([
      employeeService.getAll(),
      departmentService.getAll(),
      positionService.getAll(),
      onLeaveService.getAll(),
    ]);

    // ===== EMPLOYEE STATS =====
    const totalEmployees = employees.length;

    const workingEmployees = employees.filter(
      (e) => e.status === "Đang làm việc"
    ).length;

    // ===== DEPARTMENT STATS =====
    const departmentCount = departments.length;

    // ===== ON LEAVE TODAY =====
    const todayLeaveCount = onLeaves.filter(
      (l) =>
        l.status === "Đã duyệt" &&
        l.fromDate &&
        l.toDate &&
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
  },

  /**
   * Lấy danh sách nhân viên gần đây
   * (tuỳ chọn – dùng cho widget sau này)
   */
  async getRecentEmployees(limit = 5) {
    const employees = await employeeService.getAll();

    return employees
      .filter((e) => !e.deletedAt)
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      )
      .slice(0, limit);
  },
};
