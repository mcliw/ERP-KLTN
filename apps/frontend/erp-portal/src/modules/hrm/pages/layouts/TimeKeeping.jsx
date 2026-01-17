// apps/frontend/erp-portal/src/modules/hrm/pages/layouts/TimeKeeping.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useCallback } from "react";
import { FaCamera, FaPlus, FaRecycle } from "react-icons/fa"; // Import icons

// Components
import TimeKeepingTable from "../../components/layouts/TimeKeepingTable";
import TimeKeepingFilter from "../../components/layouts/TimeKeepingFilter";
// import PageHeader from "../../../../shared/components/PageHeader";
import CameraModal from "../../../../shared/components/CameraModal";

// Services & Hooks
import { timeKeepingService } from "../../services/timeKeeping.service";
import { departmentService } from "../../services/department.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import { useAuthStore } from "../../../../auth/auth.store";
import { useToast } from "../../../../shared/components/ToastProvider";

// Utils & Constants
import { HRM_PERMISSIONS } from "../../../../shared/permissions/hrm.permissions";
import { hasPermission } from "../../../../shared/utils/permission";
import { isSoftDeleted } from "../../../../shared/utils/softDelete";

// Styles
import "../styles/document.css";
import "../../../../shared/styles/button.css";

/* =========================
 * Helpers
 * ========================= */
const normalizeText = (v) => String(v || "").trim().toLowerCase();

export default function TimeKeeping() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Auth & Permission
  const user = useAuthStore((s) => s.user);
  const canEdit = hasPermission(user?.role, HRM_PERMISSIONS.TIMEKEPPING || "TIMEKEEPING_EDIT");

  // State bật/tắt Camera
  const [showCamera, setShowCamera] = useState(false);

  // 2. Data Fetching
  const { 
    data: timeKeepings, 
    loading: loadingTimeKeeping, 
    refresh 
  } = useAsyncData(timeKeepingService.getAll);

  const { data: departments } = useAsyncData(() => 
    departmentService.getAll({ includeDeleted: false })
  );

  // 3. Filter State
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // 4. Options cho Filter
  const statusOptions = useMemo(
    () => [
      { value: "Đúng giờ", label: "Đúng giờ" },
      { value: "Đi muộn", label: "Đi muộn" },
      { value: "Về sớm", label: "Về sớm" },
      { value: "Nghỉ phép", label: "Nghỉ phép" },
      { value: "Vắng mặt", label: "Vắng mặt" },
    ],
    []
  );

  const departmentOptions = useMemo(() => {
    return (departments || []).map((d) => ({
      value: d.code,
      label: d.name,
    }));
  }, [departments]);

  // 5. Client-side Filtering Logic
  const filteredData = useMemo(() => {
    const kw = normalizeText(keyword);

    return (timeKeepings || []).filter((item) => {
      const matchKeyword =
        !kw ||
        normalizeText(item.employeeName).includes(kw) ||
        normalizeText(item.employeeCode).includes(kw);

      const matchStatus = 
        !isSoftDeleted(item.deletedAt) && 
        (!status || item.status === status);

      const matchDate = !date || item.date === date;

      const matchDepartment = !departmentId || 
        (item.departmentName && departments?.find(d => d.code === departmentId)?.name === item.departmentName);

      return matchKeyword && matchStatus && matchDate && matchDepartment;
    });
  }, [timeKeepings, keyword, status, date, departmentId, departments]);

  // 6. Pagination
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredData, 10);

  // 7. Handlers
  const handleClearFilter = useCallback(() => {
    setKeyword("");
    setStatus("");
    setDate("");
    setDepartmentId("");
  }, []);

  const handleDelete = useCallback(
    async (record) => {
      if (record.isLocked) {
        toast.info("Không thể xoá bản ghi đã chốt công.");
        return;
      }
      if (!window.confirm(`Xoá chấm công của ${record.employeeName} ngày ${record.date}?`)) 
        return;

      try {
        await timeKeepingService.remove(record.id);
        toast.success("Đã xoá bản ghi chấm công");
        refresh();
      } catch (err) {
        toast.error(err?.message || "Lỗi khi xoá");
      }
    },
    [refresh, toast]
  );

  // === XỬ LÝ CHỤP ẢNH TỪ CAMERA ===
  const handleCameraCapture = async (imageData) => {
    try {
      // Logic giả lập: Nhận diện khuôn mặt -> Ra ID nhân viên
      // Ở đây ta fix cứng ID nhân viên đầu tiên để test
      const demoEmployeeId = "emp001"; // ID của Nguyễn Văn An
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

      const newCheckIn = {
        employeeId: demoEmployeeId,
        date: today,
        checkInTime: currentTime,
        checkOutTime: "", 
        status: "Đúng giờ",
        note: "Check-in bằng Camera (FaceID)",
        evidenceImage: imageData, // Ảnh base64
      };

      await timeKeepingService.create(newCheckIn);
      toast.success("Chấm công bằng Camera thành công!");
      refresh();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Lỗi khi chấm công");
    }
  };

  if (loadingTimeKeeping) return <div style={{ padding: 20 }}>Đang tải dữ liệu chấm công...</div>;

  return (
    <div className="main-document">
      {/* CUSTOM PAGE HEADER ĐỂ THÊM NÚT CAMERA */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
           <h2 className="mb-0 fw-bold" style={{ fontSize: '1.5rem'}}>Quản lý chấm công</h2>
        </div>
        
        <div className="d-flex gap-2" style={{display: 'inline-flex', alignItems: 'center', gap: '20px', marginBottom: '10px'}}>
            {/* Nút Check-in Camera */}
            <button 
                className="btn d-flex align-items-center gap-2 text-white" 
                style={{ backgroundColor: "#db8700", border: "none", color: "#fff" }} // Màu cam
                onClick={() => setShowCamera(true)}
            >
                <FaCamera /> Face Check-in
            </button>

            {/* Nút Thêm thủ công */}
            {canEdit && (
                <button 
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={() => navigate("/hrm/cham-cong/them-moi")}
                >
                    <FaPlus /> <span>Thêm công</span>
                </button>
            )}
            
            {/* Nút Khôi phục */}
            {canEdit && (
                <button 
                    className="btn btn-restore" 
                    onClick={() => navigate("/hrm/cham-cong/khoi-phuc")}
                    title="Khôi phục dữ liệu đã xóa"
                >
                    <FaRecycle /> <span>Khôi phục</span>
                </button>
            )}
        </div>
      </div>

      <TimeKeepingFilter
        keyword={keyword}
        status={status}
        date={date}
        departmentId={departmentId}
        
        statusOptions={statusOptions}
        departmentOptions={departmentOptions}
        
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
        onDateChange={setDate}
        onDepartmentChange={setDepartmentId}
        onClear={handleClearFilter}
      />

      <TimeKeepingTable
        data={paginatedData}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        onRowClick={(d) => navigate(`/hrm/cham-cong/${d.id}`)}
        onView={(d) => navigate(`/hrm/cham-cong/${d.id}`)}
        onEdit={canEdit ? (d) => navigate(`/hrm/cham-cong/${d.id}/chinh-sua`) : undefined}
        onDelete={canEdit ? handleDelete : undefined}
      />

      {/* MODAL CAMERA */}
      {showCamera && (
        <CameraModal 
            onClose={() => setShowCamera(false)} 
            onCapture={handleCameraCapture} 
        />
      )}
    </div>
  );
}