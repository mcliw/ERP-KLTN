import React from "react";

export default function PageContainer({ children }) {
  return (
    <div className="page-create-container" style={{ padding: 20 }}>
      {children}
    </div>
  );
}