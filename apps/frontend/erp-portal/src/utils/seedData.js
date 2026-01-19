import db from "../data/hrm_db.json";

export const seedDatabase = () => {
  // Kiểm tra xem localStorage đã có dữ liệu chưa
  const hasEmployees = localStorage.getItem("EMPLOYEES");

  if (!hasEmployees) {
    console.log("⚡ Đang khởi tạo dữ liệu mẫu...");
    
    // Nạp từng bảng vào LocalStorage
    localStorage.setItem("EMPLOYEES", JSON.stringify(db.employees));
    localStorage.setItem("DEPARTMENTS", JSON.stringify(db.departments));
    localStorage.setItem("POSITIONS", JSON.stringify(db.positions));
    localStorage.setItem("ACCOUNTS", JSON.stringify(db.accounts));
    localStorage.setItem("ON_LEAVES", JSON.stringify(db.onLeaves)); // Lưu ý key name
    
    console.log("✅ Đã nạp dữ liệu thành công!");
  }
};