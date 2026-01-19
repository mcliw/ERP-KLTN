import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { quotationService } from "../../services/quotation.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";
// [UPDATE 1] Import thêm FaTimes
import { FaCheck, FaPrint, FaTruck, FaTimes } from "react-icons/fa";

// ... (Giữ nguyên formatCurrency, getStatusColor) ...
const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const getStatusColor = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger font-weight-bold"; // [UPDATE Style]
    case "PENDING": return "text-warning font-weight-bold";
    default: return "text-secondary";
  }
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: po, loading, refresh, refetch } = useFetchDetail(purchaseOrderService.getById, id);
  const reloadData = () => {
      if (typeof refresh === 'function') {
          refresh();
      } else if (typeof refetch === 'function') {
          refetch();
      } else {
          // Fallback cuối cùng: Reload cả trang nếu hook chưa hỗ trợ
          window.location.reload();
      }
  };
  const [poItems, setPoItems] = useState([]);
  const [refData, setRefData] = useState({ 
    supplierName: "Đang tải...", 
    rfqCode: "..."
  });

  useEffect(() => {
    if (!po) return;

    const loadDependencies = async () => {
      try {
        const [itemsResponse, suppliers, quotes, allProducts] = await Promise.all([
          purchaseOrderService.getItemsByPOId(po.id),
          quotationService.getSuppliersRef(),
          quotationService.getAll(),
          purchaseOrderService.getProductsRef()
        ]);

        const enrichedItems = itemsResponse.map(item => {
            const productDetail = allProducts.find(p => String(p.id) === String(item.product_id));
            return {
                ...item,
                product: productDetail || null 
            };
        });

        setPoItems(enrichedItems);

        const supplier = suppliers.find(s => String(s.id) === String(po.supplier_id));
        const quote = quotes.find(q => String(q.id) === String(po.quotation_id));

        setRefData({
          supplierName: supplier ? supplier.name : po.supplier?.name || "---",
          rfqCode: quote ? quote.rfq_code : "---"
        });

      } catch (error) {
        console.error("Lỗi tải dữ liệu phụ thuộc:", error);
      }
    };

    loadDependencies();
  }, [po]);

  // --- ACTIONS ---
  const handleApprove = async () => {
    if (!window.confirm("Xác nhận PHÊ DUYỆT đơn hàng này?")) return;
    try {
      await purchaseOrderService.approve(id, "99");
      alert("Đã phê duyệt đơn mua hàng!");
      reloadData(); // <--- Gọi hàm reload an toàn thay vì refresh() trực tiếp
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Vui lòng nhập lý do từ chối:");
    if (reason === null) return;
    if (reason.trim() === "") {
        alert("Bạn phải nhập lý do để từ chối đơn hàng.");
        return;
    }

    try {
        await purchaseOrderService.reject(id, reason);
        alert("Đã từ chối đơn mua hàng!");
        reloadData(); // <--- Gọi hàm reload an toàn
    } catch (error) {
        alert("Lỗi: " + error.message);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="p-4">Đang tải chi tiết đơn hàng...</div>;
  if (!po) return <div className="p-4 text-danger">Không tìm thấy đơn hàng</div>;

  const canEdit = !["APPROVED", "COMPLETED", "CANCELLED", "REJECTED"].includes(po.status);

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết Đơn mua hàng"
        onBack={() => navigate("/supply-chain/don-mua-hang")}
        actions={
          <div className="d-flex align-items-center gap-2">
            <button className="btn-secondary mr-2" onClick={handlePrint}>
              <FaPrint /> <span>In PO</span>
            </button>
            
            {/* [UPDATE 3] Hiển thị nút Duyệt và Từ chối khi PENDING */}
            {po.status === "PENDING" && (
              <>
                <button className="btn-success mr-2" onClick={handleApprove}>
                  <FaCheck /> <span>Duyệt PO</span>
                </button>
                <button className="btn-danger mr-2" onClick={handleReject}>
                  <FaTimes /> <span>Từ chối</span>
                </button>
              </>
            )}

            {canEdit && (
              <EditButton
                label="Chỉnh sửa"
                onClick={() => navigate(`/supply-chain/don-mua-hang/${id}/chinh-sua`)}
              />
            )}
          </div>
        }
      />

      <DetailTop
        title={`${po.po_code}`}
        subtitle={`Nhà cung cấp: ${refData.supplierName} • Ngày đặt: ${formatDate(po.order_date)}`}
        status={po.status}
        statusColor={getStatusColor(po.status)}
      />

      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã Đơn hàng" value={po.po_code} />
          <DetailItem label="Nhà cung cấp" value={refData.supplierName} />
          
          {/* [UPDATE 4] Hiển thị lý do từ chối nếu có */}
          {po.status === "REJECTED" && (
             <DetailItem 
                label="Lý do từ chối" 
                value={<span className="text-danger font-italic">{po.rejection_reason || "(Không có lý do)"}</span>} 
             />
          )}

          <DetailItem 
            label="Tham chiếu Báo giá" 
            value={
                <a href={`/supply-chain/bao-gia/${po.quotation_id}`} className="text-primary">
                    {refData.rfqCode}
                </a>
            } 
          />
          <DetailItem label="Ngày đặt hàng" value={formatDate(po.order_date)} />
          <DetailItem label="Dự kiến giao" value={
            <span className="text-info font-weight-bold" style={{marginLeft: 0}}>
                <FaTruck className="mr-1"/> {formatDate(po.expected_delivery_date)}
            </span>
          } />
          <DetailItem label="Người duyệt" value={po.approved_by || "---"} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Danh mục hàng hóa">
        <table className="main-table mt-2">
          <thead>
            <tr>
              <th style={{width: "50px"}}>#</th>
              <th style={{width: "120px"}}>Mã SP</th>
              <th>Tên hàng hóa / Mô tả</th>
              <th className="text-center">ĐVT</th>
              <th className="text-right">SL</th>
              <th className="text-right">Đơn giá</th>
              <th className="text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {poItems.length > 0 ? (
              poItems.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="text-secondary">
                    {item.product ? item.product.code : item.product_id}
                  </td>
                  <td>
                      <div className="font-weight-bold">
                        {item.product ? item.product.name : "Sản phẩm không xác định"}
                      </div>
                      {item.product && (
                        <small className="text-muted d-block" style={{fontSize: '0.85em', marginLeft: 0}}>
                            Bảo hành: {item.product.warranty} tháng | Hãng: {item.product.brand}
                        </small>
                      )}
                  </td>
                  <td className="text-center">{item.product?.unit || "Cái"}</td>
                  <td className="text-right font-weight-bold">{item.quantity_ordered}</td>
                  <td className="text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="text-right text-primary font-weight-bold">
                    {formatCurrency(item.total_line_amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="text-center py-4">Đang tải dữ liệu hàng hóa...</td></tr>
            )}
          </tbody>
        </table>
      </DetailSection>

      <div className="profile-section mt-3">
        <div className="row justify-content-end">
            <div className="col-md-5">
                <div className="p-3 bg-light rounded border">
                    <div className="d-flex justify-content-between mb-2">
                        <span>Tiền hàng:</span>
                        <span className="font-weight-bold">
                            {formatCurrency(po.total_amount - (po.tax_amount || 0) + (po.discount_amount || 0))}
                        </span>
                    </div>
                    <div className="d-flex justify-content-between mb-2 text-success">
                        <span>Chiết khấu:</span>
                        <span>- {formatCurrency(po.discount_amount)}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                        <span>Thuế VAT (10%):</span>
                        <span>{formatCurrency(po.tax_amount)}</span>
                    </div>
                    <hr/>
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="h6 mb-0 text-primary">TỔNG THANH TOÁN:</span>
                        <span className="h5 mb-0 text-primary font-weight-bold">
                            {formatCurrency(po.total_amount)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}