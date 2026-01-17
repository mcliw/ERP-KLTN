// apps/frontend/erp-portal/src/modules/hrm/pages/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  FaUserPlus, FaUserClock, FaUsers, 
  FaMoneyBillWave, FaChartPie, FaChartBar,
  FaUserTimes, FaBriefcase
} from "react-icons/fa";

// Components
import StatCard from "../../components/layouts/StatCard";
import QuickAction from "../../components/layouts/QuickAction";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";

// Services & Utils
import { dashboardService } from "../../services/dashboard.service";
import { employeeService } from "../../services/employee.service";
import { departmentService } from "../../services/department.service"; // Thêm service này
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { useToast } from "../../../../shared/components/ToastProvider";

// Import CSS riêng
import "../styles/dashboard.css";

/* =====================
 * Sub-Components (Biểu đồ CSS thuần)
 * ===================== */

// 1. Biểu đồ chấm công hôm nay (Thay thế biểu đồ lương)
const AttendanceChart = ({ data }) => {
  if (!data) return <div className="text-muted text-center py-3">Đang tải...</div>;
  
  const { onTime, late, notCheckedIn, total } = data;
  const getPercent = (val) => total > 0 ? (val / total) * 100 : 0;

  return (
    <div className="chart-container">
      <div className="d-flex justify-content-between mb-2">
        <strong>Tổng nhân sự: {total}</strong>
        <small className="text-muted">{new Date().toLocaleDateString('vi-VN')}</small>
      </div>

      {/* Bar: Đúng giờ */}
      <div className="chart-row">
        <div className="chart-label d-flex align-items-center">
          <span className="badge bg-success me-2" style={{width: 10, height: 10, padding: 0}}> </span>
          Đúng giờ ({onTime})
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-fill bg-success" style={{ width: `${getPercent(onTime)}%` }}></div>
        </div>
        <div className="chart-value">{getPercent(onTime).toFixed(1)}%</div>
      </div>

      {/* Bar: Đi muộn */}
      <div className="chart-row">
        <div className="chart-label d-flex align-items-center">
          <span className="badge bg-warning me-2" style={{width: 10, height: 10, padding: 0}}> </span>
          Đi muộn ({late})
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-fill bg-warning" style={{ width: `${getPercent(late)}%` }}></div>
        </div>
        <div className="chart-value">{getPercent(late).toFixed(1)}%</div>
      </div>

      {/* Bar: Chưa check-in/Vắng */}
      <div className="chart-row">
        <div className="chart-label d-flex align-items-center">
          <span className="badge bg-secondary me-2" style={{width: 10, height: 10, padding: 0}}> </span>
          Chưa điểm danh ({notCheckedIn})
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-fill bg-secondary" style={{ width: `${getPercent(notCheckedIn)}%` }}></div>
        </div>
        <div className="chart-value">{getPercent(notCheckedIn).toFixed(1)}%</div>
      </div>
    </div>
  );
};

// 2. Biểu đồ phân bổ nhân sự (Updated logic)
const DepartmentRatioList = ({ data, totalEmployees }) => (
  <div className="ratio-container">
    {(!data || data.length === 0) && <div className="text-muted text-center py-3">Chưa có dữ liệu phòng ban</div>}
    {data.map((item) => {
      const percent = totalEmployees > 0 ? ((item.count / totalEmployees) * 100).toFixed(1) : 0;
      return (
        <div key={item.id} className="ratio-item">
          <div className="ratio-header">
            <span className="ratio-name">{item.name}</span>
            <span className="ratio-percent">{percent}%</span>
          </div>
          <div className="progress-bg">
             <div className="progress-fill" style={{ width: `${percent}%` }}></div>
          </div>
          <div className="ratio-detail text-muted">{item.count} nhân viên</div>
        </div>
      );
    })}
  </div>
);

/* =====================
 * Main Component
 * ===================== */
