// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/OnLeaveEdit.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import OnLeaveForm from "../../components/layouts/OnLeaveForm";
import { onLeaveService } from "../../services/onLeave.service";

export default function OnLeaveEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [onLeave, setOnLeave] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------- LOAD DATA -------------------- */
  useEffect(() => {
    onLeaveService.getById(id).then((data) => {
      setOnLeave(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  }

  if (!onLeave) {
    return <div style={{ padding: 20 }}>Không tìm thấy đơn nghỉ</div>;
  }

  /* -------------------- UPDATE -------------------- */
  const handleUpdate = async (data) => {
    try {
      await onLeaveService.update(id, data);
    } catch (e) {
      alert("Có lỗi khi cập nhật đơn nghỉ");
      return;
    }

    navigate(`/hrm/nghi-phep/${id}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <OnLeaveForm
        mode="edit"
        initialData={onLeave}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
