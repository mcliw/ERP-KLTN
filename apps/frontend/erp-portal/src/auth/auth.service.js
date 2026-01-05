export async function loginApi({ username, password }) {
  // giả lập delay API
  await new Promise((r) => setTimeout(r, 500));

  if (password !== "123") {
    throw new Error("Sai tài khoản hoặc mật khẩu");
  }

  switch (username) {
    case "admin":
      return {
        token: "token-admin",
        user: { id: 1, name: "Admin", role: "ADMIN" },
      };
    case "hr":
      return {
        token: "token-hr",
        user: { id: 2, name: "HR User", role: "HR" },
      };
    case "sales":
      return {
        token: "token-sales",
        user: { id: 3, name: "Sales User", role: "SALES" },
      };
    case "finance":
      return {
        token: "token-finance",
        user: { id: 4, name: "Finance User", role: "FINANCE" },
      };
    default:
      throw new Error("User không tồn tại");
  }
}
