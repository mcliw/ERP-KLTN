// components/layouts/PayrollTable.jsx
import { FaEye, FaCheck, FaLock } from "react-icons/fa";
import "../styles/table.css";

export default function PayrollTable({
  data = [],
  onRowClick,
  onApprove,
  onClose,
}) {
  return (
    <table className="main-table">
      <thead>
        <tr>
          <th>Kỳ lương</th>
          <th>Trạng thái</th>
          <th>Ngày tạo</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.id}>
            <td>{p.period}</td>
            <td>{p.status}</td>
            <td>{new Date(p.createdAt).toLocaleDateString()}</td>
            <td>
              <button onClick={() => onRowClick(p)}>
                <FaEye />
              </button>

              {p.status === "Nháp" && (
                <button onClick={() => onApprove(p.id)}>
                  <FaCheck />
                </button>
              )}

              {p.status === "Đã duyệt" && (
                <button onClick={() => onClose(p.id)}>
                  <FaLock />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
