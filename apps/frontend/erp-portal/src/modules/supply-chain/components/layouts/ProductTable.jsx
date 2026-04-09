import { TablePagination, TableActions, EmptyRow } from "../../../../shared/components/TableComponents";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";

export default function ProductTable({
  data = [],
  categoryMap = {}, // Map ID -> Name
  page = 1, totalPages = 1,
  onPrev, onNext, onRowClick, onView, onEdit, onDelete,
  renderExtraActions
}) {
  const hasActions = onView || onEdit || onDelete || renderExtraActions;
  const colCount = hasActions ? 9 : 8;

  return (
    <>
      <table className="main-table">
        <thead>
          <tr>
            <th style={{width: 60}}>Ảnh</th>
            <th>Mã SKU</th>
            <th>Tên sản phẩm</th>
            <th>Danh mục</th>
            <th>Thương hiệu</th>
            <th>Phân loại</th>
            <th>ĐVT</th>
            <th>Trạng thái</th>
            {hasActions && <th className="action-col">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? <EmptyRow colSpan={colCount} /> : data.map((item) => (
            <tr key={item.id} className={[
                  onRowClick && "clickable",
                  isSoftDeleted(item.deletedAt) && "deleted"
                ].filter(Boolean).join(" ")}
                onClick={() => onRowClick?.(item)}>
              <td>
                {item.image ? (
                    <img src={item.image} alt="" style={{width: 40, height: 40, objectFit: "cover", borderRadius: 4}} />
                ) : <div style={{width:40, height:40, background:"#eee", borderRadius:4}}></div>}
              </td>
              <td style={{fontWeight: 500}}>{item.code}</td>
              <td>{item.name}</td>
              {/* Sử dụng map để hiển thị tên danh mục */}
              <td>{categoryMap[item.categoryId] || "—"}</td>
              <td>{item.brand}</td>
              <td>
                <span className={`badge ${item.type === "Tài sản công ty" ? "badge-info" : "badge-success"}`}>
                    {item.type}
                </span>
              </td>
              <td>{item.unit}</td>
              <td>{item.status}</td>
              {hasActions && (
                <TableActions data={item} onView={onView} onEdit={onEdit} onDelete={onDelete} renderExtra={renderExtraActions} isDeleted={isSoftDeleted(item.deletedAt)} />
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination page={page} totalPages={totalPages} onPrev={onPrev} onNext={onNext} />
    </>
  );
}