// apps/frontend/erp-portal/src/modules/hrm/services/payroll.service.js
import { employeeService } from "./employee.service";

const KEY = "PAYROLLS";
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const getAllFromStorage = () => JSON.parse(localStorage.getItem(KEY)) || [];
const saveToStorage = (data) => localStorage.setItem(KEY, JSON.stringify(data));

function createHttpError(status, message, field) {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
}

function computeNetPay(item) {
  const base = Number(item.baseSalary || 0);
  const allowance = Number(item.allowance || 0);
  const bonus = Number(item.bonus || 0);
  const deduction = Number(item.deduction || 0);
  const insurance = Number(item.insurance || 0);
  const tax = Number(item.tax || 0);
  return base + allowance + bonus - deduction - insurance - tax;
}

export const payrollService = {
  async getAll() {
    await delay();
    return getAllFromStorage();
  },

  async getById(id) {
    await delay();
    return getAllFromStorage().find((p) => p.id === id) || null;
  },

  // Generate kỳ lương từ DS nhân viên
  async generate(period) {
    await delay();
    const all = getAllFromStorage();
    const existed = all.some((p) => p.period === period);
    if (existed) throw createHttpError(409, "Kỳ lương đã tồn tại", "period");

    const employees = await employeeService.getAll();

    const id = `PR-${period.replace("-", "-")}`;
    const items = employees.map((e) => ({
      employeeCode: e.code,
      baseSalary: Number(e.baseSalary || 0), // nếu nhân viên chưa có field này thì bạn để 0
      allowance: 0,
      bonus: 0,
      deduction: 0,
      insurance: 0,
      tax: 0,
      netPay: 0,
      note: "",
    }));

    const payroll = {
      id,
      period,
      status: "Nháp",
      createdAt: new Date().toISOString(),
      items: items.map((it) => ({ ...it, netPay: computeNetPay(it) })),
    };

    saveToStorage([payroll, ...all]);
    return payroll;
  },

  async updateItems(id, items) {
    await delay();
    const all = getAllFromStorage();
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) throw createHttpError(404, "Không tìm thấy kỳ lương");

    if (all[idx].status === "Đã chốt") {
      throw createHttpError(400, "Kỳ lương đã chốt, không thể chỉnh sửa");
    }

    all[idx].items = items.map((it) => ({ ...it, netPay: computeNetPay(it) }));
    saveToStorage(all);
    return all[idx];
  },

  async setStatus(id, status) {
    await delay();
    const all = getAllFromStorage();
    const idx = all.findIndex((p) => p.id === id);
    if (idx < 0) throw createHttpError(404, "Không tìm thấy kỳ lương");

    all[idx].status = status;
    saveToStorage(all);
    return all[idx];
  },
};
