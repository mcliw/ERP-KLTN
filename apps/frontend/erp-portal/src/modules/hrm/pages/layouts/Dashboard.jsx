// src/modules/hrm/pages/layouts/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import StatCard from "../../components/layouts/StatCard";
import QuickAction from "../../components/layouts/QuickAction";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";

import { FaUserPlus, FaUserTag, FaUsers, FaPlus } from "react-icons/fa";

import { dashboardService } from "../../services/dashboard.service";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { employeeService } from "../../services/employee.service";
import { useToast } from "../../../../shared/components/ToastProvider";

import "../styles/dashboard.css";

/* =====================
 * Helpers
 * ===================== */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

const normalizeGender = (v) => {
  const s = String(v || "").trim().toLowerCase();
  if (!s) return "";
  if (s === "male" || s === "nam") return "Nam";
  if (s === "female" || s === "nữ" || s === "nu") return "Nữ";
  if (s === "other" || s === "khác" || s === "khac") return "Khác";
  return String(v || "").trim(); // fallback giữ nguyên
};

export default function HRMDashboard() {
  const navigate = useNavigate();

  /* =====================
   * STATE
   * ===================== */
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingEmployees: 0,
    todayLeaveCount: 0,
    departmentCount: 0,
  });

  // filters
  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  /* =====================
   * PERMISSIONS
   * ===================== */
  const canEditEmployee = useMemo(
    () => hasPermission(user?.role, HRM_PERMISSIONS.EMPLOYEE_EDIT),
    [user?.role]
  );

  const canDeleteEmployee = useMemo(
    () => hasPermission(user?.role, HRM_PERMISSIONS.EMPLOYEE_EDIT),
    [user?.role]
  );

  const canCreateDepartment = useMemo(
    () => hasPermission(user?.role, HRM_PERMISSIONS.DEPARTMENT_EDIT),
    [user?.role]
  );

  const canCreatePosition = useMemo(
    () => hasPermission(user?.role, HRM_PERMISSIONS.POSITION_EDIT),
    [user?.role]
  );

  /* =====================
   * FETCH DASHBOARD
   * ===================== */
  const loadDashboard = useCallback(async () => {
    const result = await dashboardService.getOverview();

    const nextStats = result?.stats || {
      totalEmployees: 0,
      workingEmployees: 0,
      todayLeaveCount: 0,
      departmentCount: 0,
    };

    const raw = result?.raw || {
      employees: [],
      departments: [],
      positions: [],
      onLeaves: [],
    };

    const deptList = Array.isArray(raw.departments) ? raw.departments : [];
    const posList = Array.isArray(raw.positions) ? raw.positions : [];
    const empList = Array.isArray(raw.employees) ? raw.employees : [];

    // code -> name
    const departmentMap = deptList.reduce((acc, d) => {
      acc[d.code] = d.name;
      return acc;
    }, {});

    const positionMap = posList.reduce((acc, p) => {
      acc[p.code] = p.name;
      return acc;
    }, {});

    // enrich for display + add filter codes
    const normalizedEmployees = empList.map((e) => ({
      ...e,

      // dùng để filter theo code
      departmentCode: e.department,
      positionCode: e.position,

      // field hiển thị
      department: departmentMap[e.department] || e.department,
      position: positionMap[e.position] || e.position,

      // normalize giới tính để filter ổn định
      gender: normalizeGender(e.gender ?? e.sex ?? e.gioiTinh),
    }));

    setStats(nextStats);
    setDepartments(deptList);
    setPositions(posList);
    setEmployees(normalizedEmployees);
  }, []);

  const handleDeleteEmployee = useCallback(
    async (emp) => {
      if (!emp?.code) return;

      const ok = window.confirm(`Bạn có chắc muốn xóa hồ sơ nhân viên "${emp.name || emp.code}"?`);
      if (!ok) return;

      try {
        await employeeService.remove(emp.code);
        await loadDashboard();

        toast.error(`Đã xóa hồ sơ nhân viên: ${emp.name}`);
      } catch (e) {
        alert(e?.message || "Không thể xóa hồ sơ nhân viên");
        toast.error(e?.message || "Không thể xóa hồ sơ nhân viên");
      }
    },
    [loadDashboard]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =====================
   * FILTER OPTIONS
   * ===================== */
  const departmentOptions = useMemo(
    () =>
      (Array.isArray(departments) ? departments : []).map((d) => ({
        label: d.name,
        value: d.code,
      })),
    [departments]
  );

  const positionOptions = useMemo(
    () =>
      (Array.isArray(positions) ? positions : []).map((p) => ({
        label: p.name,
        value: p.code,
      })),
    [positions]
  );

  const genderOptions = useMemo(
    () => [
      { label: "Nam", value: "Nam" },
      { label: "Nữ", value: "Nữ" },
      { label: "Khác", value: "Khác" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { label: "Đang làm việc", value: "Đang làm việc" },
      { label: "Nghỉ việc", value: "Nghỉ việc" },
    ],
    []
  );

  /* =====================
   * FILTER + PAGINATION
   * ===================== */
  const filteredEmployees = useMemo(() => {
    const kw = normalizeText(keyword);

    return (Array.isArray(employees) ? employees : []).filter((e) => {
      const name = normalizeText(e?.name);
      const email = normalizeText(e?.email);

      const matchKeyword = !kw ? true : name.includes(kw) || email.includes(kw);
      const matchDept = department ? e?.departmentCode === department : true;
      const matchPosition = position ? e?.positionCode === position : true;
      const matchGender = gender ? String(e?.gender || "").trim() === gender : true;
      const matchStatus = status ? e?.status === status : true;

      return matchKeyword && matchDept && matchPosition && matchGender && matchStatus;
    });
  }, [employees, keyword, department, position, gender, status]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredEmployees.length / pageSize)),
    [filteredEmployees.length]
  );

  const paginatedEmployees = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, totalPages]);

  // nếu filter làm totalPages giảm, kéo page về hợp lệ
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  /* =====================
   * HANDLERS
   * ===================== */
  const handleKeywordChange = useCallback((v) => {
    setKeyword(v);
    setPage(1);
  }, []);

  const handleDepartmentChange = useCallback((v) => {
    setDepartment(v);
    setPage(1);
  }, []);

  const handlePositionChange = useCallback((v) => {
    setPosition(v);
    setPage(1);
  }, []);

  const handleGenderChange = useCallback((v) => {
    setGender(v);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((v) => {
    setStatus(v);
    setPage(1);
  }, []);

  const handleClear = useCallback(() => {
    setKeyword("");
    setDepartment("");
    setPosition("");
    setGender("");
    setStatus("");
    setPage(1);
  }, []);

  /* =====================
   * RENDER
   * ===================== */
  return (
    <div className="dashboard-wrap">
      <h1>HRM Dashboard</h1>

      <h3 className="section-title">Thống kê tổng quan</h3>
      <div className="stats">
        <StatCard title="Tổng nhân viên" value={stats.totalEmployees} />
        <StatCard title="Đang làm việc" value={stats.workingEmployees} />
        <StatCard title="Nghỉ phép hôm nay" value={stats.todayLeaveCount} />
        <StatCard title="Phòng ban" value={stats.departmentCount} />
      </div>

      <h3 className="section-title">Thao tác nhanh</h3>
      <div className="actions">
        <QuickAction
          label="Thêm nhân viên"
          icon={<FaUserPlus />}
          onClick={() => navigate("/hrm/ho-so-nhan-vien/them-moi")}
        />

        <QuickAction
          label="Danh sách phòng ban"
          icon={<FaUsers />}
          onClick={() => navigate("/hrm/phong-ban")}
        />

        <QuickAction
          label="Danh sách chức vụ"
          icon={<FaUserTag />}
          onClick={() => navigate("/hrm/chuc-vu")}
        />

        {canCreateDepartment && (
          <QuickAction
            label="Thêm phòng ban"
            icon={<FaPlus />}
            onClick={() => navigate("/hrm/phong-ban/them-moi")}
          />
        )}

        {canCreatePosition && (
          <QuickAction
            label="Thêm chức vụ"
            icon={<FaPlus />}
            onClick={() => navigate("/hrm/chuc-vu/them-moi")}
          />
        )}
      </div>

      <h3 className="section-title">Danh sách nhân viên</h3>

      <EmployeeFilter
        // values
        keyword={keyword}
        department={department}
        position={position}
        gender={gender}
        status={status}
        // options
        departmentOptions={departmentOptions}
        positionOptions={positionOptions}
        genderOptions={genderOptions}
        statusOptions={statusOptions}
        // handlers
        onKeywordChange={handleKeywordChange}
        onDepartmentChange={handleDepartmentChange}
        onPositionChange={handlePositionChange}
        onGenderChange={handleGenderChange}
        onStatusChange={handleStatusChange}
        onClear={handleClear}
      />

      <EmployeeTable
        data={paginatedEmployees}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onRowClick={(emp) => navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)}
        onView={(emp) => navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)}
        onEdit={
          canEditEmployee
            ? (emp) => navigate(`/hrm/ho-so-nhan-vien/${emp.code}/chinh-sua`)
            : undefined
        }
        onDelete={canDeleteEmployee ? handleDeleteEmployee : undefined}
      />
    </div>
  );
}
