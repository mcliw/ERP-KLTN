// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/QuotationForm.jsx

import { useMemo, useEffect, useState } from "react";
import { quotationCreateSchema, quotationUpdateSchema } from "../../validations/quotation.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

// Import Services
import { quotationService } from "../../services/quotation.service";
import { purchaseRequestService } from "../../services/purchaseRequest.service"; 

/* ==============================
 * Helpers & Configs
 * ============================== */
const DEFAULT_FORM = {
  rfq_code: "",
  supplier_id: "",
  pr_id: "",
  quotation_date: new Date().toISOString().split("T")[0],
  valid_until: "",
  total_amount: 0,
  status: "PENDING",
  is_selected: false,
  items: [] // Thêm mảng items vào form default
};

/* ==============================
 * Main Component
 * ============================== */
export default function QuotationForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();
  
  // State dropdown data
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [products, setProducts] = useState([]); // Danh sách sản phẩm để hiển thị tên nếu cần
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);

  const currentSchema = mode === "create" ? quotationCreateSchema : quotationUpdateSchema;

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    return {
      ...DEFAULT_FORM,
      ...initialData,
      supplier_id: initialData.supplier_id ? String(initialData.supplier_id) : "",
      pr_id: initialData.pr_id ? String(initialData.pr_id) : "",
      quotation_date: initialData.quotation_date ? initialData.quotation_date.split("T")[0] : "",
      valid_until: initialData.valid_until ? initialData.valid_until.split("T")[0] : "",
      total_amount: initialData.total_amount || 0,
      items: initialData.items || [] // Load items nếu có (edit mode)
    };
  }, [initialData]);

  const { form, setForm, errors, handleChange, validate } = useFormManager({
    initialValues: safeInitialValues,
    mode,
    schema: currentSchema,
  });

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(safeInitialValues);
  }, [form, safeInitialValues]);

  // 1. Load Reference Data
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setIsLoadingRefs(true);
      try {
        const [supRes, prsRes, prodRes, allQuotes] = await Promise.all([
          quotationService.getSuppliersRef(),
          purchaseRequestService.getAll(),
          purchaseRequestService.getProductsRef(),
          quotationService.getAll() 
        ]);
        
        if (mounted) {
          setSuppliers(supRes);
          setProducts(prodRes);

          // A. Tìm các PR ID đã bị "khóa" 
          // (PR đã nằm trong báo giá APPROVED hoặc SELECTED)
          const usedPrIds = allQuotes
            .filter(q => q.status === "APPROVED" || q.is_selected === true)
            .map(q => String(q.pr_id));

          // B. Lọc danh sách hiển thị
          const availablePRs = (Array.isArray(prsRes) ? prsRes : []).filter(pr => {
            // 1. PR phải Approved
            const isApproved = pr.status === "APPROVED";
            
            // 2. PR chưa bị dùng
            const isNotUsed = !usedPrIds.includes(String(pr.id));

            // 3. Ngoại lệ: Nếu đang Edit báo giá này, giữ lại PR cũ của nó
            const isCurrentOwner = mode === 'edit' && String(pr.id) === String(initialData?.pr_id);

            return isApproved && (isNotUsed || isCurrentOwner);
          });

          setPurchaseRequests(availablePRs);
        }
      } catch (err) {
        console.error("Load refs error", err);
        toast.error("Không thể tải danh sách dữ liệu tham chiếu.");
      } finally {
        if (mounted) setIsLoadingRefs(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [toast, mode, initialData]);

  // 2. LOGIC QUAN TRỌNG: Auto-fill Items từ PR khi chọn PR
  useEffect(() => {
    // Chỉ chạy khi tạo mới và đã chọn PR (Nếu edit thì dùng items từ initialData)
    if (mode === "create" && form.pr_id) {
        const fetchPRItems = async () => {
            try {
                // Gọi Service lấy thông tin PR bao gồm items
                const prDetail = await purchaseRequestService.getById(form.pr_id);
                
                if (prDetail && prDetail.items) {
                    // Map từ PR Items -> Quotation Items
                    const newItems = prDetail.items.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity_requested, // Số lượng yêu cầu
                        unit_price: 0, // Giá báo = 0, chờ nhập
                        total_line: 0
                    }));

                    setForm(prev => ({
                        ...prev,
                        items: newItems
                    }));
                }
            } catch (error) {
                console.error("Lỗi tải items từ PR:", error);
                toast.error("Không thể tải danh sách sản phẩm từ yêu cầu.");
            }
        };
        fetchPRItems();
    }
  }, [form.pr_id, mode, setForm, toast]);

  // 3. Tự động tính Tổng tiền khi thay đổi đơn giá
  useEffect(() => {
      const total = form.items.reduce((sum, item) => sum + (Number(item.total_line) || 0), 0);
      setForm(prev => ({ ...prev, total_amount: total }));
  }, [form.items, setForm]);

  // --- Handlers cho Bảng Items ---
  const handleItemChange = (index, value) => {
      const newItems = [...form.items];
      const item = newItems[index];
      
      const price = Number(value);
      item.unit_price = price;
      item.total_line = price * item.quantity; // Tính thành tiền dòng

      newItems[index] = item;
      setForm(prev => ({ ...prev, items: newItems }));
  };

  const getProductName = (id) => {
      const p = products.find(x => String(x.id) === String(id));
      return p ? `${p.code} - ${p.name}` : id;
  };

  // --- Submit ---
  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không đổi.");
      return;
    }
    if (!validate(form)) {
        toast.error("Vui lòng kiểm tra lại thông tin nhập liệu.");
        return;
    }
    // Validation bổ sung: Phải có ít nhất 1 sản phẩm
    if (form.items.length === 0) {
        toast.error("Vui lòng chọn Yêu cầu mua hàng để lấy danh sách sản phẩm.");
        return;
    }
    // Validation bổ sung: Giá > 0
    if (form.items.some(i => i.unit_price <= 0)) {
        if(!window.confirm("Cảnh báo: Có sản phẩm đơn giá bằng 0. Bạn có chắc chắn muốn lưu?")) return;
    }

    if (!window.confirm(mode === "create" ? "Tạo báo giá mới?" : "Lưu thay đổi báo giá?")) return;
    onSubmit?.(form);
  };

  if (isLoadingRefs && mode === "create") return <div className="p-4">Đang tải dữ liệu...</div>;

  return (
    <form className="quotation-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo Báo Giá Mới" : `Cập nhật Báo Giá: ${form.rfq_code}`}</h3>

      {/* ================= SECTION 1: INFO ================= */}
      <div className="form-section mb-4 p-3 border rounded bg-light">
        <h5 className="section-title text-primary mb-3">Thông tin chung</h5>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormInput
            label="Mã RFQ / Báo giá" name="rfq_code" value={form.rfq_code} onChange={handleChange}
            required error={errors.rfq_code} placeholder="VD: RFQ-23-055" readOnly={mode === "edit"}
          />
          <FormSelect
            label="Thuộc Yêu cầu mua hàng (PR)" name="pr_id" value={form.pr_id} onChange={handleChange}
            error={errors.pr_id} required disabled={mode === "edit"}
          >
            <option value="">-- Chọn yêu cầu mua hàng --</option>
            {purchaseRequests.map(pr => (
                <option key={pr.id} value={pr.id}>{pr.pr_code} - {pr.reason}</option>
            ))}
          </FormSelect>
          <FormSelect
            label="Nhà cung cấp" name="supplier_id" value={form.supplier_id} onChange={handleChange}
            error={errors.supplier_id} required
          >
            <option value="">-- Chọn Nhà cung cấp --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FormSelect>
        </div>
      </div>

      {/* ================= SECTION 2: ITEMS (NEW) ================= */}
      <div className="form-section mb-4 p-3 border rounded">
        <h5 className="section-title text-primary mb-3">Chi tiết Báo giá</h5>
        
        <div className="table-responsive">
            <table className="main-table">
                <thead className="thead-light">
                    <tr>
                        <th style={{width: '40%'}}>Sản phẩm</th>
                        <th style={{width: '15%'}} className="text-center">Số lượng (PR)</th>
                        <th style={{width: '25%'}} className="text-right">Đơn giá (VND)</th>
                        <th style={{width: '20%'}} className="text-right">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {form.items.map((item, index) => (
                        <tr key={index}>
                            <td>
                                <span className="font-weight-bold">{getProductName(item.product_id)}</span>
                            </td>
                            <td className="text-center bg-light">
                                {item.quantity}
                            </td>
                            <td className="form-group">
                                <input 
                                    type="number" 
                                    className="form-control text-right"
                                    min="0"
                                    placeholder="Nhập giá..."
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                />
                            </td>
                            <td className="text-right align-middle font-weight-bold">
                                {new Intl.NumberFormat('vi-VN').format(item.total_line)} ₫
                            </td>
                        </tr>
                    ))}
                    {form.items.length === 0 && (
                        <tr>
                            <td colSpan="4" className="text-center py-4 text-muted">
                                Vui lòng chọn Yêu cầu mua hàng ở trên để hiển thị danh sách sản phẩm.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="form-group" style={{marginTop: 15}}>
              <label style={{fontWeight: 'bold'}}>Tổng giá trị</label>
              <div className="form-control font-weight-bold text-primary bg-light">
                  {new Intl.NumberFormat('vi-VN').format(form.total_amount)} ₫
              </div>
            </div>
        </div>
      </div>

      {/* ================= SECTION 3: TIME & STATUS ================= */}
      <div className="form-section mb-4 p-3 border rounded">
         <div className="form-grid" style={{ marginTop: 15 }}>
             <FormInput type="date" label="Ngày báo giá" name="quotation_date" value={form.quotation_date} onChange={handleChange} required error={errors.quotation_date} />
             <FormInput type="date" label="Hiệu lực đến ngày" name="valid_until" value={form.valid_until} onChange={handleChange} required error={errors.valid_until} />
         </div>
      </div>

      <FormActions mode={mode} isDirty={isDirty} onCancel={onCancel} submitLabel={mode === "create" ? "Lưu Báo Giá" : "Cập nhật"} disableSubmit={form.is_selected} />
    </form>
  );
}