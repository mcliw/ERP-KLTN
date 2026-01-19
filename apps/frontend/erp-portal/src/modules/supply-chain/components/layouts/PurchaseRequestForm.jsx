// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseRequestForm.jsx

import { useMemo, useEffect, useState } from "react";
import { purchaseRequestCreateSchema, purchaseRequestUpdateSchema } from "../../validations/purchaseRequest.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";
// Import Service thực tế
import { purchaseRequestService } from "../../services/purchaseRequest.service";

/* ==============================
 * Helpers & Configs
 * ============================== */
const DEFAULT_ITEM = {
  product_id: "",
  quantity_requested: 1,
  expected_date: "",
};

const DEFAULT_FORM = {
  pr_code: "",
  requester_id: "",
  department_id: "",
  request_date: new Date().toISOString().split("T")[0], // Default today
  reason: "",
  status: "DRAFT",
  items: [{ ...DEFAULT_ITEM }], // Mặc định có 1 dòng item
};

/* ==============================
 * Main Component
 * ============================== */
export default function PurchaseRequestForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();
  
  // State cho dropdown data
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);

  // Schema thay đổi tùy mode
  const currentSchema = mode === "create" ? purchaseRequestCreateSchema : purchaseRequestUpdateSchema;

  const handleRequesterChange = (e) => {
    const selectedEmpId = e.target.value;

    // 1. Tìm object nhân viên
    const selectedEmp = employees.find(emp => String(emp.id) === String(selectedEmpId));
    
    let targetDeptId = "";

    if (selectedEmp) {
      // Lấy giá trị department từ nhân viên (VD: "IT" như trong ảnh)
      const empDeptValue = selectedEmp.department; 

      // 2. Tìm trong danh sách departments (master data) xem phòng nào khớp
      // Ta so sánh empDeptValue với cả id, name hoặc code của phòng ban để tìm ra ID đúng
      const foundDept = departments.find(d => 
        String(d.id) === String(empDeptValue) || // Trường hợp data lưu ID trực tiếp
        d.name === empDeptValue ||               // Trường hợp data lưu Tên (VD: "IT")
        d.code === empDeptValue                  // Trường hợp data lưu Mã (nếu có)
      );

      if (foundDept) {
        targetDeptId = foundDept.id;
      } else {
        // Fallback: Nếu không tìm thấy trong list, cứ thử set giá trị gốc 
        // (phòng trường hợp ID chính là "IT")
        targetDeptId = empDeptValue;
      }
    }

    // 3. Cập nhật Form
    setForm(prev => ({
      ...prev,
      requester_id: selectedEmpId,
      department_id: targetDeptId ? String(targetDeptId) : ""
    }));
  };

  // Prepare Initial Values
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    
    const items = (initialData.items && initialData.items.length > 0) 
      ? initialData.items 
      : [{ ...DEFAULT_ITEM }];

    return {
      ...DEFAULT_FORM,
      ...initialData,
      // Đảm bảo convert sang string rỗng nếu null/undefined để tránh warning component controlled/uncontrolled
      requester_id: initialData.requester_id ? String(initialData.requester_id) : "", 
      department_id: initialData.department_id ? String(initialData.department_id) : "",
      items: items.map(item => ({
        ...item,
        product_id: item.product_id ? String(item.product_id) : "",
        expected_date: item.expected_date ? item.expected_date.split("T")[0] : ""
      })),
      request_date: initialData.request_date ? initialData.request_date.split("T")[0] : "",
    };
  }, [initialData]);

  // Form Hook
  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: currentSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // Load Reference Data (Employees, Depts, Products) TỪ SERVER
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoadingRefs(true);
      try {
        // Gọi 3 API song song thông qua Service
        const [empRes, deptRes, prodRes] = await Promise.all([
          purchaseRequestService.getEmployeesRef(),   // Port 3001
          purchaseRequestService.getDepartmentsRef(), // Port 3001
          purchaseRequestService.getProductsRef()     // Port 3002
        ]);
        
        if (mounted) {
          setEmployees(empRes);
          setDepartments(deptRes);
          setProducts(prodRes);
        }
      } catch (err) {
        console.error("Load refs error", err);
      } finally {
        if (mounted) setIsLoadingRefs(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  // --- Handlers cho Dynamic Items ---

  const handleAddItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { ...DEFAULT_ITEM }]
    }));
  };

  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) {
      toast.warning("Phải có ít nhất một sản phẩm.");
      return;
    }
    const newItems = form.items.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm(prev => ({ ...prev, items: newItems }));
  };

  // --- Submit ---

  const handleSubmit = (e) => {
    e.preventDefault();

    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không đổi.");
      return;
    }

    if (!validate(form)) {
        console.log("Validation Errors:", errors);
        toast.error("Vui lòng kiểm tra lại thông tin nhập liệu.");
        return;
    }

    if (!window.confirm(mode === "create" ? "Tạo phiếu yêu cầu?" : "Lưu thay đổi?")) return;

    onSubmit?.(form);
  };

  if (isLoadingRefs && mode === "create") return <div className="p-4">Đang tải dữ liệu...</div>;

  return (
    <form className="purchase-request-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo Yêu Cầu Mua Hàng" : `Cập nhật Yêu cầu mua hàng: ${form.pr_code}`}</h3>

      {/* ================= SECTION 1: MASTER DATA ================= */}
      <div className="form-section">
        <h4 className="section-title">Thông tin chung</h4>
        <div className="form-grid">
          <FormInput
            label="Mã phiếu (PR Code)"
            name="pr_code"
            value={form.pr_code}
            onChange={handleChange}
            required
            error={errors.pr_code}
            placeholder="VD: PR-2023-001"
            readOnly={mode === "edit"}
          />

          <FormSelect
            label="Người yêu cầu"
            name="requester_id"
            value={form.requester_id}
            // Thay đổi từ handleChange sang handleRequesterChange
            onChange={handleRequesterChange} 
            error={errors.requester_id}
            required
          >
            <option value="">-- Chọn nhân viên --</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </FormSelect>

          <FormSelect
            label="Phòng ban"
            name="department_id"
            value={form.department_id}
            onChange={handleChange}
            error={errors.department_id}
            required
            disabled={true}
          >
            <option value="">-- Chọn phòng ban --</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </FormSelect>

          <FormInput
            type="date"
            label="Ngày lập phiếu"
            name="request_date"
            value={form.request_date}
            onChange={handleChange}
            error={errors.request_date}
            required
          />

          <div style={{ gridColumn: "1 / -1" }}>
             <FormInput
                label="Lý do mua sắm"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                error={errors.reason}
                placeholder="Nhập lý do chi tiết..."
             />
          </div>

          {mode === "edit" && (
            <FormSelect
                label="Trạng thái"
                name="status"
                value={form.status}
                onChange={handleChange}
                disabled={["APPROVED", "COMPLETED", "CANCELLED"].includes(form.status)}
            >
                <option value="DRAFT">Nháp</option>
                <option value="APPROVED" disabled>Đã Duyệt</option> {/* Không cho chọn Approved thủ công */}
                <option value="REJECTED" disabled>Từ Chối</option> {/* Không cho chọn Rejected thủ công */}
                <option value="CANCELLED">Hủy</option>
            </FormSelect>
          )}
        </div>
      </div>

      <hr className="my-4" style={{marginTop: 30}} />

      {/* ================= SECTION 2: ITEMS DETAIL ================= */}
      <div className="form-section">
        <div className="flex justify-between items-center mb-2">
            <h4 className="section-title">Chi tiết sản phẩm</h4>
            <button 
                type="button" 
                className="btn-primary"
                style={{marginBottom: 10}}
                onClick={handleAddItem}
            >
                + Thêm dòng
            </button>
        </div>

        {errors.items && <div className="error-text mb-2">{errors.items}</div>}

        <div className="table-responsive">
            <table className="main-table">
                <thead>
                    <tr>
                        <th style={{ width: "40%" }}>Sản phẩm</th>
                        <th style={{ width: "20%" }}>Số lượng</th>
                        <th style={{ width: "30%" }}>Ngày cần hàng (Expected)</th>
                        <th style={{ width: "10%" }}>Xóa</th>
                    </tr>
                </thead>
                <tbody>
                    {form.items.map((item, index) => {
                        const prodError = errors?.[`items[${index}].product_id`];
                        const qtyError = errors?.[`items[${index}].quantity_requested`];
                        const dateError = errors?.[`items[${index}].expected_date`];

                        return (
                            <tr key={index}>
                                <td className="form-group" style={{display: 'table-cell'}}>
                                    <select style={{width: '100%'}}
                                        className={`${prodError ? "is-invalid" : ""}`}
                                        value={item.product_id}
                                        onChange={(e) => handleItemChange(index, "product_id", e.target.value)}
                                    >
                                        <option value="">-- Chọn sản phẩm --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                        ))}
                                    </select>
                                    {prodError && <small className="text-danger">{prodError}</small>}
                                </td>
                                <td className="form-group" style={{display: 'table-cell'}}>
                                    <input style={{width: '100%'}}
                                        type="number"
                                        min="1"
                                        className={`${qtyError ? "is-invalid" : ""}`}
                                        value={item.quantity_requested}
                                        onChange={(e) => handleItemChange(index, "quantity_requested", e.target.value)}
                                    />
                                     {qtyError && <small className="text-danger">{qtyError}</small>}
                                </td>
                                <td className="form-group" style={{display: 'table-cell'}}>
                                    <input style={{width: '100%'}}
                                        type="date"
                                        className={`${dateError ? "is-invalid" : ""}`}
                                        value={item.expected_date || ""}
                                        onChange={(e) => handleItemChange(index, "expected_date", e.target.value)}
                                    />
                                    {dateError && <small className="text-danger">{dateError}</small>}
                                </td>
                                <td className="form-group" style={{display: 'table-cell'}}>
                                    <button style={{width: '100%'}}
                                        type="button"
                                        className="btn-icon-danger"
                                        onClick={() => handleRemoveItem(index)}
                                        title="Xóa dòng"
                                    >
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Lưu phiếu yêu cầu" : "Cập nhật phiếu"}
      />
    </form>
  );
}