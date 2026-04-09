// apps/frontend/erp-portal/src/modules/sales/components/layouts/ReceiptForm.jsx

import { useMemo, useEffect, useState } from "react";
import { receiptCreateSchema, receiptUpdateSchema } from "../../validations/receipt.schema"; 
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";
import { orderService } from "../../../sales/services/order.service";
import { receiptService } from "../../services/receipt.service";

/* ==============================
 * Helpers & Configs
 * ============================== */
const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

// Format ngày hiện tại thành YYYY-MM-DD cho input date
const getTodayDate = () => new Date().toISOString().split('T')[0];

const DEFAULT_FORM = {
  id: "", // Số phiếu thu
  transaction_date: getTodayDate(),
  customer_id: "",
  order_id: "", // Hoặc order_reference_id tùy mapping
  amount: 0,
  debit_account_code: "111", // Mặc định Tiền mặt
  credit_account_code: "131", // Cố định Phải thu KH
  description: "",
};

// Helper format tiền tệ hiển thị trong dropdown
const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

/* ==============================
 * Main Component
 * ============================== */
export default function ReceiptForm({ 
  mode = "create", 
  initialData, 
  customerOptions = [], // [{ value: 'C001', label: 'Công ty ABC' }, ...]
  orderOptions = [],    // [{ value: '1', label: 'Đơn hàng #1' }, ...]
  onSubmit, 
  onCancel 
}) {
  const toast = useToast();

  // State lưu danh sách đơn hàng (Load động theo Khách hàng)
  const [dynamicOrderOptions, setDynamicOrderOptions] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Xác định schema dựa trên mode
  const currentSchema = mode === "create" ? receiptCreateSchema : receiptUpdateSchema;

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    
    // Xử lý format ngày tháng nếu có dữ liệu cũ
    if (cleaned.transaction_date) {
        cleaned.transaction_date = new Date(cleaned.transaction_date).toISOString().split('T')[0];
    }

    return {
      ...DEFAULT_FORM,
      ...cleaned,
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: currentSchema,
  });

  // =================================================================
  // LOGIC CẬP NHẬT: Tự động tải Đơn hàng & LỌC ĐƠN ĐÃ THANH TOÁN
  // =================================================================
  useEffect(() => {
    let isMounted = true;

    const fetchOrdersByCustomer = async () => {
      // Nếu chưa chọn khách hàng, xóa danh sách đơn và thoát
      if (!form.customer_id) {
        setDynamicOrderOptions([]);
        return;
      }

      setLoadingOrders(true);
      try {
        // --- THAY ĐỔI TẠI ĐÂY ---
        // Gọi song song 2 API:
        // 1. Lấy tất cả đơn hàng COMPLETED của khách (từ Sales DB)
        // 2. Lấy danh sách ID đơn hàng đã được lập phiếu thu (từ Financial DB)
        const [orders, paidOrderIds] = await Promise.all([
            orderService.getAll({ 
                customer_id: form.customer_id,
                status: orderService.CONSTANTS.STATUS.COMPLETED 
            }),
            receiptService.getPaidOrderIds(form.id) // Truyền form.id để loại trừ chính nó khi Edit
        ]);
        
        if (isMounted) {
          // Lọc: Chỉ giữ lại các đơn hàng CHƯA có trong danh sách paidOrderIds
          const availableOrders = orders.filter(o => !paidOrderIds.includes(String(o.id)));

          const options = availableOrders.map(o => {
            const priceDisplay = o.total_amount ? ` - ${new Intl.NumberFormat('vi-VN').format(o.total_amount)}đ` : "";
            return {
              value: o.id,
              label: `#${o.id} - Hoàn thành${priceDisplay}`
            };
          });
          
          setDynamicOrderOptions(options);
        }
      } catch (err) {
        console.error(err);
        // toast.error("Không thể tải danh sách đơn hàng"); // Có thể bật toast nếu cần
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    };

    fetchOrdersByCustomer();

    return () => { isMounted = false; };
  }, [form.customer_id, form.id]); // Thêm form.id vào dependency

  // Handler khi chọn khách hàng -> Reset Order cũ
  const handleCustomerChange = (e) => {
      handleChange(e); 
      setForm(prev => ({ ...prev, order_id: "" }));
  };

  const isDirty = useMemo(() => {
    // So sánh đơn giản JSON
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Reset form khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      const cleaned = cleanData(initialData);
      if (cleaned.transaction_date) {
         cleaned.transaction_date = new Date(cleaned.transaction_date).toISOString().split('T')[0];
      }
      setForm((prev) => ({
        ...prev,
        ...cleaned,
      }));
    }
  }, [initialData, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // Validate toàn bộ form
    if (!validate(form)) return;

    if (!window.confirm(mode === "create" ? "Lập phiếu thu mới?" : "Lưu các thay đổi?")) return;

    onSubmit?.(form);
  };

  return (
    <form className="receipt-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Lập phiếu thu" : "Chi tiết phiếu thu"}</h3>

      <div className="form-grid">
        {/* Số phiếu thu */}
        <FormInput
          label="Số phiếu thu"
          name="id"
          value={form.id}
          onChange={handleChange}
          required
          error={errors.id}
          placeholder="VD: PT001"
          readOnly={mode === "edit"}
          disabled={mode === "edit"}
          style={mode === "edit" ? { backgroundColor: "#f3f4f6" } : {}}
        />

        {/* Ngày chứng từ */}
        <FormInput
          label="Ngày chứng từ"
          name="transaction_date"
          type="date"
          value={form.transaction_date}
          onChange={handleChange}
          required
          error={errors.transaction_date}
        />

        {/* Khách hàng (Trigger load đơn hàng) */}
        <FormSelect
            label="Khách hàng"
            name="customer_id"
            value={form.customer_id}
            onChange={handleCustomerChange} // Dùng handler riêng để reset order
            required
            error={errors.customer_id}
        >
            <option value="">-- Chọn khách hàng --</option>
            {customerOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </FormSelect>

        {/* Đơn hàng (Dữ liệu động) */}
        <FormSelect
            label="Đơn hàng tham chiếu"
            name="order_id"
            value={form.order_id}
            onChange={handleChange}
            required
            error={errors.order_id}
            disabled={!form.customer_id || loadingOrders} // Disable khi chưa chọn khách hoặc đang load
        >
            <option value="">
                {loadingOrders ? "Đang tải đơn hàng..." : "-- Chọn đơn hàng --"}
            </option>
            {!loadingOrders && form.customer_id && dynamicOrderOptions.length === 0 && (
                <option value="" disabled>Không có đơn hàng đã hoàn thành</option>
            )}
            {dynamicOrderOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </FormSelect>

        {/* Số tiền */}
        <FormInput
          label="Số tiền thu (VNĐ)"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          required
          min="0"
          error={errors.amount}
        />

        {/* Tài khoản Nợ */}
        <FormSelect 
            label="Tài khoản Nợ" 
            name="debit_account_code" 
            value={form.debit_account_code} 
            onChange={handleChange}
            required
            error={errors.debit_account_code}
        >
          <option value="111">111 - Tiền mặt</option>
          <option value="112">112 - Tiền gửi ngân hàng</option>
        </FormSelect>

        {/* Tài khoản Có (Readonly) */}
        <FormInput
            label="Tài khoản Có"
            name="credit_account_code"
            value="131 - Phải thu khách hàng"
            readOnly
            disabled
            style={{ backgroundColor: "#f9fafb", color: "#6b7280" }}
        />
        
        {/* Diễn giải */}
        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
            label="Diễn giải"
            name="description"
            value={form.description}
            onChange={handleChange}
            error={errors.description}
            />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Lưu phiếu thu" : "Cập nhật"}
      />
    </form>
  );
}