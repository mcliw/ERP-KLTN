// src/shared/utils/permission.js
export const hasPermission = (role, allowRoles = []) =>
  !!role && allowRoles.includes(role);