import { useNavigate } from "react-router-dom";
import PositionForm from "../../components/layouts/PositionForm";
import { positionService } from "../../services/position.service";

export default function PositionCreate() {
  const navigate = useNavigate();

  const handleCreate = async (data) => {
    try {
      await positionService.create({ ...data });
      navigate("/hrm/chuc-vu");
    } catch (e) {
      if (e.status === 409 && e.field === "code") alert("Mã chức vụ đã tồn tại");
      else alert("Có lỗi xảy ra khi tạo chức vụ");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <PositionForm mode="create" onSubmit={handleCreate} onCancel={() => navigate(-1)} />
    </div>
  );
}
