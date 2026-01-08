// components/layouts/BenefitTable.jsx
import { FaEdit, FaTrash } from "react-icons/fa";

export default function BenefitTable({ data, onEdit, onDelete }) {
  return (
    <table className="main-table">
      <thead>
        <tr>
          <th>Mã</th>
          <th>Tên</th>
          <th>Loại</th>
          <th>Số tiền</th>
          <th>Trạng thái</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {data.map((b) => (
          <tr key={b.code}>
            <td>{b.code}</td>
            <td>{b.name}</td>
            <td>{b.type}</td>
            <td>{b.amount.toLocaleString()}</td>
            <td>{b.status}</td>
            <td>
              <button onClick={() => onEdit(b)}>
                <FaEdit />
              </button>
              <button onClick={() => onDelete(b.code)}>
                <FaTrash />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
