// src/modules/hrm/pages/layouts/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import StatCard from "../../components/layouts/StatCard";
import QuickAction from "../../components/layouts/QuickAction";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";

import { FaUserPlus, FaUserTag, FaUsers, FaPlus } from "react-icons/fa";

import { dashboardService } from "../../services/dashboard.service";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";

import "../styles/dashboard.css";

export default function HRMDashboard() {
  const navigate = useNavigate();

  /* =====================
   * STATE
   * ===================== */
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingEmployees: 0,
    todayLeaveCount: 0,
    departmentCount: 0,
  });

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 5;

  const user = useAuthStore((s) => s.user);

    const canEditEmployee = hasPermission(
        user?.role,
        HRM_PERMISSIONS.EMPLOYEE_EDIT
    );

    const canCreateDepartment = hasPermission(
        user?.role,
        HRM_PERMISSIONS.DEPARTMENT_EDIT
    );

    const canCreatePosition = hasPermission(
        user?.role,
        HRM_PERMISSIONS.POSITION_EDIT
    );

  /* =====================
   * FETCH DASHBOARD
   * ===================== */
  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const { stats, raw } = await dashboardService.getOverview();

    /* ===== Map department code -> name ===== */
    const departmentMap = raw.departments.reduce((acc, d) => {
      acc[d.code] = d.name;
      return acc;
    }, {});

    const positionMap = raw.positions.reduce((acc, p) => {
        acc[p.code] = p.name;
        return acc;
    }, {});

    /* ===== Enrich employees for display ===== */
    const normalizedEmployees = raw.employees.map((e) => ({
      ...e,

      // giữ code để filter
      departmentCode: e.department,

      // field hiển thị
      department: departmentMap[e.department] || e.department,
      position: positionMap[e.position] || e.position,
    }));

    setStats(stats);
    setDepartments(raw.departments);
    setEmployees(normalizedEmployees);
  }

  /* =====================
   * FILTER OPTIONS
   * ===================== */
  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        label: d.name,
        value: d.code,
      })),
    [departments]
  );

  const statusOptions = [
    { label: "Đang làm việc", value: "Đang làm việc" },
    { label: "Nghỉ việc", value: "Nghỉ việc" },
  ];

  /* =====================
   * FILTER + PAGINATION
   * ===================== */
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchKeyword =
        e.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        e.email?.toLowerCase().includes(keyword.toLowerCase());

      const matchDept = department
        ? e.departmentCode === department
        : true;

      const matchStatus = status
        ? e.status === status
        : true;

      return matchKeyword && matchDept && matchStatus;
    });
  }, [employees, keyword, department, status]);

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page]);

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
            onClick={() =>
            navigate("/hrm/ho-so-nhan-vien/them-moi")
            }
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

        {/* ===== CREATE DEPARTMENT ===== */}
        {canCreateDepartment && (
            <QuickAction
            label="Thêm phòng ban"
            icon={<FaPlus />}
            onClick={() =>
                navigate("/hrm/phong-ban/them-moi")
            }
            />
        )}

        {/* ===== CREATE POSITION ===== */}
        {canCreatePosition && (
            <QuickAction
            label="Thêm chức vụ"
            icon={<FaPlus />}
            onClick={() =>
                navigate("/hrm/chuc-vu/them-moi")
            }
            />
        )}
        </div>

      <h3 className="section-title">Danh sách nhân viên</h3>

      <EmployeeFilter
        keyword={keyword}
        department={department}
        status={status}
        departmentOptions={departmentOptions}
        statusOptions={statusOptions}
        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onDepartmentChange={(v) => {
          setDepartment(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
      />

      <EmployeeTable
        data={paginatedEmployees}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        onRowClick={(emp) =>
          navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)
        }
        onView={(emp) =>
          navigate(`/hrm/ho-so-nhan-vien/${emp.code}`)
        }
        onEdit={
          canEditEmployee
            ? (emp) =>
                navigate(
                  `/hrm/ho-so-nhan-vien/${emp.code}/chinh-sua`
                )
            : undefined
        }
        onDelete={
          canEditEmployee
            ? (emp) => console.log("Delete employee:", emp.code)
            : undefined
        }
      />
    </div>
  );
}
