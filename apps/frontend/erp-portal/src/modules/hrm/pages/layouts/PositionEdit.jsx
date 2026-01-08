// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionEdit.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PositionForm from "../../components/layouts/PositionForm";
import { positionService } from "../../services/position.service";

export default function PositionEdit() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Load position
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadPosition = async () => {
      setLoading(true);
      try {
        const data = await positionService.getByCode(code);
        if (!alive) return;
        setPosition(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadPosition();
    return () => {
      alive = false;
    };
  }, [code]);

  /* =========================
   * Guards
   * ========================= */

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  if (!position) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy chức vụ
      </div>
    );
  }

  if (position.deletedAt) {
    return (
      <div style={{ padding: 20 }}>
        Chức vụ đã bị xoá, không thể chỉnh sửa
      </div>
    );
  }

  /* =========================
   * Handlers
   * ========================= */

  const handleUpdate = async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    const payload = {
      ...formData,
      code: undefined, // 🔒 khóa mã
    };

    try {
      await positionService.update(code, payload);
      navigate(`/hrm/chuc-vu/${code}`);
    } catch (err) {
      if (err?.status === 404) {
        alert("Không tìm thấy chức vụ");
      } else if (err?.field) {
        alert(err.message);
      } else {
        alert("Có lỗi khi cập nhật chức vụ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
   * Render
   * ========================= */

  return (
    <div style={{ padding: 20 }}>
      <PositionForm
        mode="edit"
        initialData={position}
        hasAssignees={(position.assigneeCount ?? 0) > 0}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}