// apps/frontend/erp-portal/src/modules/hrm/services/dashboard.service.js
import { axiosClient } from "../../../services/axiosClient";
import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";
import { positionService } from "./position.service";
import { timeKeepingService } from "./timeKeeping.service";
import { onLeaveService, LEAVE_STATUS } from "./onLeave.service";
import { salaryService } from "./salary.service";

/* =========================
 * Config & Constants
 * ========================= */
const EMP_STATUS = {
  WORKING: "Đang làm việc",
  RESIGNED: "Nghỉ việc",
};

const TIME_STATUS = {
  LATE: "Đi muộn",
  EARLY: "Về sớm",
  ON_TIME: "Đúng giờ",
  ABSENT: "Vắng mặt",
};

/* =========================
 * Helpers
 * ========================= */
const getStartOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getTodayString = () => {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
};

/* =========================
 * Internal Logic (Calculation)
 * ========================= */

/**
 * Tính toán biến động nhân sự trong tháng hiện tại
 */
const calculateHRFluctuation = (allEmployees) => {
  const startOfMonth = getStartOfMonth().getTime();
  
  // Nhân viên mới: createAt >= đầu tháng & status = working
  const newHires = allEmployees.filter(e => 
    e.status === EMP_STATUS.WORKING && 
    new Date(e.createdAt).getTime() >= startOfMonth
  ).length;

  // Nhân viên nghỉ việc: resignedAt >= đầu tháng & status = resigned
  const resigned = allEmployees.filter(e => 
    e.status === EMP_STATUS.RESIGNED && 
    e.resignedAt && 
    new Date(e.resignedAt).getTime() >= startOfMonth
  ).length;

  const totalActive = allEmployees.filter(e => e.status === EMP_STATUS.WORKING).length;

  return {
    totalActive,
    newHires,
    resigned,
    turnoverRate: totalActive > 0 ? ((resigned / totalActive) * 100).toFixed(1) : 0
  };
};

/**
 * Tính toán thống kê chấm công hôm nay
 */
const calculateDailyAttendance = (todayRecords, totalEmployees) => {
  let late = 0;
  let onTime = 0;

  todayRecords.forEach(record => {
    if (record.status === TIME_STATUS.LATE) late++;
    else if (record.status === TIME_STATUS.ON_TIME) onTime++;
  });

  const notCheckedIn = Math.max(0, totalEmployees - todayRecords.length);

  return {
    checkedIn: todayRecords.length,
    late,
    onTime,
    notCheckedIn,
    total: totalEmployees
  };
};

/**
 * Tính toán tuyển dụng (Vị trí trống)
 */
const calculateVacancies = (positions) => {
  let totalCapacity = 0;
  let currentAssignees = 0;

  positions.forEach(pos => {
    if (pos.status === "Hoạt động") {
      totalCapacity += Number(pos.capacity || 0);
      currentAssignees += Number(pos.assigneeCount || 0);
    }
  });

  return {
    totalCapacity,
    currentAssignees,
    vacancies: Math.max(0, totalCapacity - currentAssignees)
  };
};

/* =========================
 * Main Service
 * ========================= */
export const dashboardService = {
  /**
   * Lấy toàn bộ dữ liệu tổng hợp cho Dashboard
   * Các service thành phần giờ đây đã dùng axiosClient nên trả về data trực tiếp
   */
  async getSummary() {
    try {
      const today = getTodayString();

      // Gọi song song các services đã được chuyển đổi sang Axios
      const [
        employees,
        positions,
        departments,
        timeKeepings,
        leaves,
        salaries
      ] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        positionService.getAll({ includeDeleted: false, enrich: true }),
        departmentService.getAll({ includeDeleted: false, enrich: true }),
        timeKeepingService.getAll({ date: today }), 
        onLeaveService.getAll({ includeDeleted: false, enrich: true }),
        salaryService.getAll({ includeDeleted: false, enrich: false })
      ]);

      // Xử lý dữ liệu dựa trên kết quả trả về trực tiếp từ Axios
      const hrStats = calculateHRFluctuation(employees);
      const attendanceStats = calculateDailyAttendance(timeKeepings, hrStats.totalActive);
      const recruitmentStats = calculateVacancies(positions);

      const pendingLeaves = leaves.filter(l => l.status === LEAVE_STATUS.PENDING);
      const activeSalaries = salaries.filter(s => s.status === "Hiệu lực");
      
      const estimatedPayroll = activeSalaries.reduce((sum, item) => {
        return sum + Number(item.baseSalary || 0) + Number(item.allowance || 0);
      }, 0);

      const departmentDistribution = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        count: dept.employeeCount || 0
      }));

      const todayDate = new Date();
      const onLeaveToday = leaves.filter(l => {
        if (l.status !== LEAVE_STATUS.APPROVED) return false;
        const from = new Date(l.fromDate);
        const to = new Date(l.toDate);
        return todayDate >= from && todayDate <= to;
      });

      return {
        hrStats,
        attendanceStats,
        recruitmentStats,
        pendingRequests: {
          leaveCount: pendingLeaves.length,
          data: pendingLeaves.slice(0, 5)
        },
        payrollStats: {
          estimatedTotal: estimatedPayroll,
          activeContracts: activeSalaries.length
        },
        charts: {
          departmentData: departmentDistribution
        },
        widgets: {
          onLeaveTodayCount: onLeaveToday.length,
          onLeaveTodayList: onLeaveToday.map(l => ({
            name: l.employeeName,
            type: l.leaveType
          }))
        }
      };

    } catch (error) {
      console.error("Dashboard Service Error:", error);
      throw new Error("Không thể tải dữ liệu Dashboard");
    }
  },

  /**
   * Lấy dữ liệu biểu đồ chấm công 7 ngày gần nhất sử dụng axiosClient (thông qua timeKeepingService)
   */
  async getWeeklyAttendanceTrend() {
    try {
      const dates = [];
      const requests = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dates.push(dateStr);
        requests.push(timeKeepingService.getAll({ date: dateStr }));
      }

      const results = await Promise.all(requests);

      return dates.map((date, index) => {
        const dailyData = results[index] || [];
        const late = dailyData.filter(x => x.status === TIME_STATUS.LATE).length;
        const onTime = dailyData.filter(x => x.status === TIME_STATUS.ON_TIME).length;
        const leave = dailyData.filter(x => x.status === "Nghỉ phép").length; 

        return {
          date: date.split("-").slice(1).join("/"),
          "Đúng giờ": onTime,
          "Đi muộn": late,
          "Nghỉ phép": leave
        };
      });

    } catch (error) {
      console.error("Weekly Trend Error:", error);
      return [];
    }
  },

  async getExportData() {
    try {
      const summary = await this.getSummary();
      const employees = await employeeService.getAll({ includeDeleted: false });
      const today = getTodayString();
      const timeKeepings = await timeKeepingService.getAll({ date: today });

      return {
        summary,
        employees,
        timeKeepings
      };
    } catch (error) {
      console.error("Export Data Error:", error);
      throw new Error("Không thể lấy dữ liệu xuất báo cáo");
    }
  }
};