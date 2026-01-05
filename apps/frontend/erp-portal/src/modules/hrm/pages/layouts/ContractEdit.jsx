// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/ContractEdit.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ContractForm from "../../components/layouts/ContractForm";
import { contractService } from "../../services/contract.service";

/* =========================
 * Component
 * ========================= */

export default function ContractEdit() {
  const { contractCode } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Load contract
   * ========================= */

  useEffect(() => {
    let alive = true;

    const loadContract = async () => {
      setLoading(true);
      try {
        const data = await contractService.getByCode(
          contractCode
        );
        if (!alive) return;
        setContract(data);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadContract();
    return () => {
      alive = false;
    };
  }, [contractCode]);

  /* =========================
   * Guards
   * ========================= */

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        Đang tải dữ liệu hợp đồng...
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy hợp đồng
      </div>
    );
  }

  if (contract.deletedAt) {
    return (
      <div style={{ padding: 20 }}>
        Hợp đồng đã bị huỷ / xoá, không thể chỉnh sửa
      </div>
    );
  }

  /* =========================
   * Handlers
   * ========================= */

  const handleUpdate = async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    // payload đúng chuẩn service
    const payload = {
      ...formData,
      contractCode: undefined, // khoá mã
      employeeCode: undefined, // không cho đổi nhân viên
    };

    try {
      await contractService.update(contractCode, payload);

      // 👉 sau này có thể điều hướng sang detail
      navigate(
        `/hrm/hop-dong-lao-dong/${contractCode}`
      );
    } catch (err) {
      if (err?.status === 404) {
        alert("Không tìm thấy hợp đồng");
      } else if (err?.status === 400) {
        alert(err.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi khi cập nhật hợp đồng");
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
      <ContractForm
        mode="edit"
        initialData={contract}
        onSubmit={handleUpdate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}