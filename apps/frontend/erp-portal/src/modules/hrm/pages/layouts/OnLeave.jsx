// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeave.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import OnLeaveTable from "../../components/layouts/OnLeaveTable";
import OnLeaveFilter from "../../components/layouts/OnLeaveFilter";
import { onLeaveService } from "../../services/onLeave.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaPlus, FaRecycle } from "react-icons/fa";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";

export default function OnLeave() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [onLeaves, setOnLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const { departmentMap, positionMap } = useLookupMaps();
  const [leaveType, setLeaveType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 7;

  /* -------------------- FETCH DATA -------------------- */
  useEffect(() => {
    onLeaveService.getAll().then((data) => {
      setOnLeaves(data);
      setLoading(false);
    });
  }, []);

  /* -------------------- FILTER -------------------- */
  const filteredOnLeaves = useMemo(() => {
    // console.log("Current User:", user);

    return onLeaves.filter((e) => {
      const canViewAll = HRM_PERMISSIONS.LEAVE_EDIT.includes(user?.role);

      if (!canViewAll) {
        // Lấy mã nhân viên của user đang đăng nhập
        // Ưu tiên lấy employeeCode, nếu không có thì lấy id (username)
        const currentUserCode = user?.employeeCode || user?.id;

        // Nếu vẫn không lấy được mã định danh -> Chặn hết (để an toàn)
        if (!currentUserCode) {
          return false;
        }

        // So sánh: Chấp nhận nếu khớp employeeCode HOẶC khớp id (username)
        // Dùng toString() và trim() để tránh lỗi dữ liệu (ví dụ "NV1" vs "NV1 ")
        const codeInRow = e.employeeCode?.toString().trim();
        const codeInUser = currentUserCode.toString().trim();

        if (codeInRow !== codeInUser) {
          return false;
        }
      }

      const kw = keyword.toLowerCase();

      const matchKeyword =
        e.employeeCode?.toLowerCase().includes(kw) ||
        e.employeeName?.toLowerCase().includes(kw);

      const matchDepartment = department
        ? e.department === department
        : true;

      const matchLeaveType = leaveType
        ? e.leaveType === leaveType
        : true;

      const matchStatus = status ? e.status === status : true;

      return (
        matchKeyword &&
        matchDepartment &&
        matchLeaveType &&
        matchStatus
      );
    });
  }, [onLeaves, keyword, department, leaveType, status, user]);

  /* -------------------- FILTER OPTIONS -------------------- */

  // Phòng ban (từ departmentMap)
  const departmentOptions = useMemo(() => {
    return Object.entries(departmentMap || {}).map(
      ([value, label]) => ({ value, label })
    );
  }, [departmentMap]);

  // Loại nghỉ
  const leaveTypeOptions = useMemo(
    () => [
      { value: "Nghỉ phép", label: "Nghỉ phép" },
      { value: "Nghỉ không lương", label: "Nghỉ không lương" },
      { value: "Nghỉ việc", label: "Nghỉ việc" },
    ],
    []
  );

  // Trạng thái
  const statusOptions = useMemo(
    () => [
      { value: "Chờ duyệt", label: "Chờ duyệt" },
      { value: "Đã duyệt", label: "Đã duyệt" },
      { value: "Từ chối", label: "Từ chối" },
    ],
    []
  );

  // Kiểm tra quyền
  const checkPermission = (item) => {
    const isPending = item.status === "Chờ duyệt";
    const isManager = HRM_PERMISSIONS.LEAVE_EDIT.includes(user?.role);
    
    return isManager || isPending;
  };

  /* -------------------- PAGINATION -------------------- */
  const totalPages = Math.ceil(
    filteredOnLeaves.length / pageSize
  );

  const paginatedOnLeaves = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOnLeaves.slice(start, start + pageSize);
  }, [filteredOnLeaves, page]);

  if (loading)
    return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Quản lý đơn nghỉ</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn-primary"
            onClick={() =>
              navigate("/hrm/nghi-phep/them-moi")
            }
          >
            <FaPlus />
            <span>Tạo đơn nghỉ</span>
          </button>

          {/* ♻️ KHÔI PHỤC */}
          <button
            className="btn-restore"
            onClick={() =>
              navigate("/hrm/nghi-phep/khoi-phuc")
            }
          >
            <FaRecycle />
            <span>Khôi phục</span>
          </button>
        </div>
      </div>

      {/* FILTER */}
      <OnLeaveFilter
        keyword={keyword}
        department={department}
        leaveType={leaveType}
        status={status}

        departmentOptions={departmentOptions}
        leaveTypeOptions={leaveTypeOptions}
        statusOptions={statusOptions}

        onKeywordChange={(v) => {
          setKeyword(v);
          setPage(1);
        }}
        onDepartmentChange={(v) => {
          setDepartment(v);
          setPage(1);
        }}
        onLeaveTypeChange={(v) => {
          setLeaveType(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onClear={() => {
          setKeyword("");
          setDepartment("");
          setLeaveType("");
          setStatus("");
          setPage(1);
        }}
      />

      {/* TABLE */}
      <OnLeaveTable
        data={paginatedOnLeaves}
        departmentMap={departmentMap}
        positionMap={positionMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() =>
          setPage((p) => Math.min(p + 1, totalPages))
        }
        onRowClick={(item) =>
          navigate(`/hrm/nghi-phep/${item.id}`)
        }
        onView={(item) =>
          navigate(`/hrm/nghi-phep/${item.id}`)
        }
        onEdit={(item) => {
          if (!checkPermission(item)) {
             alert("Bạn chỉ có thể chỉnh sửa đơn ở trạng thái 'Chờ duyệt'");
             return;
          }
          navigate(`/hrm/nghi-phep/${item.id}/chinh-sua`)
        }}
        onDelete={async (item) => {
          if (!checkPermission(item)) {
             alert("Bạn chỉ có thể xóa đơn ở trạng thái 'Chờ duyệt'");
             return;
          }
          if (!window.confirm("Xóa đơn nghỉ này?")) return;
          await onLeaveService.remove(item.id);
          setOnLeaves((prev) => prev.filter((x) => x.id !== item.id));
        }}
      />
    </div>
  );
}