// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionDocument.jsx

import { useNavigate } from "react-router-dom";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import PositionTable from "../../components/layouts/PositionTable";
import PositionFilter from "../../components/layouts/PositionFilter";
import { positionService } from "../../services/position.service";
import { useLookupMaps } from "../../hooks/useLookupMaps";
import "../styles/document.css";
import "../../../../shared/styles/button.css";
import { FaPlus, FaRecycle } from "react-icons/fa";
import { useAuthStore } from "../../../../auth/auth.store";
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";

/* =========================
 * Helpers
 * ========================= */

const normalizeText = (v) =>
  String(v || "").trim().toLowerCase();

/* =========================
 * Component
 * ========================= */

export default function PositionDocument() {
  const navigate = useNavigate();
  const { departmentMap } = useLookupMaps();

  /* =========================
   * State
   * ========================= */

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 7;

  const user = useAuthStore((s) => s.user);

  const canEditPosition = hasPermission(
    user?.role,
    HRM_PERMISSIONS.POSITION_EDIT
  );

  /* =========================
   * Data loader
   * ========================= */

  const loadPositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await positionService.getAll();
      setPositions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  /* =========================
   * Filter options
   * ========================= */

  const departmentOptions = useMemo(
    () =>
      Object.entries(departmentMap).map(
        ([value, label]) => ({
          value,
          label,
        })
      ),
    [departmentMap]
  );

  const statusOptions = [
    { value: "Hoạt động", label: "Hoạt động" },
    { value: "Ngưng hoạt động", label: "Ngưng hoạt động" },
  ];

  /* =========================
   * Filtering
   * ========================= */

  const filteredPositions = useMemo(() => {
    const kw = normalizeText(keyword);

    return positions.filter((p) => {
      const matchKeyword =
        !kw ||
        normalizeText(p.name).includes(kw) ||
        normalizeText(p.code).includes(kw);

      const matchDepartment =
        !department || p.department === department;

      const matchStatus =
        !status || p.status === status;

      return (
        matchKeyword &&
        matchDepartment &&
        matchStatus
      );
    });
  }, [positions, keyword, department, status]);

  /* =========================
   * Pagination
   * ========================= */

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPositions.length / pageSize)
  );

  const paginatedPositions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPositions.slice(
      start,
      start + pageSize
    );
  }, [filteredPositions, page]);

  /* =========================
   * Handlers
   * ========================= */

  const handleDelete = async (pos) => {
    if (pos.assigneeCount > 0) {
      alert(
        "Không thể xoá chức vụ vì đang có nhân viên đảm nhận"
      );
      return;
    }

    const ok = window.confirm(
      `Xoá chức vụ ${pos.name}?`
    );
    if (!ok) return;

    try {
      await positionService.remove(pos.code);
      await loadPositions();
    } catch (err) {
      alert(
        err.message || "Không thể xoá chức vụ"
      );
    }
  };

  /* =========================
   * Render
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  return (
    <div className="main-document">
      {/* HEADER */}
      <div className="page-header">
        <h2>Quản lý chức vụ</h2>

        <div style={{ display: "flex", gap: 10 }}>
          {canEditPosition && (
            <button
              className="btn-primary"
              onClick={() =>
                navigate("/hrm/chuc-vu/them-moi")
              }
            >
              <FaPlus />
              <span>Thêm chức vụ</span>
            </button>
          )}

          {/* ♻️ KHÔI PHỤC */}
          {canEditPosition && (
            <button
              className="btn-restore"
              onClick={() =>
                navigate("/hrm/chuc-vu/khoi-phuc")
              }
            >
              <FaRecycle />
              <span>Khôi phục</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER */}
      <PositionFilter
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
        onClear={() => {
          setKeyword("");
          setDepartment("");
          setStatus("");
          setPage(1);
        }}
      />

      {/* TABLE */}
      <PositionTable
        data={paginatedPositions}
        departmentMap={departmentMap}
        page={page}
        totalPages={totalPages}
        onPrev={() =>
          setPage((p) => Math.max(p - 1, 1))
        }
        onNext={() =>
          setPage((p) =>
            Math.min(p + 1, totalPages)
          )
        }
        onRowClick={(p) =>
          navigate(`/hrm/chuc-vu/${p.code}`)
        }
        onView={(p) =>
          navigate(`/hrm/chuc-vu/${p.code}`)
        }
        onEdit={
          canEditPosition
          ? (p) =>
          navigate(
            `/hrm/chuc-vu/${p.code}/chinh-sua`
          ) : undefined
        }
        onDelete={canEditPosition ? handleDelete : undefined}
      />
    </div>
  );
}