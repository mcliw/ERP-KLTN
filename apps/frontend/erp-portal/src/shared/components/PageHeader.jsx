import React from "react";
import { FaPlus, FaRecycle, FaUserPlus } from "react-icons/fa";

export default function PageHeader({ 
  title, 
  onCreate, 
  onRestore, 
  createLabel = "Thêm mới",
  createIcon = <FaPlus /> // Mặc định là dấu cộng, có thể đổi icon
}) {
  return (
    <div className="page-header">
      <h2>{title}</h2>
      <div style={{ display: "flex", gap: 10 }}>
        {onCreate && (
          <button className="btn-primary" onClick={onCreate}>
            {createIcon}
            <span>{createLabel}</span>
          </button>
        )}
        
        {onRestore && (
          <button className="btn-restore" onClick={onRestore}>
            <FaRecycle />
            <span>Khôi phục</span>
          </button>
        )}
      </div>
    </div>
  );
}