// apps/frontend/erp-portal/src/modules/supply-chain/components/layouts/PurchaseOrderForm.jsx

import { useMemo, useEffect, useState } from "react";
import { poCreateSchema, poUpdateSchema, calculatePOTotal } from "../../validations/purchaseOrder.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";

// Import Services
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { quotationService } from "../../services/quotation.service";

/* ==============================
 * Helpers & Configs
 * ============================== */
const DEFAULT_FORM = {
  po_code: "",
  quotation_id: "",
  supplier_id: "",
  order_date: new Date().toISOString().split("T")[0],
  expected_delivery_date: "",
  total_amount: 0,
  tax_amount: 0,
  discount_amount: 0,
  status: "PENDING",
  approved_by: null,
  items: []
};

/* ==============================
 * Main Component
 * ============================== */
export default function PurchaseOrderForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();
  
  // State dropdown data
  const [suppliers, setSuppliers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(false);

  const currentSchema = mode === "create" ? poCreateSchema : poUpdateSchema;

  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    return {
      ...DEFAULT_FORM,
      ...initialData,
      supplier_id: initialData.supplier_id ? String(initialData.supplier_id) : "",
      quotation_id: initialData.quotation_id ? String(initialData.quotation_id) : "",
      order_date: initialData.order_date ? initialData.order_date.split("T")[0] : "",
      expected_delivery_date: initialData.expected_delivery_date ? initialData.expected_delivery_date.split("T")[0] : "",
      items: initialData.items || initialData.po_items || []
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
        const [supRes, quoRes, prodRes, allPOs] = await Promise.all([
          quotationService.getSuppliersRef(),
          quotationService.getAll(),
          purchaseOrderService.getProductsRef(),
          purchaseOrderService.getAll()
        ]);
        
        if (mounted) {
          setSuppliers(supRes);
          // Chỉ lấy các báo giá đã được duyệt hoặc đã được chọn
          setQuotations(quoRes.filter(q => q.status === "APPROVED" || q.is_selected)); 
          setProducts(prodRes);

          const usedQuotationIds = allPOs
            .filter(po => 
                // Loại bỏ đơn bị hủy hoặc từ chối, các trạng thái còn lại coi như đã chiếm dụng báo giá
                (po.status === "APPROVED" || po.status === "COMPLETED") 
            )
            .map(po => String(po.quotation_id));

            const availableQuotations = quoRes.filter(q => {
             // Điều kiện A: Báo giá phải Approve hoặc Selected
             const isReady = q.status === "APPROVED" || q.is_selected;
             
             // Điều kiện B: Không nằm trong danh sách đã dùng
             const isNotUsed = !usedQuotationIds.includes(String(q.id));

             // Ngoại lệ: Nếu đang Edit đơn hàng này, phải giữ lại báo giá hiện tại của nó
             const isCurrentOwner = mode === 'edit' && String(q.id) === String(initialData?.quotation_id);

             return isReady && (isNotUsed || isCurrentOwner);
          });

          setQuotations(availableQuotations);
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

  // 2. Logic Auto-fill Items từ BÁO GIÁ (Quotation -> PO)
  // [UPDATED] Sử dụng hàm helper từ service thay vì logic thủ công
  useEffect(() => {
    // Chỉ chạy khi tạo mới và có chọn Báo giá
    if (mode === "create" && form.quotation_id) {
      const fillDataFromQuote = async () => {
         try {
             // Gọi hàm service đã tạo để lấy dữ liệu đã được mapping chuẩn
             const dataRef = await purchaseOrderService.getDataFromQuotation(form.quotation_id);

             if (dataRef) {
                 setForm(prev => ({
                     ...prev,
                     supplier_id: String(dataRef.supplier_id),
                     // Cập nhật danh sách items (đã được map key thành quantity_ordered, total_line_amount)
                     items: dataRef.items,
                     // Reset discount về 0 khi chọn báo giá mới
                     discount_amount: 0
                 }));
                 // Lưu ý: total_amount và tax_amount sẽ được tính toán lại bởi useEffect #3 bên dưới
             }
         } catch (error) {
             console.error("Lỗi auto-fill Quotation Items:", error);
             toast.error("Không thể lấy thông tin chi tiết báo giá.");
         }
      };
      fillDataFromQuote();
    }
  }, [form.quotation_id, mode, setForm, toast]);

  // 3. Auto Calculate Total (Tính lại khi items thay đổi hoặc chiết khấu thay đổi)
  useEffect(() => {
      // Giả sử thuế mặc định là 10% (0.1)
      const { taxAmount, totalAmount } = calculatePOTotal(form.items, 0.1, form.discount_amount);
      
      setForm(prev => {
          // Chỉ update nếu giá trị thực sự thay đổi để tránh infinite loop (dù React batch update xử lý tốt việc này)
          if (prev.tax_amount === taxAmount && prev.total_amount === totalAmount) return prev;
          
          return { 
              ...prev, 
              tax_amount: taxAmount, 
              total_amount: totalAmount 
          };
      });
  }, [form.items, form.discount_amount, setForm]);

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
    if (!window.confirm(mode === "create" ? "Phát hành đơn mua hàng?" : "Lưu thay đổi?")) return;
    onSubmit?.(form);
  };

  if (isLoadingRefs && mode === "create") return <div className="p-4 text-center">Đang tải dữ liệu...</div>;

  return (
    <form className="purchase-order-form" onSubmit={handleSubmit}>
      <h3 className="mb-4">
        {mode === "create" ? "Lập Đơn Mua Hàng" : `Cập nhật Đơn hàng: ${form.po_code}`}
      </h3>

      {/* ================= SECTION 1: HEADER ================= */}
      <div className="form-section mb-4 p-3 border rounded bg-light">
        <h5 className="section-title text-primary mb-3">Thông tin nguồn gốc</h5>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormInput
            label="Mã Đơn hàng" name="po_code" value={form.po_code} onChange={handleChange}
            required error={errors.po_code} placeholder="VD: PO-2023-500" readOnly={mode === "edit"}
          />
          <FormSelect
            label="Dựa trên Báo giá (RFQ)" name="quotation_id" value={form.quotation_id} onChange={handleChange}
            error={errors.quotation_id} required disabled={mode === "edit"}
          >
            <option value="">-- Chọn Báo giá đã duyệt --</option>
            {quotations.map(q => (
                <option key={q.id} value={q.id}>
                    {q.rfq_code} - {new Intl.NumberFormat('vi-VN').format(q.total_amount)} ₫
                </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Nhà cung cấp" name="supplier_id" value={form.supplier_id} onChange={handleChange}
            error={errors.supplier_id} required disabled={true} 
          >
            <option value="">-- Tự động theo báo giá --</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FormSelect>
        </div>
      </div>

      {/* ================= SECTION 2: CHI TIẾT HÀNG HÓA (READ-ONLY) ================= */}
      <div className="form-section mb-4 p-3 border rounded">
        <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="section-title text-primary mb-0">
                Chi tiết hàng hóa
            </h5>
            {/* Không có nút thêm/xóa dòng vì phụ thuộc báo giá */}
        </div>

        {errors.items && <div className="text-danger small mb-2">{errors.items}</div>}

        <div className="table-responsive">
            <table className="main-table">
                <thead className="thead-light">
                    <tr>
                        <th style={{width: '45%'}}>Sản phẩm</th>
                        <th style={{width: '15%'}} className="text-center">Số lượng</th>
                        <th style={{width: '20%'}} className="text-right">Đơn giá</th>
                        <th style={{width: '20%'}} className="text-right">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    {form.items.map((item, index) => (
                        <tr key={index}>
                            <td className="form-group" style={{display: 'table-cell'}}>
                                {/* Disabled Select để hiển thị tên sản phẩm */}
                                <select 
                                    className="form-control form-control-sm border-0 bg-transparent"
                                    value={item.product_id}
                                    disabled={true} 
                                    style={{ appearance: 'none', color: '#000', cursor: 'default' }}
                                >
                                    <option value="">SP không xác định</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                                    ))}
                                </select>
                            </td>
                            <td className="form-group" style={{display: 'table-cell'}}>
                                {item.quantity_ordered}
                            </td>
                            <td className="form-group" style={{display: 'table-cell'}}>
                                {new Intl.NumberFormat('vi-VN').format(item.unit_price)} ₫
                            </td>
                            <td className="form-group" style={{display: 'table-cell'}}>
                                {new Intl.NumberFormat('vi-VN').format(item.total_line_amount)} ₫
                            </td>
                        </tr>
                    ))}
                    {form.items.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-4 text-muted">Vui lòng chọn Báo giá để hiển thị danh sách hàng hóa.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* ================= SECTION 3: THANH TOÁN ================= */}
      <div className="form-section mb-4 p-3 border rounded">
        <h5 className="section-title text-primary mb-3">Thanh toán & Giao hàng</h5>
        <div className="row">
             <div className="form-grid">
                 <div className="form-group">
                    <FormInput type="date" label="Ngày đặt hàng" name="order_date" value={form.order_date} onChange={handleChange} error={errors.order_date} required />
                 </div>
                 <div className="form-group">
                    <FormInput type="date" label="Dự kiến giao hàng" name="expected_delivery_date" value={form.expected_delivery_date} onChange={handleChange} error={errors.expected_delivery_date} required />
                 </div>
                 {mode === "edit" && (
                    <FormSelect label="Trạng thái PO" name="status" value={form.status} onChange={handleChange}>
                        <option value="PENDING">Chờ phê duyệt</option>
                        <option value="APPROVED">Đã phê duyệt</option>
                        <option value="REJECTED">Từ chối</option>
                        <option value="CANCELLED">Hủy bỏ</option>
                        <option value="COMPLETED">Đã hoàn thành</option>
                    </FormSelect>
                )}
             </div>

             <div className="col-md-6">
                <div className="form-group" style={{marginTop: 15}}>
                    <FormInput type="number" label="Chiết khấu (VND)" name="discount_amount" value={form.discount_amount} onChange={handleChange} error={errors.discount_amount} />
                    
                    <div style={{marginTop: 15}}>
                        <span>Tổng tiền hàng: </span>
                        <strong>{new Intl.NumberFormat('vi-VN').format(form.items.reduce((sum, i) => sum + (Number(i.total_line_amount)||0), 0))} ₫</strong>
                    </div>

                    <div style={{marginTop: 10}}>
                        <span>Thuế VAT (10%):</span>
                        <span>{new Intl.NumberFormat('vi-VN').format(form.tax_amount)} ₫</span>
                    </div>
                    
                    <hr/>
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="h5 text-primary mb-0">TỔNG THANH TOÁN:</span>
                        <span className="h4 text-primary font-weight-bold mb-0">
                            {new Intl.NumberFormat('vi-VN').format(form.total_amount)} ₫
                        </span>
                    </div>
                </div>
             </div>
        </div>
      </div>

      <FormActions mode={mode} isDirty={isDirty} onCancel={onCancel} submitLabel={mode === "create" ? "Phát hành Đơn hàng" : "Lưu cập nhật"} disableSubmit={form.status === "COMPLETED"} />
    </form>
  );
}