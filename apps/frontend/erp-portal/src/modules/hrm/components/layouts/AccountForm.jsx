import { useMemo, useEffect, useState } from "react";
import { accountCreateSchema, accountUpdateSchema } from "../../validations/account.schema"; 
import {
  useFormManager,
  FormInput,
  FormSelect,
  FormPassword,
  FormActions,
} from "../common/FormCommon";
import { employeeService } from "../../services/employee.service";
import { useToast } from "../../../../shared/components/ToastProvider";

const DEFAULT_FORM = {
  userId: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "",
  employeeId: "",
  fullName: "",
  department: "",
  position: "",
  status: "ACTIVE",
};

export default function AccountForm({
  mode = "create",
  onSubmit,
  onCancel,
  initialData = {},
  roleOptions = [], // Prop cần kiểm tra kỹ
}) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState([]);
  const [loadingEmp, setLoadingEmp] = useState(false);

  // --- DEBUG LOG: Kiểm tra Props đầu vào ---
  console.group("DEBUG ACCOUNT_FORM");
  console.log("1. Mode:", mode);
  console.log("2. RoleOptions nhận được:", roleOptions);
  console.log("   - Là mảng?", Array.isArray(roleOptions));
  
  // Nếu roleOptions bị lỗi, in cảnh báo
  if (!Array.isArray(roleOptions)) {
    console.error("LỖI NGHIÊM TRỌNG: roleOptions không phải là mảng!", roleOptions);
  }
  console.groupEnd();
  // ----------------------------------------

  const {
    form,
    errors,
    isDirty,
    handleChange,
    setForm,
    handleSubmit,
  } = useFormManager({  // <--- Thêm dấu ngoặc nhọn { để gom thành 1 object
    initialValues: initialData || DEFAULT_FORM, // Merge với default nếu null
    mode: mode,
    schema: mode === "create" ? accountCreateSchema : accountUpdateSchema
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmp(true);
      try {
        console.log("3. Bắt đầu gọi API Employee...");
        const response = await employeeService.getAll();
        console.log("4. Raw Response từ Service:", response);

        // Logic an toàn để lấy mảng
        const rawData = response.data;
        let allEmployees = [];

        if (Array.isArray(rawData)) {
            allEmployees = rawData;
        } else if (rawData && Array.isArray(rawData.content)) {
            allEmployees = rawData.content;
        } else if (rawData && Array.isArray(rawData.items)) {
            allEmployees = rawData.items;
        } else {
            console.warn("   - API trả về data lạ, không tìm thấy mảng:", rawData);
        }

        console.log("5. Danh sách nhân viên sau khi xử lý:", allEmployees);
        
        // Lọc nhân viên
        const availableEmployees = allEmployees.filter(emp => 
          emp.status === 'OFFICIAL' || emp.status === 'PROBATION'
        );
        console.log("6. Nhân viên khả dụng (sau filter):", availableEmployees);

        setEmployees(availableEmployees);
      } catch (error) {
        console.error("Lỗi tải nhân viên:", error);
        toast.error("Không thể tải danh sách nhân viên");
      } finally {
        setLoadingEmp(false);
      }
    };

    fetchEmployees();
  }, []);

  const handleEmployeeSelect = (e) => {
    const selectedId = e.target.value;
    const selectedEmp = employees.find(emp => emp.id === selectedId);

    if (selectedEmp) {
      setForm(prev => ({
        ...prev,
        employeeId: selectedEmp.id,
        userId: selectedEmp.accountId,
        email: selectedEmp.email,
        fullName: selectedEmp.fullName,
        department: selectedEmp.department ? selectedEmp.department.name : "N/A",
        position: selectedEmp.position ? selectedEmp.position.name : "N/A",
      }));
    } else {
      setForm(prev => ({
        ...prev,
        employeeId: "", userId: "", email: "", fullName: "", department: "", position: ""
      }));
    }
  };

  // --- SAFE CHECK CHO MẢNG TRƯỚC KHI RENDER ---
  // Nếu employees hoặc roleOptions không phải mảng, code sẽ crash tại .map()
  // Chúng ta chặn trước và return UI báo lỗi để biết nguyên nhân.
  
  if (!Array.isArray(roleOptions)) {
    return (
      <div style={{ padding: 20, color: 'red', border: '1px solid red' }}>
        <h3>⛔ Lỗi dữ liệu RoleOptions</h3>
        <p>Frontend đang nhận được `roleOptions` là: <b>{typeof roleOptions}</b> (Mong đợi: Array)</p>
        <p>Giá trị: {JSON.stringify(roleOptions)}</p>
        <p>👉 Vui lòng kiểm tra file <code>AccountCreate.jsx</code> xem đã import <code>ROLE_OPTIONS</code> chưa.</p>
      </div>
    );
  }

  // Generate options an toàn
  const safeEmployeeOptions = Array.isArray(employees) ? employees.map(e => ({
      value: e.id,
      label: `${e.code} - ${e.fullName}`
  })) : [];

  return (
    <form onSubmit={handleSubmit} className="account-form">
      {/* Hiển thị thông báo debug nhỏ để biết form đang chạy chế độ test */}
      <div style={{background: '#fff3cd', padding: '5px 10px', marginBottom: 10, fontSize: 12}}>
         🛠️ Debug Mode: Loaded {employees.length} employees | {roleOptions.length} roles
      </div>

      <div className="form-grid">
        <div className="form-section">
          <h4 style={{marginBottom: '15px', color: 'var(--primary-color)'}}>Thông tin đăng nhập</h4>
          
          <FormInput
            label="Email (Tên đăng nhập)"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            error={errors.email}
            readOnly={!!form.employeeId}
            placeholder="Tự động điền từ nhân viên"
          />

          <FormPassword
            label="Mật khẩu"
            name="password"
            value={form.password}
            onChange={handleChange}
            required={mode === "create"}
            error={errors.password}
          />

          <FormPassword
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required={mode === "create"}
            error={errors.confirmPassword}
          />

          <FormSelect
            label="Phân quyền (Role)"
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            options={roleOptions} // Đây là chỗ thường gây crash nếu roleOptions lỗi
            error={errors.role}
            placeholder="-- Chọn vai trò --"
          />
        </div>

        <div className="form-section">
          <h4 style={{marginBottom: '15px', color: 'var(--primary-color)'}}>Thông tin nhân sự</h4>

          <FormSelect
            label="Chọn Nhân Viên"
            name="employeeId"
            value={form.employeeId}
            onChange={handleEmployeeSelect}
            required
            options={safeEmployeeOptions}
            error={errors.employeeId}
            disabled={mode === "edit"}
            placeholder={loadingEmp ? "Đang tải..." : "-- Chọn nhân viên --"}
          />

          <FormInput
            label="Họ và tên"
            name="fullName"
            value={form.fullName}
            readOnly
            disabled
            className="input-disabled-custom"
          />

          <FormInput
            label="Phòng ban"
            name="department"
            value={form.department}
            readOnly
            disabled
          />

          <FormInput
            label="Chức vụ"
            name="position"
            value={form.position}
            readOnly
            disabled
          />
        </div>
      </div>

      <FormActions
        mode={mode}
        isDirty={isDirty}
        onCancel={onCancel}
        submitLabel={mode === "create" ? "Tạo tài khoản" : "Cập nhật"}
      />
    </form>
  );
}