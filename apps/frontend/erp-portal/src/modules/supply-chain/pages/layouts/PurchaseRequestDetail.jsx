import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Helper style cho status
// const getStatusColor = (status) => {
//   switch (status) {
//     case "APPROVED": return "success";
//     case "REJECTED": return "danger";
//     case "COMPLETED": return "primary";
//     case "CANCELLED": return "secondary";
//     default: return "warning"; // DRAFT
//   }
// };

const getStatusColor = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger";
    case "COMPLETED": return "text-primary";
    case "CANCELLED": return "text-muted";
    default: return "text-warning"; // DRAFT
  }
};

export default function PurchaseRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State lưu tên hiển thị sau khi đã map ID -> Tên
  const [refNames, setRefNames] = useState({ 
    requesterName: "Đang tải...", 
    deptName: "Đang tải...", 
    productNames: {} 
  });

  // 1. Fetch dữ liệu Master + Items
  const { data: pr, loading } = useFetchDetail(purchaseRequestService.getById, id);

  // 2. Effect: Khi có PR data -> Load thêm các data tham chiếu (NV, PB, SP) để hiển thị tên
  useEffect(() => {
    if (!pr) return;

    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        // Gọi song song 3 API để lấy dữ liệu map
        // Lưu ý: Products nằm ở port 3002 (chung server supply chain)
        const [emps, depts, products] = await Promise.all([
          purchaseRequestService.getEmployeesRef(),   // Port 3001
          purchaseRequestService.getDepartmentsRef(), // Port 3001
          purchaseRequestService.getProductsRef(),
        ]);

        if (mounted) {
          // A. Map Người yêu cầu
          const requester = emps.find(e => String(e.id) === String(pr.requester_id));
          const requesterName = requester ? requester.name : `ID: ${pr.requester_id} (Không tìm thấy)`;

          // B. Map Phòng ban
          const dept = depts.find(d => String(d.id) === String(pr.department_id));
          const deptName = dept ? dept.name : `ID: ${pr.department_id} (Không tìm thấy)`;

          // C. Map Tên sản phẩm { id: "Tên SP" }
          const prodMap = {};
          if (pr.items && Array.isArray(pr.items)) {
             pr.items.forEach(item => {
                const prod = products.find(p => String(p.id) === String(item.product_id));
                prodMap[item.product_id] = prod ? prod.name : `Sản phẩm #${item.product_id}`;
             });
          }

          setRefNames({ requesterName, deptName, productNames: prodMap });
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu tham chiếu:", error);
      }
    };

    fetchReferenceData();

    return () => { mounted = false; };
  }, [pr]);

  // Logic hiển thị Loading / Not Found
  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  if (!pr) return <div style={{ padding: 20 }}>Không tìm thấy phiếu yêu cầu</div>;

  // Logic ẩn nút sửa (Business Rule)
  const canEdit = !["APPROVED", "COMPLETED", "CANCELLED"].includes(pr.status) && !pr.deletedAt;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết yêu cầu mua hàng"
        onBack={() => navigate("/supply-chain/yeu-cau-mua-hang")}
        actions={canEdit && (
          <EditButton
            label="Chỉnh sửa"
            onClick={() => navigate(`/supply-chain/yeu-cau-mua-hang/${id}/chinh-sua`)}
          />
        )}
      />

      {/* Top Section */}
      <DetailTop
        title={pr.pr_code}
        subtitle={`Người tạo: ${refNames.requesterName} • Ngày lập: ${formatDate(pr.request_date)}`}
        status={pr.status}
        statusColor={getStatusColor(pr.status)}
        isDeleted={Boolean(pr.deletedAt)}
      />

      {/* Thông tin chung */}
      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã phiếu (ID)" value={pr.id} />
          <DetailItem label="Phòng ban" value={refNames.deptName} />
          <DetailItem label="Ngày cần hàng" value={formatDate(pr.request_date)} />
          <DetailItem label="Ngày tạo phiếu" value={formatDate(pr.createdAt)} />
        </DetailGrid>

        {/* Lý do mua hàng - Full width */}
        <div className="profile-item full-width mt-3" style={{marginTop: 15}}>
           <div className="profile-label">Lý do / Diễn giải</div>
           <div className="profile-value" style={{ whiteSpace: "pre-wrap" }}>
             {pr.reason || "—"}
           </div>
        </div>
      </DetailSection>

      {/* Danh sách sản phẩm (Master-Detail) */}
      <DetailSection title={`Danh sách sản phẩm (${pr.items?.length || 0})`}>
         {(!pr.items || pr.items.length === 0) ? (
            <div className="text-muted fst-italic py-2">Không có sản phẩm nào trong phiếu này.</div>
         ) : (
             <div className="table-responsive">
                 <table className="main-table" style={{ marginTop: "10px", fontSize: "0.95rem" }}>
                     <thead className="bg-light">
                         <tr>
                             <th style={{ width: "5%" }}>#</th>
                             <th style={{ width: "45%" }}>Tên sản phẩm</th>
                             <th style={{ width: "20%" }}>Số lượng</th>
                             <th style={{ width: "30%" }}>Ngày dự kiến</th>
                         </tr>
                     </thead>
                     <tbody>
                         {pr.items.map((item, index) => (
                             <tr key={index}>
                                 <td className="text-center">{index + 1}</td>
                                 <td>
                                     <span className="font-weight-bold">
                                         {/* Hiển thị tên từ Map, nếu chưa load xong thì hiện ID */}
                                         {refNames.productNames[item.product_id] || item.product_id}
                                     </span>
                                 </td>
                                 <td className="font-weight-bold text-primary">
                                     {item.quantity_requested}
                                 </td>
                                 <td>
                                     {item.expected_date ? formatDate(item.expected_date) : "—"}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
         )}
      </DetailSection>

      {/* Debug Info: Soft Delete */}
      {pr.deletedAt && (
         <DetailSection title="Thông tin lưu trữ">
            <DetailGrid>
                <DetailItem label="Ngày xóa" value={formatDate(pr.deletedAt)} />
                <DetailItem label="Trạng thái" value="Đã xóa tạm thời" />
            </DetailGrid>
         </DetailSection>
      )}
    </div>
  );
}