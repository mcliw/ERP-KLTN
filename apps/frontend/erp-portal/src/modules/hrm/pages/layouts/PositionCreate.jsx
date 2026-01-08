// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/PositionCreate.jsx

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import PositionForm from "../../components/layouts/PositionForm";
import { positionService } from "../../services/position.service";

/* =========================
 * Component
 * ========================= */

export default function PositionCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Handlers
   * ========================= */

  const handleCreate = async (formData) => {
    if (submitting) return;

    setSubmitting(true);

    const payload = {
      ...formData,
    };

    try {
      await positionService.create(payload);

      navigate("/hrm/chuc-vu");
    } catch (err) {
      if (err?.status === 409 && err?.field === "code") {
        alert("Mã chức vụ đã tồn tại");
      } else if (err?.field) {
        alert(err.message);
      } else {
        alert("Có lỗi khi tạo chức vụ");
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
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}