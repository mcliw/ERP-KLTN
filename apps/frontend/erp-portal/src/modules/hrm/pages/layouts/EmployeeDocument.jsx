// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/EmployeeDocument.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { FaUserPlus } from "react-icons/fa";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import { employeeService } from "../../services/employee.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";
import { useToast } from "../../../../shared/components/ToastProvider";

export default function EmployeeDocument() {
  const navigate = useNavigate();
  const { departmentMap, positionMap } = useLookupMaps();

  const { data: employees, loading, refresh } = useAsyncData(employeeService.getAll);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const toast = useToast();

  const departmentOptions = useMemo(
    () => Object.entries(departmentMap).map(([value, label]) => ({ value, label })),
    [departmentMap]
  );

  // ✅ FIX: positionOptions value = position CODE (không dùng label)
  const positionOptions = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => {
      const code = e.position;
      if (!code) return;
      if (department && e.department !== department) return; // UX: lọc theo phòng ban đang chọn
      if (!map.has(code)) map.set(code, { value: code, label: positionMap[code] || code });
    });
    return Array.from(map.values());
  }, [employees, positionMap, department]);

  const filteredEmployees = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return employees.filter((e) => {
      const matchKeyword =
        !kw ||
        e.name?.toLowerCase().includes(kw) ||
        e.email?.toLowerCase().includes(kw);

      const matchDepartment = !department || e.department === department;
      const matchPosition = !position || e.position === position; // ✅ FIX
      const matchGender = !gender || e.gender === gender;
      const matchStatus = !status || e.status === status;

      return matchKeyword && matchDepartment && matchPosition && matchGender && matchStatus;
    });
  }, [employees, keyword, department, position, gender, status]);

  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredEmployees, 7);

  const handleDelete = async (emp) => {
    if (!window.confirm(`Xoá hồ sơ ${emp.name}?`)) return;

    try {
      await employeeService.remove(emp.code);
      toast.error(`Đã xoá hồ sơ "${emp.name}"`);
      refresh();
    } catch (err) {
      toast.error(err?.message || "Không thể xoá hồ sơ nhân viên");
    }
  };

  const handleClearFilter = () => {
    setKeyword("");
    setDepartment("");
    setPosition("");
    setGender("");
    setStatus("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý hồ sơ nhân viên"
        createLabel="Tạo hồ sơ"
        createIcon={<FaUserPlus />}
        onCreate={() => navigate("/hrm/ho-so-nhan-vien/them-moi")}
        onRestore={() => navigate("/hrm/ho-so-nhan-vien/khoi-phuc")}
      />

      <EmployeeFilter
        keyword={keyword}
        department={department}
        position={position}
        gender={gender}
        status={status}
        departmentOptions={departmentOptions}
        positionOptions={positionOptions}
        genderOptions={[
          { value: "Nam", label: "Nam" },
          { value: "Nữ", label: "Nữ" },
          { value: "Khác", label: "Khác" },
        ]}
        statusOptions={[
          { value: "Đang làm việc", label: "Đang làm việc" },
          { value: "Nghỉ việc", label: "Nghỉ việc" },
        ]}
        onKeywordChange={setKeyword}
        onDepartmentChange={(v) => {
          setDepartment(v);
          setPosition("");
        }}
        onPositionChange={setPosition}
        onGenderChange={setGender}
        onStatusChange={setStatus}
        onClear={handleClearFilter}
      />

      <EmployeeTable
        data={paginatedData}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}`)}
        onView={(e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}`)}
        onEdit={(e) => navigate(`/hrm/ho-so-nhan-vien/${e.code}/chinh-sua`)}
        onDelete={handleDelete}
      />
    </div>
  );
}
