// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeave.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import OnLeaveTable from "../../components/layouts/OnLeaveTable";
import OnLeaveFilter from "../../components/layouts/OnLeaveFilter";
import { onLeaveService } from "../../services/onLeave.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaPlus } from "react-icons/fa";

export default function OnLeave() {
  const navigate = useNavigate();

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
    return onLeaves.filter((e) => {
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
  }, [onLeaves, keyword, department, leaveType, status]);

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

        <button
          className="btn-primary"
          onClick={() =>
            navigate("/hrm/nghi-phep/them-moi")
          }
        >
          <FaPlus />
          <span>Tạo đơn nghỉ</span>
        </button>
      </div>

      {/* FILTER */}
      <OnLeaveFilter
        keyword={keyword}
        department={department}
        leaveType={leaveType}
        status={status}
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
        onEdit={(item) =>
          navigate(`/hrm/nghi-phep/${item.id}/chinh-sua`)
        }
      />
    </div>
  );
}
