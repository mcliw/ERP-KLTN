// apps/frontend/erp-portal/src/modules/hrm/services/dashboard.service.js

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

const isSameDay = (d1, d2) => {
  const date1 = new Date(d1).setHours(0, 0, 0, 0);
  const date2 = new Date(d2).setHours(0, 0, 0, 0);
  return date1 === date2;
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
  let absent = 0; // Có đơn nghỉ hoặc chưa check-in

  todayRecords.forEach(record => {
    if (record.status === TIME_STATUS.LATE) late++;
    else if (record.status === TIME_STATUS.ON_TIME) onTime++;
  });

  // Những người chưa có record chấm công hôm nay
  const notCheckedIn = Math.max(0, totalEmployees - todayRecords.length);

  return {
    checkedIn: todayRecords.length,
    late,
    onTime,
    notCheckedIn, // Có thể coi là vắng hoặc chưa đến
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
    // Chỉ tính các vị trí đang hoạt động
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
   * Dùng Promise.all để gọi song song các services
   */
  async getSummary() {
    try {
      const today = getTodayString();

      // 1. Khởi chạy các request song song
      const [
        employees,      // Lấy tất cả (cả nghỉ việc để tính turnover)
        positions,      // Lấy vị trí (enrich=true để có số lượng nhân sự hiện tại)
        departments,    // Lấy phòng ban
        timeKeepings,   // Lấy chấm công hôm nay
        leaves,         // Lấy danh sách nghỉ phép
        salaries        // Lấy danh sách lương
      ] = await Promise.all([
        employeeService.getAll({ includeDeleted: true }),
        positionService.getAll({ includeDeleted: false, enrich: true }),
        departmentService.getAll({ includeDeleted: false, enrich: true }),
        timeKeepingService.getAll({ date: today }), 
        onLeaveService.getAll({ includeDeleted: false, enrich: true }),
        salaryService.getAll({ includeDeleted: false, enrich: false })
      ]);

      // 2. Xử lý dữ liệu Nhân sự (Tổng, Mới, Nghỉ việc)
      const hrStats = calculateHRFluctuation(employees);

      // 3. Xử lý dữ liệu Chấm công (Hôm nay)
      const attendanceStats = calculateDailyAttendance(timeKeepings, hrStats.totalActive);

      // 4. Xử lý dữ liệu Tuyển dụng (Capacity vs Actual)
      const recruitmentStats = calculateVacancies(positions);

      // 5. Xử lý Đơn từ cần duyệt (Pending)
      const pendingLeaves = leaves.filter(l => l.status === LEAVE_STATUS.PENDING);
      
      // 6. Thống kê nhanh chi phí lương (Ước tính tháng hiện tại dựa trên Active salaries)
      const activeSalaries = salaries.filter(s => s.status === "Hiệu lực");
      const estimatedPayroll = activeSalaries.reduce((sum, item) => {
        return sum + Number(item.baseSalary || 0) + Number(item.allowance || 0);
      }, 0);

      // 7. Thống kê nhân sự theo phòng ban (Cho biểu đồ tròn)
      const departmentDistribution = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        count: dept.employeeCount || 0
      }));

      // 8. Danh sách nhân viên nghỉ hôm nay (Approved leave overlaps today)
      const todayDate = new Date();
      const onLeaveToday = leaves.filter(l => {
        if (l.status !== LEAVE_STATUS.APPROVED) return false;
        const from = new Date(l.fromDate);
        const to = new Date(l.toDate);
        return todayDate >= from && todayDate <= to;
      });

      return {
        hrStats,               // { totalActive, newHires, resigned, turnoverRate }
        attendanceStats,       // { checkedIn, late, onTime, notCheckedIn }
        recruitmentStats,      // { vacancies, totalCapacity }
        pendingRequests: {
          leaveCount: pendingLeaves.length,
          data: pendingLeaves.slice(0, 5) // Lấy top 5 đơn mới nhất
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
   * Lấy riêng dữ liệu biểu đồ chấm công 7 ngày gần nhất
   * (Hàm này tách riêng vì có thể nặng nếu gọi chung)
   */
  async getWeeklyAttendanceTrend() {
    try {
      const dates = [];
      const requests = [];
      
      // Tạo mảng 7 ngày gần nhất
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        dates.push(dateStr);
        // Gọi API timekeeping cho từng ngày
        requests.push(timeKeepingService.getAll({ date: dateStr }));
      }

      const results = await Promise.all(requests);

      // Map kết quả về format biểu đồ (ví dụ: Recharts)
      return dates.map((date, index) => {
        const dailyData = results[index] || [];
        const late = dailyData.filter(x => x.status === TIME_STATUS.LATE).length;
        const onTime = dailyData.filter(x => x.status === TIME_STATUS.ON_TIME).length;
        // Giả sử có trạng thái nghỉ phép trong bảng timekeeping hoặc tính toán riêng
        const leave = dailyData.filter(x => x.status === "Nghỉ phép").length; 

        return {
          date: date.split("-").slice(1).join("/"), // MM/DD
          "Đúng giờ": onTime,
          "Đi muộn": late,
          "Nghỉ phép": leave
        };
      });

    } catch (error) {
      console.error("Weekly Trend Error:", error);
      return [];
    }
  }
};