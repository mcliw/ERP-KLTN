// apps/frontend/erp-portal/src/modules/sales/pages/OrderDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { FaCheck, FaTimes, FaExclamationTriangle } from "react-icons/fa";

// Services
import { orderService } from "../../services/order.service";
import { customerService } from "../../services/customer.service";
import { productService } from "../../services/product.service";

// Shared Hooks & Utils
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { useToast } from "../../../../shared/components/ToastProvider";
import { formatDate } from "../../../../shared/utils/format";

// Layout Components
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// --- HELPERS ---

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const getStatusColor = (status) => {
  switch (status) {
    case "SHIPPING": return "text-primary font-weight-bold";
    case "COMPLETED": return "text-success font-weight-bold";
    case "CANCELLED": return "text-danger";
    case "PENDING": return "text-warning";
    default: return "text-muted";
  }
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // State lưu tên hiển thị (Customer, Product)
  const [refNames, setRefNames] = useState({
    customerName: "Đang tải...",
    productNames: {},
    productCodes: {},
  });

  // 1. Fetch dữ liệu Chi tiết đơn hàng
  const { data: order, loading, refresh } = useFetchDetail(orderService.getById, id);

  // 2. Effect: Khi có Order data -> Load thêm các data tham chiếu
  useEffect(() => {
    if (!order) return;

    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        const [customer, products] = await Promise.all([
           order.customer_id ? customerService.getById(order.customer_id) : null,
           productService.getAll()
        ]);

        if (mounted) {
          const customerName = customer 
            ? `${customer.full_name} ${customer.phone ? `(${customer.phone})` : ""}`
            : `Khách hàng #${order.customer_id} (Không tìm thấy)`;

          const namesMap = {};
          const codesMap = {};
          
          if (products && Array.isArray(products)) {
             products.forEach(p => {
                namesMap[p.id] = p.name;
                codesMap[p.id] = p.code;
             });
          }

          setRefNames({ 
              customerName, 
              productNames: namesMap,
              productCodes: codesMap
          });
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu tham chiếu:", error);
      }
    };

    fetchReferenceData();
    return () => { mounted = false; };
  }, [order]);

  // Tính tổng tiền
  const totalAmount = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  }, [order]);

  // --- HANDLERS ---

  const handleApprove = async () => {
    if (!window.confirm("Xác nhận DUYỆT đơn hàng này để giao hàng?")) return;
    
    try {
      // 1. Gọi API cập nhật trước
      await orderService.update(id, { order_status: "SHIPPING" });
      
      // 2. Thông báo thành công NGAY LẬP TỨC nếu API trên không lỗi
      toast.success("Đã phê duyệt đơn hàng!");
      
      // 3. Gọi refresh dữ liệu trong block riêng để tránh trigger lỗi của luồng chính
      try {
        await refresh(); 
      } catch (refreshErr) {
        console.warn("Lỗi làm mới dữ liệu:", refreshErr);
        // Fallback: Nếu refresh lỗi, tự động reload trang để đảm bảo dữ liệu đúng
        window.location.reload();
      }

    } catch (err) {
      // 4. Catch này CHỈ bắt lỗi khi gọi API update (Dòng 1)
      console.error(err);
      toast.error("Lỗi khi phê duyệt (Vui lòng kiểm tra lại)");
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Vui lòng nhập lý do từ chối / hủy đơn:");
    if (reason === null) return; 
    
    if (reason.trim() === "") {
        toast.warning("Vui lòng nhập lý do để tiếp tục!");
        return;
    }

    try {
      // 1. Gọi API hủy
      await orderService.cancel(id, reason);
      
      // 2. Thông báo thành công
      toast.success("Đã từ chối đơn hàng!");
      
      // 3. Refresh dữ liệu an toàn
      try {
        await refresh();
      } catch (refreshErr) {
        console.warn("Lỗi làm mới dữ liệu:", refreshErr);
        window.location.reload();
      }

    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi từ chối đơn");
    }
  };

  // --- RENDER ---
  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  if (!order) return <div style={{ padding: 20 }}>Không tìm thấy đơn hàng</div>;

  // Logic hiển thị nút (Standardized)
  const isFinalState = ["SHIPPING", "COMPLETED", "CANCELLED"].includes(order.order_status);
  const canApprove = !isFinalState; // Tương đương với PENDING

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết đơn hàng"
        onBack={() => navigate("/sales/don-hang")}
        actions={
          <div className="d-flex align-items-center" style={{ gap: '8px' }}>
            {canApprove && (
              <>
                <button 
                    className="btn-success" 
                    onClick={handleApprove}
                    title="Duyệt đơn để giao hàng"
                >
                    <FaCheck /> <span>Duyệt</span>
                </button>
                <button 
                    className="btn-danger" 
                    onClick={handleReject}
                    title="Hủy bỏ đơn hàng"
                >
                    <FaTimes /> <span>Từ chối</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Top Section */}
      <DetailTop
        title={`Đơn hàng #${order.id}`}
        subtitle={`Khách hàng: ${refNames.customerName} • Ngày tạo: ${formatDate(order.created_at)}`}
        status={order.order_status}
        statusColor={getStatusColor(order.order_status)}
      />

      {/* --- HIỂN THỊ LÝ DO HỦY (Nếu bị hủy) --- */}
      {order.order_status === "CANCELLED" && (
          <div 
            className="profile-item" 
            style={{ marginTop: 15, color: "#ef4444", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "6px" }}
          >
            <strong><FaExclamationTriangle className="mr-1" /> Lý do hủy / từ chối:</strong>
            <div className="mt-1" style={{ whiteSpace: "pre-wrap", color: "#b91c1c" }}>
              {order.cancel_reason || "Đang cập nhật..."}
            </div>
          </div>
      )}

      {/* Thông tin chung */}
      <DetailSection title="Thông tin chung">
        <DetailGrid>
          <DetailItem label="Mã đơn hàng" value={order.id} />
          <DetailItem label="Phương thức TT" value={order.payment_method} />
          <DetailItem label="Mã thanh toán" value={order.payment_id || "—"} />
          <DetailItem label="Voucher" value={order.voucher_detail_id || "—"} />
          <DetailItem label="Ngày tạo" value={formatDate(order.created_at)} />
          <DetailItem label="Cập nhật cuối" value={formatDate(order.updated_at)} />
        </DetailGrid>

        <div className="profile-item full-width mt-3" style={{marginTop: 15}}>
           <div className="profile-label">Địa chỉ giao hàng</div>
           <div className="profile-value">
             {order.shipping_address}
           </div>
        </div>
      </DetailSection>

      {/* Danh sách sản phẩm */}
      <DetailSection title={`Danh sách sản phẩm (${order.items?.length || 0})`}>
         {(!order.items || order.items.length === 0) ? (
            <div className="text-muted fst-italic py-2">Không có sản phẩm nào trong đơn này.</div>
         ) : (
             <div className="table-responsive">
                 <table className="main-table" style={{ marginTop: "10px", fontSize: "0.95rem" }}>
                     <thead className="bg-light">
                         <tr>
                             <th style={{ width: "5%" }}>#</th>
                             <th style={{ width: "40%" }}>Sản phẩm</th>
                             <th style={{ width: "20%", textAlign: "right" }}>Đơn giá</th>
                             <th style={{ width: "10%", textAlign: "center" }}>SL</th>
                             <th style={{ width: "25%", textAlign: "right" }}>Thành tiền</th>
                         </tr>
                     </thead>
                     <tbody>
                         {order.items.map((item, index) => {
                             const productName = refNames.productNames[item.product_variant_id] || item.product_variant_id;
                             const productCode = refNames.productCodes[item.product_variant_id] || "---";
                             const lineTotal = Number(item.price) * Number(item.quantity);

                             return (
                                 <tr key={index}>
                                     <td className="text-center">{index + 1}</td>
                                     <td>
                                         <div className="font-weight-bold">{productName}</div>
                                         <small className="text-muted" style={{marginLeft: 0}}>Mã: {productCode}</small>
                                     </td>
                                     <td className="text-right">{formatCurrency(item.price)}</td>
                                     <td className="text-center font-weight-bold">{item.quantity}</td>
                                     <td className="text-right font-weight-bold text-primary">
                                         {formatCurrency(lineTotal)}
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                     <tfoot>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                            <td colSpan="4" className="text-right font-weight-bold">Tổng cộng:</td>
                            <td className="text-right font-weight-bold" style={{ fontSize: "1.1em", color: "#000" }}>
                                {formatCurrency(totalAmount)}
                            </td>
                        </tr>
                     </tfoot>
                 </table>
             </div>
         )}
      </DetailSection>
    </div>
  );
}