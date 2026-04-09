// apps/frontend/erp-portal/src/shared/hooks/useRestoreResource.js

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { isSoftDeleted } from "../utils/softDelete";
import { useToast } from "../components/ToastProvider";

export function useRestoreResource(service, idField, resourceName, customFilter = null) {
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const getDisplayName = useCallback((item) => {
    return item?.account_name || item?.employeeName || item?.name || item?.fullName || item?.[idField] || "";
  }, [idField]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allItems = await service.getAll({ includeDeleted: true, includeInactive: true });
      const deletedItems = (Array.isArray(allItems) ? allItems : []).filter((item) =>
        {
          if (customFilter) {
              return customFilter(item);
          }
          return isSoftDeleted(item.deletedAt);
        }
      );
      setData(deletedItems);
      setPage(1);
    } catch (error) {
      console.error(error);
      toast.error(`Không thể tải danh sách ${resourceName} đã xoá`);
    } finally {
      setLoading(false);
    }
  }, [service, toast, resourceName, customFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const handleRestore = async (item) => {
    const displayName = getDisplayName(item);

    if (!window.confirm(`Khôi phục ${resourceName} "${displayName}"?`)) return;

    try {
      await service.restore(item[idField]);
      toast.success(`Đã khôi phục ${resourceName} "${displayName}"`);
      await loadData();
    } catch (err) {
      toast.error(err?.message || `Không thể khôi phục ${resourceName}`);
    }
  };

  const handleDestroy = async (item) => {
    const displayName = getDisplayName(item);

    if (
      !window.confirm(
        `XOÁ VĨNH VIỄN ${resourceName} "${displayName}"?\nHành động này KHÔNG THỂ hoàn tác!`
      )
    ) return;

    try {
      await service.destroy(item[idField]);
      toast.error(`Đã xoá vĩnh viễn ${resourceName} "${displayName}"`);
      await loadData();
    } catch (err) {
      toast.error(err?.message || `Không thể xoá vĩnh viễn ${resourceName}`);
    }
  };

  return {
    data: paginatedData,
    loading,
    page,
    setPage,
    totalPages,
    handleRestore,
    handleDestroy,
    goBack: () => navigate(-1),
  };
}