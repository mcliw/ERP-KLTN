// apps/frontend/erp-portal/src/modules/finance/components/layouts/PostingRulesForm.jsx

import { useMemo, useEffect, useState } from "react";
// Import Schema
import { postingRuleSchema } from "../../validations/postingRules.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
// Import Services
import { postingRulesService } from "../../services/postingRules.service";
import { faAccountService } from "../../services/faAccount.service"; // Để lấy list tài khoản
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */

const MODULE_OPTIONS = [
  { value: "SUPPLYCHAIN", label: "Chuỗi cung ứng" },
  { value: "SALES", label: "Bán hàng" },
  { value: "HRM", label: "Nhân sự" },
  { value: "GENERAL", label: "Tổng hợp" },
];

const cleanData = (data) => {
  if (!data) return {};
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    cleaned[key] = data[key] === null || data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

const DEFAULT_FORM = {
  event_code: "",
  event_description: "",
  module_source: "",
  debit_account_id: "",
  credit_account_id: "",
};

/* ==============================
 * Main Component
 * ============================== */
export default function PostingRulesForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [accounts, setAccounts] = useState([]); // Danh sách tài khoản active
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      // Đảm bảo ID là string để khớp với value của option
      debit_account_id: cleaned.debit_account_id ? String(cleaned.debit_account_id) : "",
      credit_account_id: cleaned.credit_account_id ? String(cleaned.credit_account_id) : "",
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: postingRuleSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Reset form khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      const data = cleanData(initialData);
      setForm((prev) => ({
        ...prev,
        ...data,
        debit_account_id: data.debit_account_id ? String(data.debit_account_id) : "",
        credit_account_id: data.credit_account_id ? String(data.credit_account_id) : "",
      }));
    }
  }, [initialData, setForm]);

  // Load danh sách accounts để đổ vào dropdown Nợ/Có
  useEffect(() => {
    let mounted = true;
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        // Chỉ lấy tài khoản đang hoạt động (active)
        const list = await faAccountService.getAll({ includeInactive: false });
        if (mounted) {
          // Sắp xếp theo Account Code tăng dần
          list.sort((a, b) => (a.account_code || "").localeCompare(b.account_code || ""));
          setAccounts(list);
        }
      } catch (err) {
        console.error("Failed to load accounts", err);
        if (mounted) {
          toast.error("Không tải được danh sách tài khoản");
          setAccounts([]);
        }
      } finally {
        if (mounted) setLoadingAccounts(false);
      }
    };
    loadAccounts();
    return () => { mounted = false; };
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    // 1. Validate Form (Client side Zod)
    if (!validate(form)) return;

    // 2. Validate Business Logic (Async Check Duplicate)
    try {
      // Chỉ check trùng Event Code nếu Code thay đổi hoặc là tạo mới
      const shouldCheckCode = mode === "create" || (mode === "edit" && form.event_code !== initialData.event_code);
      
      if (shouldCheckCode) {
        // Lấy ID để loại trừ khi check trùng (hỗ trợ cả id và rule_id)
        const excludeId = mode === "edit" ? initialData?.id || initialData?.rule_id : null;
        const isExists = await postingRulesService.checkEventCodeExists(form.event_code, excludeId);
        
        if (isExists) {
          toast.error(`Mã sự kiện "${form.event_code}" đã tồn tại.`);
          return;
        }
      }
    } catch (err) {
      console.warn("Skip duplicate check due to API error");
    }

    // 3. Confirm & Submit
    if (!window.confirm(mode === "create" ? "Tạo quy tắc định khoản mới?" : "Lưu thay đổi quy tắc?")) return;

    onSubmit?.(form);
  };

  // Render options cho Account Select
  const renderAccountOptions = () => {
    if (loadingAccounts) return <option>Đang tải danh sách...</option>;
    if (accounts.length === 0) return <option value="">-- Không có dữ liệu --</option>;

    return (
      <>
        <option value="">-- Chọn tài khoản --</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.account_code} - {acc.account_name}
          </option>
        ))}
      </>
    );
  };

  return (
    <form className="posting-rule-form" onSubmit={handleSubmit}>
      <h3>
        {mode === "create" ? "Thêm mới quy tắc định khoản" : `Cập nhật quy tắc: ${initialData?.event_code || ''}`}
      </h3>

      <div className="form-grid">
        {/* Mã sự kiện */}
        <FormInput
          label="Mã sự kiện (Event Code)"
          name="event_code"
          value={form.event_code}
          onChange={(e) => {
            // Tự động uppercase khi nhập
            const val = e.target.value.toUpperCase();
            handleChange({ target: { name: "event_code", value: val } });
          }}
          required
          error={errors.event_code}
          placeholder="VD: GRN_CONFIRMED"
          disabled={mode === "edit"} // Thường mã sự kiện hệ thống không cho sửa sau khi tạo
        />

        {/* Diễn giải */}
        <FormInput
          label="Diễn giải sự kiện"
          name="event_description"
          value={form.event_description}
          onChange={handleChange}
          required
          error={errors.event_description}
          placeholder="VD: Nhập kho mua hàng..."
        />

        {/* Phân hệ nguồn */}
        <FormSelect
          label="Phân hệ nguồn"
          name="module_source"
          value={form.module_source}
          onChange={handleChange}
          error={errors.module_source}
          required
        >
          {MODULE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </FormSelect>

        {/* Placeholder để grid layout đẹp hơn (nếu form-grid là 2 cột) */}
        <div className="hidden-mobile"></div> 

        <hr style={{ gridColumn: "1 / -1", margin: "10px 0", borderTop: "1px dashed #ddd" }} />
        
        {/* Tài khoản Nợ */}
        <FormSelect
          label="Tài khoản Nợ"
          name="debit_account_id"
          value={form.debit_account_id}
          onChange={handleChange}
          error={errors.debit_account_id} // Zod sẽ bắn lỗi vào đây nếu chưa chọn
          required
        >
          {renderAccountOptions()}
        </FormSelect>

        {/* Tài khoản Có */}
        <FormSelect
          label="Tài khoản Có"
          name="credit_account_id"
          value={form.credit_account_id}
          onChange={handleChange}
          error={errors.credit_account_id} // Zod sẽ bắn lỗi vào đây nếu trùng Nợ
          required
        >
          {renderAccountOptions()}
        </FormSelect>
        
        {/* Helper text hiển thị lỗi cross-field validation nếu có */}
        {form.debit_account_id && form.credit_account_id && form.debit_account_id === form.credit_account_id && (
           <div style={{ gridColumn: "1 / -1", color: "red", fontSize: "0.875rem", marginTop: "-10px" }}>
              * Lưu ý: Tài khoản Nợ và Tài khoản Có không được trùng nhau.
           </div>
        )}

      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo quy tắc" : "Lưu quy tắc"}
      />
    </form>
  );
}