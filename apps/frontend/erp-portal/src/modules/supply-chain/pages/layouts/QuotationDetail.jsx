// apps/frontend/erp-portal/src/modules/supply-chain/pages/QuotationDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { quotationService } from "../../services/quotation.service";
import { purchaseRequestService } from "../../services/purchaseRequest.service";
import { useFetchDetail } from "../../../../shared/hooks/useFetchDetail";
import { formatDate } from "../../../../shared/utils/format";
import {
  DetailHeader, DetailTop, DetailSection, DetailGrid, DetailItem, EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";
import { FaCheck, FaTimes, FaShoppingCart, FaCheckDouble, FaExclamationTriangle } from "react-icons/fa";

// Helper style cho status
const getStatusColor = (status) => {
  switch (status) {
    case "APPROVED": return "text-success font-weight-bold";
    case "REJECTED": return "text-danger";
    case "PENDING": return "text-warning font-weight-bold";
    default: return "text-secondary";
  }
};

// Helper format tiền tệ
const formatCurrency = (amount) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State lưu tên hiển thị
  const [refNames, setRefNames] = useState({ 
    supplierName: "Đang tải...", 
    prCode: "Đang tải...", 
    prReason: ""
  });

  const [quoteItems, setQuoteItems] = useState([]);

  // 1. Fetch dữ liệu Detail
  const { data: quote, loading } = useFetchDetail(quotationService.getById, id);

  // 2. Effect: Load data tham chiếu (Supplier & PR)
  useEffect(() => {
    if (!quote) return;

    let mounted = true;

    const fetchReferenceData = async () => {
      try {
        const [suppliers, prs, products] = await Promise.all([
          quotationService.getSuppliersRef(),   
          purchaseRequestService.getAll(),
          purchaseRequestService.getProductsRef()
        ]);

        if (mounted) {
          const supplier = suppliers.find(s => String(s.id) === String(quote.supplier_id));
          const supplierName = supplier ? supplier.name : `NCC ID: ${quote.supplier_id}`;

          const pr = prs.find(p => String(p.id) === String(quote.pr_id));
          const prCode = pr ? pr.pr_code : `PR ID: ${quote.pr_id}`;
          const prReason = pr ? pr.reason : "";

          setRefNames({ supplierName, prCode, prReason });

          if (quote.items && Array.isArray(quote.items)) {
              const enrichedItems = quote.items.map(item => {
                  const product = products.find(p => String(p.id) === String(item.product_id));
                  return {
                      ...item,
                      product_code: product ? product.code : item.product_id,
                      product_name: product ? product.name : "Sản phẩm không xác định",
                      unit: product ? product.unit : "Cái",
                      description: product ? `Hãng: ${product.brand} | BH: ${product.warranty} tháng` : ""
                  };
              });
              setQuoteItems(enrichedItems);
          }
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu tham chiếu:", error);
      }
    };

    fetchReferenceData();

    return () => { mounted = false; };
  }, [quote]);

  // --- ACTIONS ---

  const handleApprove = async () => {
    if (!window.confirm("Xác nhận PHÊ DUYỆT báo giá này?")) return;
    try {
      await quotationService.approve(id);
      alert("Đã duyệt báo giá!");
      window.location.reload(); 
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Nhập lý do từ chối:");
    if (reason === null) return; // Người dùng bấm Cancel
    
    if (!reason.trim()) {
        alert("Vui lòng nhập lý do từ chối!");
        return;
    }

    try {
      await quotationService.reject(id, reason);
      alert("Đã từ chối báo giá.");
      window.location.reload(); 
    } catch (error) {
      alert("Lỗi: " + error.message);
    }
  };

  const handleSelect = async () => {
    if (!window.confirm("Bạn muốn CHỌN báo giá này để đặt hàng?\n\nHành động này sẽ duyệt báo giá và đánh dấu là 'Đã chọn'.")) return;
    try {
        await quotationService.select(id);
        alert("Đã chọn báo giá thành công!");
        window.location.reload();
    } catch (error) {
        alert("Lỗi: " + error.message);
    }
  };

  // ------------------------------------

  if (loading) return <div style={{ padding: 20 }}>Đang tải dữ liệu...</div>;
  if (!quote) return <div style={{ padding: 20 }}>Không tìm thấy báo giá</div>;

  // Logic hiển thị nút
  const isLocked = quote.is_selected || quote.status === "REJECTED"; 
  const canEdit = !isLocked && quote.status !== "APPROVED"; 
  
  const showApprove = quote.status === "PENDING";
  const showSelect = quote.status === "APPROVED" && !quote.is_selected; 
  const showReject = quote.status !== "REJECTED" && !quote.is_selected;

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết Báo giá nhà cung cấp"
        onBack={() => navigate("/supply-chain/bao-gia")}
        actions={
          <div className="d-flex align-items-center gap-2">
            {showApprove && (
              <button className="btn-success mr-2" onClick={handleApprove}>
                <FaCheck /> <span>Duyệt</span>
              </button>
            )}

            {showSelect && (
                 <button className="btn-primary mr-2" onClick={handleSelect} title="Chọn báo giá này để làm PO">
                    <FaCheckDouble /> <span>Chọn Mua</span>
                 </button>
            )}

            {showReject && (
              <button className="btn-danger mr-2" onClick={handleReject}>
                <FaTimes /> <span>Từ chối</span>
              </button>
            )}

            {canEdit && (
              <EditButton
                label="Chỉnh sửa"
                onClick={() => navigate(`/supply-chain/bao-gia/${id}/chinh-sua`)}
              />
            )}
          </div>
        }
      />

      {/* Top Section */}
      <DetailTop
        title={quote.rfq_code}
        subtitle={`Nhà cung cấp: ${refNames.supplierName} • Ngày báo: ${formatDate(quote.quotation_date)}`}
        status={quote.status}
        statusColor={getStatusColor(quote.status)}
        isDeleted={Boolean(quote.deletedAt)}
      />

      {/* ======================================================== */}
      {/* KHỐI HIỂN THỊ TRẠNG THÁI ĐẶC BIỆT (TỪ CHỐI / ĐƯỢC CHỌN) */}
      {/* ======================================================== */}
      {quote.status === "REJECTED" && quote.rejection_reason && (
          <div 
            className="profile-item" 
            style={{ marginTop: 15, color: "#ef4444" }}
          >
            <strong><i className="fa fa-exclamation-triangle mr-1"></i> Lý do từ chối:</strong>
            <div className="mt-1" style={{ whiteSpace: "pre-wrap" }}>
              {quote.rejection_reason}
            </div>
          </div>
      )}

      {/* 2. Hiển thị ĐÃ ĐƯỢC CHỌN */}
      {quote.is_selected && (
          <div className="alert alert-success mt-3 d-flex align-items-center">
              <div>
                  <strong>BÁO GIÁ ĐƯỢC CHỌN</strong>
                  <div>Báo giá này đã được chấp nhận để tiến hành đặt hàng (Purchase Order).</div>
              </div>
          </div>
      )}

      {/* Thông tin chung */}
      <DetailSection title="Thông tin chi tiết">
        <DetailGrid>
          <DetailItem label="Mã Báo giá / RFQ" value={quote.rfq_code} />
          <DetailItem label="Nhà cung cấp" value={refNames.supplierName} />
          
          <div className="profile-item">
            <div className="profile-label">Thuộc Yêu cầu (PR)</div>
            <div className="profile-value">
                <a href={`/supply-chain/yeu-cau-mua-hang/${quote.pr_id}`} target="_blank" rel="noreferrer" className="text-primary font-weight-bold">
                    {refNames.prCode}
                </a>
                <div className="text-muted small" style={{marginLeft: 0}}>{refNames.prReason}</div>
            </div>
          </div>

          <DetailItem label="Tổng tiền" value={
              <span className="text-primary font-weight-bold" style={{fontSize: '1.1rem', marginLeft: 0}}>
                  {formatCurrency(quote.total_amount)}
              </span>
          } />

          <DetailItem label="Ngày báo giá" value={formatDate(quote.quotation_date)} />
          <DetailItem label="Hiệu lực đến" value={formatDate(quote.valid_until)} />
          <DetailItem label="Ngày tạo hệ thống" value={formatDate(quote.createdAt)} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Danh mục hàng hóa">
        <div className="table-responsive">
            <table className="main-table mt-2">
                <thead>
                    <tr>
                        <th style={{width: '50px'}}>#</th>
                        <th style={{width: '15%'}}>Mã SP</th>
                        <th>Tên hàng hóa / Mô tả</th>
                        <th className="text-center" style={{width: '80px'}}>ĐVT</th>
                        <th className="text-center" style={{width: '80px'}}>SL</th>
                        <th className="text-right" style={{width: '15%'}}>Đơn giá</th>
                        <th className="text-right" style={{width: '15%'}}>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {quoteItems.length > 0 ? (
                        quoteItems.map((item, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td className="text-secondary">{item.product_code}</td>
                                <td>
                                    <div className="font-weight-bold">{item.product_name}</div>
                                    <small className="text-muted" style={{marginLeft: 0}}>{item.description}</small>
                                </td>
                                <td className="text-center">{item.unit}</td>
                                <td className="text-center font-weight-bold">{item.quantity}</td>
                                <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                <td className="text-right font-weight-bold text-primary">
                                    {formatCurrency(item.total_line || (item.quantity * item.unit_price))}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="7" className="text-center py-4 text-muted" style={{marginLeft: 0}}>Chưa có thông tin hàng hóa</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </DetailSection>

      {/* Ghi chú thêm (Nếu có note khác ngoài lý do từ chối) */}
      {quote.note && (
        <DetailSection title="Ghi chú khác">
            <div>{quote.note}</div>
        </DetailSection>
      )}

    </div>
  );
}