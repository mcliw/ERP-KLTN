// apps/frontend/erp-portal/src/modules/supply-chain/pages/InventoryDetail.jsx

import { useParams, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import { inventoryService, TRANSACTION_TYPES } from "../../services/inventory.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { formatDate } from "../../../../shared/utils/format";
import { warehouseService } from "../../services/warehouse.service";
import { binService } from "../../services/bin.service";
import { productService } from "../../services/product.service";
import {
  DetailHeader,
  DetailTop,
  DetailSection,
  DetailGrid,
  DetailItem,
  EditButton
} from "../../../../shared/components/DetailLayout";
import "../../../../shared/styles/detail.css";

// Map màu sắc và nhãn cho loại giao dịch
const TRANS_TYPE_CONFIG = {
  INBOUND: { label: "Nhập kho", color: "text-success" },
  OUTBOUND: { label: "Xuất kho", color: "text-danger" },
  ADJUSTMENT: { label: "Điều chỉnh", color: "text-warning" },
  TRANSFER: { label: "Điều chuyển", color: "text-primary" },
};

export default function InventoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* =========================================
   * 1. Data Fetching
   * ========================================= */
  const fetchData = useCallback(async () => {
    const stock = await inventoryService.getById(id);
    if (!stock) return null;

    // --- MỚI ---
    const [product, warehouse, bin, transactions] = await Promise.all([
      // Dùng service.getById, nếu lỗi/null thì fallback về object rỗng để tránh crash UI
      productService.getById(stock.product_id).then(res => res || { name: `SP #${stock.product_id}`, sku: "N/A" }),
      warehouseService.getById(stock.warehouse_id).then(res => res || { name: `Kho #${stock.warehouse_id}` }),
      binService.getById(stock.bin_id).then(res => res || { code: `Bin #${stock.bin_id}` }),

      inventoryService.getTransactionHistory({
          warehouseId: stock.warehouse_id,
          productId: stock.product_id,
          binId: stock.bin_id
      })
    ]);

    return { stock, product, warehouse, bin, transactions };
  }, [id]);

  const { data, loading } = useAsyncData(fetchData);

  /* =========================================
   * 2. Rendering Logic
   * ========================================= */
  if (loading) return <div style={{ padding: 20 }}>Đang tải thông tin chi tiết...</div>;
  if (!data || !data.stock) return <div style={{ padding: 20 }}>Không tìm thấy dữ liệu tồn kho</div>;

  const { stock, product, warehouse, bin, transactions } = data;

  const isOutOfStock = stock.quantity_available <= 0;
  const statusLabel = isOutOfStock ? "Hết hàng / Đã cấp phát hết" : "Sẵn sàng bán";

  return (
    <div className="main-detail">
      <DetailHeader
        title="Chi tiết tồn kho (Thẻ kho)"
        onBack={() => navigate("/supply-chain/ton-kho")}
        actions={
          <EditButton
            label="Điều chỉnh kho"
            onClick={() => navigate(`/supply-chain/ton-kho/${id}/dieu-chinh`)}
          />
        }
      />

      <DetailTop
        title={product.name}
        subtitle={`${product.sku ? `SKU: ${product.sku}` : ''} • ${warehouse.name} • ${bin.code}`}
        status={statusLabel}
        isDeleted={isOutOfStock} 
      />

      <div className="detail-body">
          {/* Section 1: Số lượng & Ghi chú */}
          <DetailSection title="Thông tin chi tiết">
            <DetailGrid>
              <div className="profile-item">
                 <label>Tồn thực tế (On Hand)</label>
                 <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{stock.quantity_on_hand}</div>
              </div>
              
              <div className="profile-item">
                 <label>Đang giữ hàng (Allocated)</label>
                 <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b' }}>{stock.quantity_allocated}</div>
              </div>

              <div className="profile-item">
                 <label>Có thể bán (Available)</label>
                 <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: isOutOfStock ? '#ef4444' : '#10b981' }}>
                    {stock.quantity_available}
                 </div>
              </div>

              <DetailItem label="Cập nhật lần cuối" value={formatDate(stock.updatedAt)} />

              {/* === THÊM MỚI: HIỂN THỊ GHI CHÚ === */}
              {/* Sử dụng gridColumn: 1 / -1 để chiếm trọn chiều ngang */}
              <div className="profile-item full-width" style={{ gridColumn: "1 / -1", marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #eee" }}>
                <div className="profile-label">Ghi chú / Mô tả bổ sung</div>
                <div className="profile-value" style={{ whiteSpace: "pre-wrap", color: stock.notes ? "inherit" : "#999" }}>
                   {stock.notes || "Không có ghi chú"}
                </div>
              </div>
              {/* ================================== */}

            </DetailGrid>
          </DetailSection>

          {/* Section 2: Thông tin vị trí lưu trữ */}
          <DetailSection title="Thông tin vị trí lưu trữ">
            <DetailGrid>
              <DetailItem label="Kho hàng" value={warehouse.name} />
              <DetailItem label="Mã kho" value={warehouse.code || "-"} />
              <DetailItem label="Vị trí (Bin)" value={bin.code} />
              <DetailItem label="Sức chứa tối đa Bin" value={bin.max_capacity ? `${bin.max_capacity} đơn vị` : "Không giới hạn"} />
              
              <div className="profile-item full-width" style={{ gridColumn: "1 / -1" }}>
                <div className="profile-label">Địa chỉ kho</div>
                <div className="profile-value">{warehouse.address || "—"}</div>
              </div>
            </DetailGrid>
          </DetailSection>

          {/* Section 3: Lịch sử giao dịch */}
          <DetailSection title="Lịch sử giao dịch (Transaction Logs)">
            {transactions.length === 0 ? (
                <div style={{ padding: "10px", color: "#666" }}>Chưa có giao dịch nào được ghi nhận.</div>
            ) : (
                <table className="main-table" style={{ marginTop: 10 }}>
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Loại GD</th>
                            <th>Mã tham chiếu</th>
                            <th className="text-right">Thay đổi</th>
                            <th>Người thực hiện</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(log => {
                            const conf = TRANS_TYPE_CONFIG[log.type] || {};
                            const isPositive = log.quantity_change > 0;
                            
                            return (
                                <tr key={log.id}>
                                    <td>{formatDate(log.transaction_date)}</td>
                                    <td className="font-medium" style={{ color: conf.color ? "" : "inherit" }}>
                                        {/* Lưu ý: class text-success/danger trong map config cần CSS tương ứng, 
                                            hoặc dùng style inline nếu chưa có class */}
                                        {conf.label || log.type}
                                    </td>
                                    <td>
                                        <span className="badge-outline">{log.reference_code || "-"}</span>
                                    </td>
                                    <td className={`text-right font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
                                        {isPositive ? "+" : ""}{log.quantity_change}
                                    </td>
                                    <td>User #{log.performed_by}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
          </DetailSection>
      </div>
    </div>
  );
}