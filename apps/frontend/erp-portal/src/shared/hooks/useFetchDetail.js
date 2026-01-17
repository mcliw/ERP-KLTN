import { useState, useEffect } from "react";

export function useFetchDetail(fetchFunction, id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    
    fetchFunction(id)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [fetchFunction, id]);

  return { data, loading, error, setData };
}