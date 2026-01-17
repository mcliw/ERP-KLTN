import { employeeService } from "./employee.service";
import { departmentService } from "./department.service";

const API_URL = "http://localhost:3001/salaries";

// Hằng số bảo hiểm (theo luật VN hiện tại - ví dụ)
const INSURANCE_RATES = {
  SOCIAL: 0.08, // BHXH 8%
  HEALTH: 0.015, // BHYT 1.5%
  UNEMPLOYMENT: 0.01, // BHTN 1%
};

export const salaryService = {
  async getAll() {
    try {
      const response = await fetch(API_URL);
      const salaries = await response.json();

      // Lấy thêm thông tin nhân viên & phòng ban để hiển thị
      const employees = await employeeService.getAll({ includeDeleted: true });
      const departments = await departmentService.getAll({ enrich: false });

      // Enrich Data
      return salaries.map((sal) => {
        const emp = employees.find((e) => e.id === sal.employeeId) || {};
        const dept = departments.find((d) => d.code === emp.department) || {};

        // Tính tổng phụ cấp
        const totalAllowance = 
          (Number(sal.responsibilityAllowance) || 0) +
          (Number(sal.lunchAllowance) || 0) +
          (Number(sal.transportAllowance) || 0) +
          (Number(sal.phoneAllowance) || 0);

        // Tính tổng thu nhập Gross (Lương cứng + Phụ cấp)
        const grossIncome = Number(sal.baseSalary) + totalAllowance;

        return {
          ...sal,
          employeeCode: emp.code || "N/A",
          employeeName: emp.name || "Không xác định",
          departmentName: dept.name || "—",
          positionName: emp.position || "—",
          totalAllowance,
          grossIncome
        };
      });
    } catch (error) {
      console.error("Lỗi lấy dữ liệu lương:", error);
      return [];
    }
  },

  async getById(id) {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) return null;
    return res.json();
  },

  async getByEmployeeId(empId) {
    const all = await this.getAll();
    return all.find(s => s.employeeId === empId);
  },

  async update(id, data) {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, updatedAt: new Date().toISOString() }),
    });
    return res.json();
  },

  async create(data) {
    // Check nếu nhân viên đã có lương rồi
    const all = await fetch(API_URL).then(r => r.json());
    const exists = all.find(s => s.employeeId === data.employeeId);
    if (exists) throw new Error("Nhân viên này đã được thiết lập lương.");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: `sal${Date.now()}`, updatedAt: new Date().toISOString() }),
    });
    return res.json();
  }
};