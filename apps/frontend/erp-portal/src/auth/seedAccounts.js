// src/auth/seedAccount.js

import { ROLES } from "../shared/constants/roles";

const KEY = "ACCOUNTS";

const normalize = (u) => String(u).trim().toLowerCase();

export function seedDefaultAccounts() {
  const existing = JSON.parse(localStorage.getItem(KEY)) || [];

  const defaults = [
    {
      username: "admin",
      password: "123",
      role: ROLES.ADMIN,
      status: "Hoạt động",
      employeeCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      username: "hr",
      password: "123",
      role: ROLES.HR_MANAGER,
      status: "Hoạt động",
      employeeCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      username: "sales",
      password: "123",
      role: ROLES.SALES_CRM_MANAGER,
      status: "Hoạt động",
      employeeCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      username: "finance",
      password: "123",
      role: ROLES.FINANCE_ACCOUNTING_MANAGER,
      status: "Hoạt động",
      employeeCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
    {
      username: "supplychain",
      password: "123",
      role: ROLES.SUPPLY_CHAIN_MANAGER,
      status: "Hoạt động",
      employeeCode: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      deletedAt: null,
    },
  ];

  const merged = [...existing];

  defaults.forEach((d) => {
    if (
      !merged.some(
        (a) => normalize(a.username) === normalize(d.username)
      )
    ) {
      merged.push(d);
    }
  });

  localStorage.setItem(KEY, JSON.stringify(merged));
}
