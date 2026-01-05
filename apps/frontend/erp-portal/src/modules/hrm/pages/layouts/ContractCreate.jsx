// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/ContractCreate.jsx

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ContractForm from "../../components/layouts/ContractForm";
import { contractService } from "../../services/contract.service";

/* =========================
 * Component
 * ========================= */

export default function ContractCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  /* =========================
   * Handlers
   * ========================= */

  const handleCreate = async (formData) => {
    if (submitting) return;

    setSubmitting(true);

    try {
      const created = await contractService.create(formData);

      // 👉 sau này có thể navigate sang detail
      // navigate(`/hrm/hop-dong-lao-dong/${created.contractCode}`);

      navigate("/hrm/hop-dong-lao-dong");
    } catch (err) {
      if (err?.status === 409 && err.field === "contractCode") {
        alert("Mã hợp đồng đã tồn tại");
      } else if (
        err?.status === 409 &&
        err.field === "employeeCode"
      ) {
        alert("Nhân viên đã có hợp đồng hiệu lực");
      } else if (err?.status === 400) {
        alert(err.message || "Dữ liệu không hợp lệ");
      } else {
        alert("Có lỗi khi tạo hợp đồng");
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
        mode="create"
        onSubmit={handleCreate}
        onCancel={() => navigate(-1)}
        disabled={submitting}
      />
    </div>
  );
}