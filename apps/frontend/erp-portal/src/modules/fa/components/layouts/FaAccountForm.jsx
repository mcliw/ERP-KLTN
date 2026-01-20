// apps/frontend/erp-portal/src/modules/finance/components/layouts/FaAccountForm.jsx

import { useMemo, useEffect, useState } from "react";
// Import Schema đã tạo ở bước trước
import { faAccountSchema } from "../../validations/faAccount.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
// Import Service đã tạo
import { faAccountService } from "../../services/faAccount.service";
import { useToast } from "../../../../shared/components/ToastProvider";

/* ==============================
 * Helpers & Configs
 * ============================== */
const ACCOUNT_TYPES = [
  { value: "ASSET", label: "Tài sản" },
  { value: "LIABILITY", label: "Nợ phải trả" },
  { value: "EQUITY", label: "Vốn chủ sở hữu" },
  { value: "REVENUE", label: "Doanh thu" },
  { value: "EXPENSE", label: "Chi phí" },
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
  account_code: "",
  account_name: "",
  account_type: "ASSET",
  parent_account_id: "",
  is_active: true, // JSON quy định boolean
};

/* ==============================
 * Main Component
 * ============================== */
export default function FaAccountForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const [accounts, setAccounts] = useState([]); // Danh sách tài khoản để chọn làm cha
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const toast = useToast();

  // Khởi tạo giá trị form
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    const cleaned = cleanData(initialData);
    return {
      ...DEFAULT_FORM,
      ...cleaned,
      // Đảm bảo parent_account_id là string để Select hiển thị đúng (vì value option là string/number)
      parent_account_id: cleaned.parent_account_id ? String(cleaned.parent_account_id) : "",
    };
  }, [initialData]);

  // Hook quản lý form
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: faAccountSchema,
  });

  const isDirty = useMemo(() => {
    // So sánh cơ bản để enable nút Submit
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Reset form khi initialData thay đổi
  useEffect(() => {
    if (initialData) {
      const data = cleanData(initialData);
      setForm((prev) => ({
        ...prev,
        ...data,
        parent_account_id: data.parent_account_id ? String(data.parent_account_id) : "",
      }));
    }
  }, [initialData, setForm]);

  // Load danh sách accounts để chọn Parent
  useEffect(() => {
    let mounted = true;
    const loadAccounts = async () => {
      setLoadingAccounts(true);
      try {
        // Lấy danh sách, chỉ lấy active để làm cha
        const list = await faAccountService.getAll({ includeInactive: false });
        if (mounted) {
          setAccounts(list);
        }
      } catch (err) {
        console.error("Failed to load accounts", err);
        if (mounted) setAccounts([]);
      } finally {
        if (mounted) setLoadingAccounts(false);
      }
    };
    loadAccounts();
    return () => { mounted = false; };
  }, []);

  // [LOGIC KẾ TOÁN] Tự động set Type của con theo Type của cha
  useEffect(() => {
    if (form.parent_account_id) {
      const parent = accounts.find(a => String(a.id) === String(form.parent_account_id));
      if (parent && parent.account_type !== form.account_type) {
        setForm(prev => ({ ...prev, account_type: parent.account_type }));
        // Không toast để tránh spam, chỉ âm thầm update UI
      }
    }
  }, [form.parent_account_id, accounts, form.account_type, setForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không có gì thay đổi.");
      return;
    }

    if (!validate(form)) return;

    // Check trùng mã thủ công (User Experience tốt hơn là đợi API báo lỗi)
    // Lưu ý: Logic này có thể bỏ qua nếu muốn tin tưởng hoàn toàn vào API
    try {
        const excludeId = mode === "edit" ? initialData?.id : null;
        const isExists = await faAccountService.checkCodeExists(form.account_code, excludeId);
        if (isExists) {
            toast.error(`Số hiệu tài khoản "${form.account_code}" đã tồn tại.`);
            return;
        }
    } catch (err) {
        // Ignore error check, let API handle it
    }

    if (!window.confirm(mode === "create" ? "Xác nhận tạo tài khoản mới?" : "Lưu các thay đổi?")) return;

    // Chuẩn hóa dữ liệu trước khi gửi (đặc biệt là boolean is_active)
    const submitData = {
        ...form,
        is_active: String(form.is_active) === "true" || form.is_active === true,
        parent_account_id: form.parent_account_id ? Number(form.parent_account_id) : null
    };

    onSubmit?.(submitData);
  };

  // Render options cho Parent
  const renderParentOptions = () => {
    if (loadingAccounts) return <option>Đang tải...</option>;
    
    // Lọc bỏ chính nó (không thể chọn mình làm cha)
    const availableParents = mode === "edit" 
        ? accounts.filter(a => String(a.id) !== String(initialData?.id))
        : accounts;

    if (availableParents.length === 0) return <option value="">-- Không có tài khoản cha phù hợp --</option>;

    // Sắp xếp theo code để dễ nhìn
    availableParents.sort((a, b) => a.account_code.localeCompare(b.account_code));

    return (
      <>
        <option value="">-- Không có (Tài khoản cấp 1) --</option>
        {availableParents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.account_code} - {a.account_name}
          </option>
        ))}
      </>
    );
  };

  return (
    <form className="fa-account-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Thêm mới tài khoản kế toán" : `Cập nhật tài khoản ${initialData?.account_code || ''}`}</h3>

      <div className="form-grid">
        {/* Số hiệu tài khoản (Account Code) */}
        <FormInput
          label="Số hiệu tài khoản"
          name="account_code"
          value={form.account_code}
          onChange={handleChange}
          required
          error={errors.account_code}
          placeholder="VD: 111, 112..."
          // Không cho sửa code khi edit (tuỳ nghiệp vụ, thường kế toán hạn chế sửa mã nếu đã phát sinh)
          // Ở đây cho sửa nhưng check trùng
        />

        {/* Tên tài khoản */}
        <FormInput
          label="Tên tài khoản"
          name="account_name"
          value={form.account_name}
          onChange={handleChange}
          required
          error={errors.account_name}
          placeholder="VD: Tiền mặt..."
        />

        {/* Tài khoản cha */}
        <FormSelect
          label="Tài khoản cha"
          name="parent_account_id"
          value={form.parent_account_id}
          onChange={handleChange}
          disabled={loadingAccounts}
          error={errors.parent_account_id}
        >
          {renderParentOptions()}
        </FormSelect>

        <FormSelect
          label="Tính chất (Dư)"
          name="balance_side"
          value={form.balance_side}
          onChange={handleChange}
          error={errors.balance_side}
          required
        >
          <option value="DEBIT">Dư Nợ</option>
          <option value="CREDIT">Dư Có</option>
          <option value="BOTH">Lưỡng tính</option>
        </FormSelect>

        {/* Loại tài khoản */}
        {/* Nếu đã chọn cha, disable loại tài khoản để đảm bảo tính nhất quán */}
        <FormSelect
          label="Loại tài khoản"
          name="account_type"
          value={form.account_type}
          onChange={handleChange}
          required
          disabled={!!form.parent_account_id} // Disable nếu có cha
          error={errors.account_type}
        >
            {ACCOUNT_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
            ))}
        </FormSelect>

        {/* Trạng thái */}
        <FormSelect 
            label="Trạng thái" 
            name="is_active" 
            // Convert boolean to string for Select value
            value={String(form.is_active)} 
            onChange={(e) => {
                // Manual handle change for boolean
                setForm(prev => ({...prev, is_active: e.target.value === "true"}));
            }}
        >
          <option value="true">Hoạt động</option>
          <option value="false">Ngừng hoạt động</option>
        </FormSelect>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo tài khoản" : "Lưu thay đổi"}
      />
    </form>
  );
}