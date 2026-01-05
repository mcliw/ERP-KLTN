import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PositionForm from "../../components/layouts/PositionForm";
import { positionService } from "../../services/position.service";

export default function PositionEdit() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    positionService.getByCode(code).then((data) => {
      setPosition(data);
      setLoading(false);
    });
  }, [code]);

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  if (!position) return <div style={{ padding: 20 }}>Không tìm thấy chức vụ</div>;

  const handleUpdate = async (data) => {
    const payload = { ...data };
    delete payload.code;
    await positionService.update(code, payload);
    navigate(`/hrm/chuc-vu/${code}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <PositionForm mode="edit" initialData={position} onSubmit={handleUpdate} onCancel={() => navigate(-1)} />
    </div>
  );
}