export default function HRMDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);

  // --- PERMISSIONS ---
  const canEditEmployee = hasPermission(user?.role, HRM_PERMISSIONS.EMPLOYEE_EDIT);
  const canViewSalaryInfo = hasPermission(user?.role, HRM_PERMISSIONS.SALARY || "HRM_SALARY_VIEW");
  
  // --- STATE ---
  // State tổng hợp từ dashboard.service
  const [summary, setSummary] = useState(null);
  
  // State cho bảng nhân viên (Table & Filter)
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]); // Dùng cho dropdown filter
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // --- FETCH DATA ---
  const loadDashboard = useCallback(async () => {
    try {
      // Gọi song song: 1. Tổng hợp Dashboard, 2. List Nhân viên, 3. List Phòng ban
      // Lý do: dashboard.service trả về số liệu tổng hợp, không trả về raw list cho Table
      const [summaryData, employeesData, departmentsData] = await Promise.all([
        dashboardService.getSummary(),
        employeeService.getAll({ includeDeleted: false }),
        departmentService.getAll({ includeDeleted: false, enrich: false })
      ]);

      setSummary(summaryData);
      setDepartments(departmentsData || []);

      // Enrich tên phòng ban cho list nhân viên để hiển thị Table đẹp hơn
      const deptMap = (departmentsData || []).reduce((acc, d) => ({...acc, [d.code]: d.name}), {});
      const enrichedEmps = (employeesData || []).map(e => ({
         ...e,
         departmentName: deptMap[e.department] || e.department
      }));
      setEmployees(enrichedEmps);

    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải dữ liệu: " + err.message);
    }
  }, [toast]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // --- FILTER LOGIC (Client-side) ---
  const filteredEmployees = useMemo(() => {
    const kw = keyword.toLowerCase().trim();
    return employees.filter(e => {
      const matchKw = !kw || (
        (e.name || "").toLowerCase().includes(kw) || 
        (e.code || "").toLowerCase().includes(kw)
      );
      const matchDept = !department || e.department === department;
      return matchKw && matchDept;
    });
  }, [employees, keyword, department]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedData = filteredEmployees.slice((page - 1) * pageSize, page * pageSize);

  // --- HANDLERS ---
  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Bạn có chắc muốn xóa nhân viên ${emp.name}?`)) return;
    try {
      await employeeService.remove(emp.code);
      toast.success("Đã xóa nhân viên thành công");
      loadDashboard(); // Reload toàn bộ để cập nhật cả số liệu thống kê
    } catch (e) { 
      toast.error(e.message || "Lỗi xóa nhân viên"); 
    }
  };

  // --- LOADING STATE ---
  if (!summary) {
    return <div className="p-4 text-center">Đang tải dữ liệu tổng quan...</div>;
  }

  // Destructure dữ liệu từ summary service
  const { hrStats, attendanceStats, recruitmentStats, payrollStats, charts, widgets } = summary;

  return (
    <div className="dashboard-wrap">
      <h1>Dashboard Nhân sự</h1>
      <p className="text-muted mb-4">Tổng quan tình hình nhân sự hôm nay</p>

      {/* 1. STATS CARDS */}
      <div className="stats">
        <StatCard 
          title="Tổng nhân sự" 
          value={hrStats?.totalActive || 0} 
          icon={<FaUsers />} 
          subText={`Mới: +${hrStats?.newHires || 0} | Nghỉ: ${hrStats?.resigned || 0}`}
        />
        
        <StatCard 
          title="Tỷ lệ biến động (Tháng)" 
          value={`${hrStats?.turnoverRate || 0}%`} 
          icon={<FaUserTimes className="text-danger"/>} 
          subText="So với đầu tháng"
        />
        
        {/* Chỉ hiện lương nếu có quyền */}
        {canViewSalaryInfo ? (
           <StatCard 
             title="Ước tính quỹ lương" 
             value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(payrollStats?.estimatedTotal || 0)} 
             icon={<FaMoneyBillWave className="text-success" />} 
             subText={`${payrollStats?.activeContracts || 0} hợp đồng hiệu lực`}
           />
        ) : (
           /* Nếu không có quyền xem lương, hiện thống kê tuyển dụng */
           <StatCard 
             title="Vị trí cần tuyển" 
             value={recruitmentStats?.vacancies || 0} 
             icon={<FaBriefcase className="text-info" />} 
             subText={`Tổng định biên: ${recruitmentStats?.totalCapacity || 0}`}
           />
        )}

        <StatCard 
          title="Nghỉ phép hôm nay" 
          value={widgets?.onLeaveTodayCount || 0} 
          icon={<FaUserClock className="text-warning"/>}
        />
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="dashboard-grid mt-4">
        {/* Chart 1: Tình hình chấm công hôm nay */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartBar className="me-2 text-primary" />
            <span>Tình hình chuyên cần hôm nay</span>
          </div>
          <div className="card-body">
            <AttendanceChart data={attendanceStats} />
          </div>
        </div>

        {/* Chart 2: Phân bổ nhân sự */}
        <div className="dashboard-card">
          <div className="card-header">
            <FaChartPie className="me-2 text-success" />
            <span>Phân bổ nhân sự theo phòng ban</span>
          </div>
          <div className="card-body">
            <DepartmentRatioList 
              data={charts?.departmentData} 
              totalEmployees={hrStats?.totalActive}
            />
          </div>
        </div>
      </div>

      {/* 3. QUICK ACTIONS */}
      <h3 className="section-title mt-4">Thao tác nhanh</h3>
      <div className="actions">
        <QuickAction 
            label="Thêm nhân viên" 
            icon={<FaUserPlus />} 
            onClick={() => navigate("/hrm/ho-so-nhan-vien/them-moi")} 
        />
        <QuickAction 
            label="Chấm công" 
            icon={<FaUserClock />} 
            onClick={() => navigate("/hrm/cham-cong")} 
        />
        <QuickAction 
            label="Duyệt đơn nghỉ phép" 
            icon={<FaBriefcase />} 
            onClick={() => navigate("/hrm/nghi-phep")} 
            badge={summary.pendingRequests?.leaveCount} // Hiển thị số badge đỏ nếu có đơn chờ
        />
        {canViewSalaryInfo && (
           <QuickAction 
             label="Quản lý lương" 
             icon={<FaMoneyBillWave />} 
             onClick={() => navigate("/hrm/quan-ly-luong")} 
           />
        )}
      </div>

      {/* 4. EMPLOYEE TABLE */}
      <h3 className="section-title mt-4">Danh sách nhân viên</h3>
      <div className="mb-3">
        <EmployeeFilter 
          keyword={keyword} department={department}
          departmentOptions={departments.map(d => ({value: d.code, label: d.name}))}
          onKeywordChange={(v) => {setKeyword(v); setPage(1)}}
          onDepartmentChange={(v) => {setDepartment(v); setPage(1)}}
          onClear={() => {setKeyword(""); setDepartment(""); setPage(1)}}
        />
      </div>
      
      <EmployeeTable
        data={paginatedData} 
        page={page} 
        totalPages={totalPages}
        onPrev={() => setPage(p => Math.max(1, p-1))} 
        onNext={() => setPage(p => Math.min(totalPages, p+1))}
        onView={(e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}`)}
        onEdit={canEditEmployee ? (e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}/chinh-sua`) : undefined}
        onDelete={canEditEmployee ? handleDeleteEmployee : undefined}
      />
    </div>
  );
}