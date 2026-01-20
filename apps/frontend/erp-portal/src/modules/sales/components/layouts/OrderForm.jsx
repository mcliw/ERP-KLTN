// apps/frontend/erp-portal/src/modules/sales/components/layouts/OrderForm.jsx

import { useMemo, useEffect, useState } from "react";
import { orderCreateSchema, orderUpdateSchema } from "../../validations/order.schema";
import { useFormManager, FormInput, FormSelect, FormActions } from "../../../../shared/components/FormCommon";
import { useToast } from "../../../../shared/components/ToastProvider";
import { customerService } from "../../services/customer.service";
import { productService } from "../../services/product.service"; // 1. Import Product Service

/* ==============================
 * Helpers & Configs
 * ============================== */
const DEFAULT_ITEM = {
  product_variant_id: "",
  quantity: 1,
  price: 0,
};

const DEFAULT_FORM = {
  customer_id: "", 
  voucher_detail_id: "",
  payment_method: "COD", 
  shipping_address: "",
  order_status: "PENDING",
  items: [DEFAULT_ITEM],
};

const PAYMENT_METHODS = ["COD", "MOMO", "CREDIT_CARD", "BANK_TRANSFER"];
const ORDER_STATUSES = [
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

/* ==============================
 * Main Component
 * ============================== */
export default function OrderForm({ mode = "create", initialData, onSubmit, onCancel }) {
  const toast = useToast();
  
  // State data
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Schema động theo mode
  const currentSchema = mode === "create" ? orderCreateSchema : orderUpdateSchema;

  // Init Form Values
  const safeInitialValues = useMemo(() => {
    if (!initialData) return DEFAULT_FORM;
    
    return {
      ...DEFAULT_FORM,
      ...initialData,
      items: initialData.items && initialData.items.length > 0 ? initialData.items : [DEFAULT_ITEM],
      customer_id: String(initialData.customer_id || ""), 
      payment_method: initialData.payment_method || "COD",
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

  // Load Metadata (Customers & Products)
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
        setLoadingData(true);
        try {
            // 2. Load song song Customer và Product từ API thực
            const [customerData, productData] = await Promise.all([
                customerService.getAll(),
                productService.getAll()
            ]);

            if (mounted) {
                setCustomers(customerData);
                setProducts(productData);
            }
        } catch (error) {
            console.error("Error loading data", error);
            toast.error("Không thể tải dữ liệu danh mục");
        } finally {
            if (mounted) setLoadingData(false);
        }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Xử lý khi chọn Khách hàng -> Tự động điền địa chỉ
  const handleCustomerChange = (e) => {
    handleChange(e); 

    const selectedCustomerId = e.target.value;
    const customer = customers.find(c => String(c.id) === String(selectedCustomerId));

    if (customer && customer.address && !form.shipping_address) {
        setForm(prev => ({
            ...prev,
            shipping_address: customer.address
        }));
        toast.info(`Đã tự động điền địa chỉ của ${customer.full_name}`);
    }
  };

  // Xử lý thay đổi items
  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Tự động điền giá khi chọn sản phẩm
    if (field === "product_variant_id") {
        const selectedProd = products.find(p => String(p.id) === String(value));
        if (selectedProd) {
            // 3. Lấy giá từ product service (đã đảm bảo là số)
            newItems[index].price = selectedProd.price;
        }
    }

    setForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm(prev => ({
        ...prev,
        items: [...prev.items, { ...DEFAULT_ITEM }]
    }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) {
        toast.warning("Đơn hàng phải có ít nhất 1 sản phẩm");
        return;
    }
    const newItems = form.items.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, items: newItems }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "edit" && !isDirty) {
      toast.info("Dữ liệu không đổi");
      return;
    }

    if (!validate(form)) {
        console.log("Validation errors:", errors);
        return;
    }

    if (!window.confirm(mode === "create" ? "Tạo đơn hàng?" : "Lưu thay đổi?")) return;

    const submitData = {
        ...form,
        items: form.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            price: Number(item.price)
        }))
    };

    onSubmit?.(submitData);
  };

  const totalAmount = form.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);

  return (
    <form className="employee-form" onSubmit={handleSubmit}>
      <h3>{mode === "create" ? "Tạo đơn hàng mới" : "Cập nhật đơn hàng"}</h3>

      {/* --- PHẦN 1: THÔNG TIN CHUNG --- */}
      <div className="form-grid">
        {mode === "edit" && (
            <FormInput label="Mã đơn (ID)" value={form.id || ""} readOnly disabled style={{ background: "#f3f4f6" }} />
        )}

        <FormSelect
            label="Khách hàng"
            name="customer_id" 
            value={form.customer_id}
            onChange={handleCustomerChange}
            error={errors.customer_id}
            required
            disabled={loadingData}
        >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map(c => (
                <option key={c.id} value={c.id}>
                    {c.full_name} {c.phone ? `(${c.phone})` : ""}
                </option>
            ))}
        </FormSelect>

        <FormSelect
            label="Phương thức thanh toán"
            name="payment_method"
            value={form.payment_method}
            onChange={handleChange}
            error={errors.payment_method}
            required
        >
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </FormSelect>

        <FormSelect
            label="Trạng thái"
            name="order_status"
            value={form.order_status}
            onChange={handleChange}
            error={errors.order_status}
            disabled={mode === "create"} 
        >
            {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </FormSelect>

        <div style={{ gridColumn: "1 / -1" }}>
            <FormInput
                label="Địa chỉ giao hàng"
                name="shipping_address"
                value={form.shipping_address}
                onChange={handleChange}
                error={errors.shipping_address}
                placeholder="Số nhà, đường, quận/huyện..."
                required
            />
        </div>
      </div>

      <hr style={{ margin: "20px 0", borderTop: "1px solid #e5e7eb" }} />

      {/* --- PHẦN 2: CHI TIẾT SẢN PHẨM --- */}
      <div className="order-items-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h4>Chi tiết sản phẩm</h4>
            {mode !== "view" && (
                <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                    + Thêm sản phẩm
                </button>
            )}
        </div>

        {errors.items && <p className="error-text" style={{marginBottom: 10}}>{errors.items}</p>}

        <table className="main-table" style={{ marginBottom: 20 }}>
            <thead>
                <tr>
                    <th style={{width: "40%"}}>Sản phẩm</th>
                    <th style={{width: "20%"}}>Đơn giá</th>
                    <th style={{width: "15%"}}>Số lượng</th>
                    <th style={{width: "20%"}}>Thành tiền</th>
                    <th style={{width: "5%"}}>Xóa</th>
                </tr>
            </thead>
            <tbody>
                {form.items.map((item, index) => (
                    <tr key={index}>
                        <td className="form-group" style={{display: 'table-cell'}}>
                            <select 
                                className="form-input"
                                value={item.product_variant_id}
                                onChange={(e) => handleItemChange(index, "product_variant_id", e.target.value)}
                                disabled={mode === "view"}
                            >
                                <option value="">-- Chọn Sản phẩm --</option>
                                {/* 4. Render danh sách sản phẩm từ Supply Chain */}
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} - {p.code} (Tồn: {p.minStock ?? 'N/A'})
                                    </option>
                                ))}
                            </select>
                            {errors[`items.${index}.product_variant_id`] && (
                                <span className="error-text-sm">{errors[`items.${index}.product_variant_id`]}</span>
                            )}
                        </td>
                        <td className="form-group" style={{display: 'table-cell'}}>
                            <input 
                                type="number" 
                                className="form-input"
                                value={item.price}
                                readOnly
                                style={{ background: "#f9fafb" }}
                            />
                        </td>
                        <td className="form-group" style={{display: 'table-cell'}}>
                            <input 
                                type="number" 
                                className="form-input"
                                value={item.quantity}
                                min="1"
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                disabled={mode === "view"}
                            />
                        </td>
                        <td className="form-group" style={{display: 'table-cell'}}>
                            {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="form-group" style={{display: 'table-cell'}}>
                            {form.items.length > 1 && mode !== "view" && (
                                <button 
                                    type="button" 
                                    className="btn-icon danger"
                                    onClick={() => removeItem(index)}
                                    title="Xóa dòng"
                                >
                                    &times;
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        <div style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.1rem" }}>
            Tổng cộng: {totalAmount.toLocaleString('vi-VN')} đ
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Hoàn tất đơn hàng" : "Lưu cập nhật"}
      />
    </form>
  );
}