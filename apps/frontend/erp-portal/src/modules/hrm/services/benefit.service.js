// apps/frontend/erp-portal/src/modules/hrm/services/benefit.service.js
const KEY = "BENEFITS";
const KEY_ASSIGN = "BENEFIT_ASSIGNS";
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));

const getAll = () => JSON.parse(localStorage.getItem(KEY)) || [];
const saveAll = (data) => localStorage.setItem(KEY, JSON.stringify(data));

const getAssigns = () => JSON.parse(localStorage.getItem(KEY_ASSIGN)) || [];
const saveAssigns = (data) => localStorage.setItem(KEY_ASSIGN, JSON.stringify(data));

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}
function createHttpError(status, message, field) {
  const err = new Error(message);
  err.status = status;
  if (field) err.field = field;
  return err;
}

export const benefitService = {
  async getAll() {
    await delay();
    return getAll();
  },

  async create(payload) {
    await delay();
    const all = getAll();
    const code = normalizeCode(payload.code);
    if (!code) throw createHttpError(400, "Mã phúc lợi bắt buộc", "code");
    if (all.some((b) => normalizeCode(b.code) === code)) {
      throw createHttpError(409, "Mã phúc lợi đã tồn tại", "code");
    }
    const item = { ...payload, code, status: payload.status || "Hoạt động" };
    saveAll([item, ...all]);
    return item;
  },

  async update(code, payload) {
    await delay();
    const all = getAll();
    const c = normalizeCode(code);
    const idx = all.findIndex((b) => normalizeCode(b.code) === c);
    if (idx < 0) throw createHttpError(404, "Không tìm thấy phúc lợi");
    all[idx] = { ...all[idx], ...payload, code: all[idx].code };
    saveAll(all);
    return all[idx];
  },

  async remove(code) {
    await delay();
    const all = getAll();
    const c = normalizeCode(code);
    saveAll(all.filter((b) => normalizeCode(b.code) !== c));
    return true;
  },

  // Assign
  async getAssigns() {
    await delay();
    return getAssigns();
  },

  async assignToEmployee(payload) {
    await delay();
    const assigns = getAssigns();
    const id = `ASG-${Date.now()}`;
    const item = { id, ...payload };
    saveAssigns([item, ...assigns]);
    return item;
  },
};
