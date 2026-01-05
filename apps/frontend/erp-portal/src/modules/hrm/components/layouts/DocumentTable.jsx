import { FaDownload, FaTrash } from "react-icons/fa";

export default function DocumentTable({ documents }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Tên tài liệu</th>
          <th style={styles.th}>Loại</th>
          <th style={styles.th}>File</th>
          <th style={styles.th}>Ngày tạo</th>
          <th style={styles.th}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id}>
            <td style={styles.td}>{doc.name}</td>
            <td style={styles.td}>{doc.type}</td>
            <td style={styles.td}>{doc.fileName}</td>
            <td style={styles.td}>{doc.createdAt}</td>
            <td style={styles.td}>
              <button style={styles.iconBtn}>
                <FaDownload />
              </button>
              <button style={styles.iconBtn}>
                <FaTrash />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#0b1220",
    border: "1px solid #243044",
    borderRadius: 12,
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #243044",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #243044",
  },
  iconBtn: {
    marginRight: 8,
    background: "transparent",
    border: "none",
    color: "#90caf9",
    cursor: "pointer",
  },
};
