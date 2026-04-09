import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

export function useCreateResource(serviceAction, successPath, options = {}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    resourceName = "dữ liệu",
    successMessage,
    transformPayload = (data) => data,
    onSuccess,
    onError,
  } = options;

  const handleSubmit = useCallback(async (formData) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const payload = transformPayload(formData);
      const response = await serviceAction(payload);

      const msg = successMessage || `Tạo mới ${resourceName} thành công!`;
      toast.success(msg);

      if (onSuccess) onSuccess(response);

      navigate(successPath);
    } catch (err) {
      const msg = err?.message || "Có lỗi xảy ra, vui lòng thử lại.";
      toast.error(msg);
      if (onError) onError(err);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, serviceAction, transformPayload, navigate, successPath, resourceName, successMessage, onSuccess, onError, toast]);

  const handleCancel = useCallback(() => {
    navigate(successPath);
  }, [navigate, successPath]);

  return { submitting, handleSubmit, handleCancel };
}
