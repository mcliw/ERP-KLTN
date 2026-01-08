// src/auth/auth.service.js

import { accountService } from "../modules/hrm/services/account.service";

export async function loginApi({ username, password }) {
  await new Promise((r) => setTimeout(r, 300));

  const account = await accountService.getByUsername(username);

  if (!account) {
    throw new Error("User không tồn tại");
  }

  if (account.deletedAt) {
    throw new Error("Tài khoản đã bị xoá");
  }

  if (account.status !== "Hoạt động") {
    throw new Error("Tài khoản đã bị ngưng hoạt động");
  }

  if (account.password !== password) {
    throw new Error("Sai tài khoản hoặc mật khẩu");
  }

  return {
    token: `token-${account.username}`,
    user: {
      id: account.username,
      employeeCode: account.employee?.code,
      name: account.employee?.name || account.username,
      role: account.role,
    },
  };
}

export async function resetPasswordApi({ username, password }) {
  await new Promise((r) => setTimeout(r, 300));

  const account = await accountService.getByUsername(username);

  if (!account) {
    throw new Error("User không tồn tại");
  }

  if (account.deletedAt) {
    throw new Error("Tài khoản đã bị xoá");
  }

  // cập nhật mật khẩu
  await accountService.update(username, {
    password,
    updatedAt: new Date().toISOString(),
  });

  return true;
}