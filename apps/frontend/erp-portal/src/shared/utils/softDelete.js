// apps/frontend/erp-portal/src/shared/utils/softDelete.js

export const isSoftDeleted = (deletedAt) => {
  return !!(deletedAt && String(deletedAt).trim() !== "");
};
