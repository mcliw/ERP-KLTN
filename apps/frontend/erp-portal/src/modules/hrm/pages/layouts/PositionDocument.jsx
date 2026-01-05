import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PositionTable from "../../components/layouts/PositionTable";
import PositionFilter from "../../components/layouts/PositionFilter";
import { positionService } from "../../services/position.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import { FaPlus } from "react-icons/fa";

export default function PositionDocument() {
  const navigate = useNavigate();

  const [positions, setPositions] = useState([]);
  const { departmentMap } = useLookupMaps();
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;

  useEffect(() => {
    positionService.getAll().then((data) => {
      setPositions(data);
      setLoading(false);
    });
  }, []);

  const departmentOptions = useMemo(() => {
    return Object.entries(departmentMap).map(
      ([value, label]) => ({ value, label })
    );
  }, [departmentMap]);

  const statusOptions = useMemo(
    () => [{ value: "Hoạt động", label: "Hoạt động" }, { value: "Ngưng hoạt động", label: "Ngưng hoạt động" }],
    []
  );

  const filtered = useMemo(() => {
    return positions.filter(
      (p) =>
        (p.name?.toLowerCase().includes(keyword.toLowerCase()) ||
          p.code?.toLowerCase().includes(keyword.toLowerCase())) &&
        (department ? p.department === department : true) &&
        (status ? p.status === status : true)
    );
  }, [positions, keyword, department, status]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;

  return (
    <div className="main-document">
      <div className="page-header">
        <h2>Quản lý chức vụ</h2>
        <button className="btn-primary" onClick={() => navigate("/hrm/chuc-vu/them-moi")}>
          <FaPlus /> <span>Thêm chức vụ</span>
        </button>
      </div>

      <PositionFilter
        keyword={keyword}
        department={department}
        status={status}
        departmentOptions={departmentOptions}
        statusOptions={statusOptions}
        onKeywordChange={(v) => { setKeyword(v); setPage(1); }}
        onDepartmentChange={(v) => { setDepartment(v); setPage(1); }}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
      />

      <PositionTable
        data={paginated}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(p - 1, 1))}
        onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        onRowClick={(p) => navigate(`/hrm/chuc-vu/${p.code}`)}
        onView={(p) => navigate(`/hrm/chuc-vu/${p.code}`)}
        onEdit={(p) => navigate(`/hrm/chuc-vu/${p.code}/chinh-sua`)}
        onDelete={async (p) => {
          if (window.confirm(`Xoá chức vụ ${p.name}?`)) {
            await positionService.remove(p.code);
            setPositions((prev) => prev.filter((x) => x.code !== p.code));
          }
        }}
      />
    </div>
  );
}
