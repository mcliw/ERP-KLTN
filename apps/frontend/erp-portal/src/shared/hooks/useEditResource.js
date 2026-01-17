import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { isSoftDeleted } from "../utils/softDelete";

export function useEditResource({ id, fetcher, updater, successPath, options = {} }) {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    transformPayload = (data) => data,
    resourceName = "Dữ liệu",
    onSuccess,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const res = await fetcher(id);
        if (!mounted) return;

        if (!res) throw new Error("NOT_FOUND");
        setData(res);
      } catch (err) {
        if (!mounted) return;
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [id, fetcher]);

  const handleUpdate = useCallback(async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = transformPayload(formData);
      const response = await updater(id, payload);

      toast.success(`Cập nhật ${resourceName} thành công!`);
      if (onSuccess) onSuccess(response);

      navigate(successPath);
    } catch (err) {
      const msg = err?.message || `Có lỗi khi cập nhật ${resourceName}`;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, transformPayload, updater, id, toast, resourceName, onSuccess, navigate, successPath]);

  const handleCancel = useCallback(() => {
    navigate(successPath);
  }, [navigate, successPath]);

  const isNotFound = !loading && (error?.message === "NOT_FOUND" || error?.status === 404);
  const isDeleted = isSoftDeleted(data?.deletedAt);

  return { data, loading, submitting, error, isNotFound, isDeleted, handleUpdate, handleCancel };
}
