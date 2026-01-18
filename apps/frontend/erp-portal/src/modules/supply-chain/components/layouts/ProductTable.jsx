// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/ProductTable.jsx

import {
  TablePagination,
  TableActions,
  EmptyRow
} from "../../../../shared/components/TableComponents";

// Lưu ý: Nếu bảng products trong DB không có cột deleted_at (soft delete),
// bạn có thể bỏ import này hoặc giữ lại nếu dự định thêm vào sau.
// Ở đây tôi giữ lại logic khung sườn nhưng comment lại phần check deleted
// để bám sát SQL bạn cung cấp (vốn không có deleted_at).
// import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function ProductTable({
  data = [],
  page = 1,
  totalPages = 1,
  onPrev,
  onNext,
  onRowClick,
  onView,
  onEdit,
  onDelete,
  renderExtraActions,
}) {
  const hasActions = onView || onEdit || onDelete || renderExtraActions;
  // Cột: Ảnh, SKU, Tên, Danh mục, Thương hiệu, ĐVT, Bảo hành, Min Stock, (Action)
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th style={{ width: "60px" }}>Ảnh</th>
            <th>SKU</th>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Thương hiệu</th>
            <th>ĐVT</th>
            <th>Bảo hành</th>
            <th>Tồn Min</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <EmptyRow colSpan={colCount} />
          ) : (
            data.map((d) => {
              // Dựa trên SQL cung cấp, không có cột deleted_at.
              // Nếu backend có xử lý soft delete, hãy uncomment dòng dưới:
              // const deleted = isSoftDeleted(d.deletedAt);
              const deleted = false; 
              
              // Logic check có thể xoá hay không. 
              // Ví dụ: Không thể xoá nếu tồn kho > 0 (tuỳ nghiệp vụ)
              const currentStock = d.current_stock ?? 0; // Giả định có field này từ query
              const canDelete = true; // Hoặc logic: currentStock === 0;

              return (
                <tr
                  key={d.product_id}
                  className={[
                    onRowClick && "clickable",
                    deleted && "deleted"
                  ].filter(Boolean).join(" ")}
                  onClick={() => onRowClick?.(d)}
                >
                  {/* Cột Ảnh */}
                  <td>
                    {d.image_url ? (
                      <img 
                        src={d.image_url} 
                        alt={d.sku} 
                        style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} 
                      />
                    ) : (
                      <div style={{ width: "40px", height: "40px", background: "#f0f0f0", borderRadius: "4px" }} />
                    )}
                  </td>

                  {/* Cột SKU */}
                  <td>
                    <span className="font-medium text-primary">{d.sku}</span>
                  </td>

                  {/* Cột Tên sản phẩm */}
                  <td>
                    <div className="flex flex-col">
                      <span>{d.product_name}</span>
                      {d.product_type && (
                        <span className="text-xs text-gray-500">
                          ({d.product_type})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cột Danh mục */}
                  {/* Giả định API trả về category_name, nếu không thì hiện ID */}
                  <td>{d.category_name || d.category_id || "—"}</td>

                  {/* Cột Thương hiệu */}
                  <td>{d.brand || "—"}</td>

                  {/* Cột Đơn vị tính */}
                  <td>{d.unit_of_measure || "—"}</td>

                  {/* Cột Bảo hành */}
                  <td>{d.warranty_months ? `${d.warranty_months} tháng` : "—"}</td>

                  {/* Cột Tồn kho tối thiểu */}
                  <td>{d.min_stock_level}</td>

                  {/* Cột Thao tác */}
                  {hasActions && (
                    <TableActions
                      data={d}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      renderExtra={renderExtraActions}
                      isDeleted={deleted}
                      canDelete={canDelete}
                      deleteTitle={
                        canDelete ? "Xoá sản phẩm" : "Không thể xoá sản phẩm đang có tồn kho"
                      }
                    />
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <TablePagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} />
    </>
  );
}