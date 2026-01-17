// apps/frontend/erp-portal/src/shared/hooks/useClientPagination.js

import { useState, useMemo, useEffect } from "react";

export function useClientPagination(data = [], pageSize = 10) {
  const [page, setPage] = useState(1);

  // ✅ FIX: reset trang khi dataset thay đổi (không chỉ khi length thay đổi)
  useEffect(() => {
    setPage(1);
  }, [data, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const goToNext = () => setPage((p) => Math.min(p + 1, totalPages));
  const goToPrev = () => setPage((p) => Math.max(p - 1, 1));

  return {
    page,
    setPage,
    totalPages,
    paginatedData,
    goToNext,
    goToPrev,
  };
}
