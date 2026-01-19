// apps/frontend/erp-portal/src/shared/hooks/useAsyncData.js

import { useState, useEffect, useCallback } from "react";

export function useAsyncData(fetchFunction, dependencies = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();

      if (result && typeof result === "object" && "data" in result && "total" in result) {
        setData(result.data);
        setTotal(result.total);
      } else {
        setData(result);
        setTotal(Array.isArray(result) ? result.length : 0);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await refresh();
    })();

    return () => {
      alive = false;
    };
  }, [refresh, ...dependencies]);

  return { data, total, loading, error, setData, refresh };
}
