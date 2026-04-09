// apps/frontend/erp-portal/src/modules/finance/components/layouts/PaymentSlipForm.jsx

import { useMemo, useEffect, useState } from "react";
import { paymentSlipCreateSchema, paymentSlipUpdateSchema } from "../../validations/paymentSlip.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";
import { paymentSlipService } from "../../services/paymentSlip.service"

/* ==============================
 * Helpers & Configs
 * ============================== */
const SC_API_URL = "http://localhost:3002"; // Supply Chain Service

const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    // Nếu là purchase_order_ids, đảm bảo nó là mảng
    if (key === 'order_reference_ids' || key === 'purchase_order_ids') {
        cleaned['purchase_order_ids'] = Array.isArray(data[key]) ? data[key] : (data[key] ? [data[key]] : []);
    } else {
        cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
    }
  });
  return cleaned;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];
const formatMoney = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const DEFAULT_FORM = {
  id: "",
  transaction_date: getTodayDate(),
  supplier_id: "",
  purchase_order_ids: [], // Mảng ID các đơn hàng được chọn
  amount: 0,
  debit_account_code: "331", // Cố định
  credit_account_code: "111", // Mặc định tiền mặt
  bank_account_number: "",
  description: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function PaymentSlipForm({
  mode = "create",
  initialData,
  onSubmit,
  onCancel
}) {
  const toast = useToast();

  // State dữ liệu tham chiếu
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [poList, setPoList] = useState([]); // Danh sách PO của NCC đang chọn
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Schema
  const currentSchema = mode === "create" ? paymentSlipCreateSchema : paymentSlipUpdateSchema;

  // Initial Values
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    if (cleaned.transaction_date) {
      cleaned.transaction_date = new Date(cleaned.transaction_date).toISOString().split('T')[0];
    }
    // Map field từ service (order_reference_ids) sang form (purchase_order_ids) nếu cần
    if (initialData.order_reference_ids) {
        cleaned.purchase_order_ids = Array.isArray(initialData.order_reference_ids) 
            ? initialData.order_reference_ids 
            : [initialData.order_reference_ids];
    }
    return { ...DEFAULT_FORM, ...cleaned };
  }, [initialData]);

  // Form Manager
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: currentSchema,
  });

  // =================================================================
  // EFFECT 1: Load danh sách Nhà cung cấp (Lần đầu mount)
  // =================================================================
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch(`${SC_API_URL}/suppliers`);
        if (res.ok) {
            const data = await res.json();
            const options = data.map(s => ({
                value: s.id,
                label: `${s.name} (${s.code})`
            }));
            setSupplierOptions(options);
        }
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải danh sách Nhà cung cấp");
      }
    };
    fetchSuppliers();
  }, [toast]);

  // =================================================================
  // EFFECT 2: Load Đơn mua hàng (PO) chưa được thanh toán
  // =================================================================
  useEffect(() => {
    let isMounted = true;

    const fetchPOs = async () => {
        if (!form.supplier_id) {
            setPoList([]);
            return;
        }

        setLoadingPOs(true);
        try {
            // Chạy song song 2 tác vụ:
            // 1. Lấy PO Approved của Supplier từ SupplyChain DB
            // 2. Lấy danh sách ID các PO đã được trả tiền từ Payment Service (Financial DB)
            const [poRes, paidIds] = await Promise.all([
                fetch(`${SC_API_URL}/purchase_orders?supplier_id=${form.supplier_id}&status=APPROVED`),
                paymentSlipService.getPaidPurchaseOrderIds(form.id) // Truyền form.id để loại trừ chính phiếu này (khi edit)
            ]);

            if (poRes.ok && isMounted) {
                const allPOs = await poRes.json();
                
                // Lọc bỏ các PO đã nằm trong danh sách paidIds
                const availablePOs = allPOs.filter(po => !paidIds.includes(String(po.id)));
                
                setPoList(availablePOs);
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi tải danh sách đơn mua hàng");
        } finally {
            if (isMounted) setLoadingPOs(false);
        }
    };

    fetchPOs();
    return () => { isMounted = false; };
  }, [form.supplier_id, form.id, toast]); // Thêm form.id vào dependency

  // =================================================================
  // HANDLERS
  // =================================================================

  // Xử lý khi chọn NCC -> Reset PO đã chọn
  const handleSupplierChange = (e) => {
    handleChange(e);
    setForm(prev => ({
        ...prev,
        purchase_order_ids: [], // Reset list PO đã chọn
        amount: 0 // Reset tiền
    }));
  };

  // Xử lý chọn PO (Checkbox Multi-select)
  const handlePOToggle = (poId, poTotalAmount) => {
    setForm(prev => {
        const currentIds = prev.purchase_order_ids || [];
        const isSelected = currentIds.includes(poId);
        
        // Đảm bảo các giá trị là số để tính toán chính xác
        const currentAmount = Number(prev.amount) || 0;
        const changeAmount = Number(poTotalAmount) || 0;

        let newIds;
        let newAmount = currentAmount;

        if (isSelected) {
            // Bỏ chọn: Xóa ID và TRỪ tiền (áp dụng cho cả create và edit)
            newIds = currentIds.filter(id => id !== poId);
            newAmount = Math.max(0, currentAmount - changeAmount);
        } else {
            // Chọn thêm: Thêm ID và CỘNG tiền
            newIds = [...currentIds, poId];
            newAmount = currentAmount + changeAmount;
        }

        return {
            ...prev,
            purchase_order_ids: newIds,
            amount: newAmount
        };
    });
  };

  // Logic kiểm tra Dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Sync Initial Data khi Edit
  useEffect(() => {
    if (initialData) {
      const cleaned = cleanData(initialData);
      if (cleaned.transaction_date) cleaned.transaction_date = new Date(cleaned.transaction_date).toISOString().split('T')[0];
      // Map lại field reference
      if (initialData.order_reference_ids) {
        cleaned.purchase_order_ids = Array.isArray(initialData.order_reference_ids) 
            ? initialData.order_reference_ids 
            : [initialData.order_reference_ids];
      }
      setForm((prev) => ({ ...prev, ...cleaned }));
    }
  }, [initialData, setForm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }
    if (!validate(form)) return;
    if (!window.confirm(mode === "create" ? "Lập phiếu chi mới?" : "Lưu các thay đổi?")) return;
    
    // Convert purchase_order_ids array to format service expects if needed
    onSubmit?.(form);
  };

  return (
    <form className="payment-slip-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Lập phiếu chi" : "Chi tiết phiếu chi"}</h3>

      <div className="form-grid">
        {/* Số phiếu */}
        <FormInput
          label="Số phiếu chi"
          name="id"
          value={form.id}
          onChange={handleChange}
          required
          error={errors.id}
          placeholder="VD: PC001"
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

        {/* Nhà cung cấp */}
        <FormSelect
            label="Nhà cung cấp"
            name="supplier_id"
            value={form.supplier_id}
            onChange={handleSupplierChange}
            required
            error={errors.supplier_id}
        >
            <option value="">-- Chọn nhà cung cấp --</option>
            {supplierOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </FormSelect>

        {/* Danh sách Đơn mua hàng (Custom Multi-select UI) */}
        <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-label" style={{fontSize: 13}}>
                Đơn mua hàng thanh toán <span className="text-danger">*</span>
            </label>
            
            <div className="border rounded p-3 bg-gray-50 max-h-40 overflow-y-auto">
                {loadingPOs ? (
                    <div className="text-sm text-gray-500">Đang tải đơn hàng...</div>
                ) : !form.supplier_id ? (
                    <div className="text-sm text-gray-500" style={{fontSize: 13}}>Vui lòng chọn nhà cung cấp trước</div>
                ) : poList.length === 0 ? (
                    <div className="text-sm text-orange-500" style={{fontSize: 13}}>Nhà cung cấp này không có đơn hàng APPROVED nào</div>
                ) : (
                    <div className="profile-grid">
                        {poList.map(po => {
                            const isChecked = form.purchase_order_ids?.includes(po.id);
                            return (
                                <label key={po.id} className="profile-item" style={{marginTop: 10}}>
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => handlePOToggle(po.id, po.total_amount)}
                                        className="form-checkbox h-4 w-4 text-primary"
                                    />
                                    <span className="text-sm" style={{fontSize: 13}}>#{po.po_code}</span>
                                    <span className="text-xs text-gray-500" style={{fontSize: 13}}>
                                        - Ngày: {po.order_date} - Giá trị: {formatMoney(po.total_amount)}đ
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>
            {errors.purchase_order_ids && (
                <span className="error">{errors.purchase_order_ids}</span>
            )}
        </div>

        {/* Số tiền chi */}
        <FormInput
          label="Số tiền chi (VNĐ)"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          required
          min="0"
          error={errors.amount}
          helperText="Tự động cộng tổng các đơn hàng đã chọn (có thể sửa)"
        />

        {/* Tài khoản Nợ (Cố định 331) */}
        <FormInput
            label="Tài khoản Nợ"
            name="debit_account_code"
            value="331 - Phải trả người bán"
            readOnly
            disabled
            style={{ backgroundColor: "#f9fafb", color: "#6b7280" }}
        />

        {/* Tài khoản Có */}
        <FormSelect 
            label="Tài khoản Có (Hình thức chi)" 
            name="credit_account_code" 
            value={form.credit_account_code} 
            onChange={handleChange}
            required
            error={errors.credit_account_code}
        >
          <option value="111">111 - Tiền mặt</option>
          <option value="112">112 - Tiền gửi ngân hàng</option>
        </FormSelect>

        {/* Số tài khoản NH (Chỉ hiện khi chọn 112) */}
        {form.credit_account_code === '112' && (
             <div style={{ gridColumn: "1 / -1" }}>
                <FormInput
                    label="Số tài khoản thụ hưởng / Ghi chú ngân hàng"
                    name="bank_account_number"
                    value={form.bank_account_number}
                    onChange={handleChange}
                    placeholder="VD: 1903... Techcombank"
                    error={errors.bank_account_number}
                />
             </div>
        )}

        {/* Diễn giải */}
        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
                label="Diễn giải"
                name="description"
                value={form.description}
                onChange={handleChange}
                error={errors.description}
                placeholder="Lý do chi tiền..."
            />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Lưu phiếu chi" : "Cập nhật"}
      />
    </form>
  );
}