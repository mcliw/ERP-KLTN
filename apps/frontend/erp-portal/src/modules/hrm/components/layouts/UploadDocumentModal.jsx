import { useState } from "react";

export default function UploadDocumentModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [file, setFile] = useState(null);

  const handleSubmit = () => {
    onSubmit({
      id: Date.now(),
      name,
      type,
      fileName: file?.name || "",
      createdAt: new Date().toLocaleDateString(),
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3>Thêm tài liệu</h3>

        <input
          style={styles.input}
          placeholder="Tên tài liệu"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Loại (Contract, Identity...)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <div style={{ marginTop: 12 }}>
          <button style={styles.btn} onClick={handleSubmit}>
            Lưu
          </button>
          <button style={styles.cancel} onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    background: "#0b1220",
    padding: 20,
    borderRadius: 12,
    width: 360,
  },
  input: {
    width: "100%",
    marginBottom: 10,
    padding: 8,
  },
  btn: {
    padding: "8px 12px",
    background: "#1e88e5",
    color: "white",
    border: "none",
    borderRadius: 6,
  },
  cancel: {
    marginLeft: 8,
    padding: "8px 12px",
  },
};
