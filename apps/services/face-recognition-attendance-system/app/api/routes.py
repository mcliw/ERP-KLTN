from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, time as time_obj, timedelta
import numpy as np
import cv2
import os 

# Import các module nội bộ
from app.database import get_db
from app.models import Employee, Attendance, Department
from app.services.face_processing import AIModel
from app.services.chroma_service import ChromaService

router = APIRouter()

ai_engine = AIModel()
chroma_service = ChromaService()

# ==========================================
# 0. HÀM LOGIC: TÍNH TOÁN TRẠNG THÁI 1 CA
# ==========================================
def determine_single_shift_status(check_time, last_log_today):
    """
    Logic chấm công 1 ca (08:00 - 17:00):
    - Nếu chưa có dữ liệu hôm nay -> Là CHECK-IN (Tính đi muộn).
    - Nếu đã có dữ liệu -> Là CHECK-OUT (Tính về sớm).
    """
    current_time = check_time.time()
    
    # Cấu hình giờ làm việc
    START_WORK = time_obj(8, 0)
    LATE_LIMIT = time_obj(8, 15) # Cho phép muộn 15p
    END_WORK = time_obj(17, 0)

    # --- TRƯỜNG HỢP 1: CHECK-IN (Lần đầu tiên trong ngày) ---
    if not last_log_today:
        if current_time <= LATE_LIMIT:
            return "Vao Dung Gio"
        else:
            return "Vao Muon"

    # --- TRƯỜNG HỢP 2: CHECK-OUT (Các lần sau) ---
    else:
        # Nếu chưa đến giờ về (17h) -> Về sớm
        if current_time < END_WORK:
            return "Ra Ve Som"
        else:
            return "Ra Dung Gio"

# ==========================================
# 1. API ĐĂNG KÝ (CÓ LƯU ẢNH LÀM DATASET)
# ==========================================
@router.post("/register/")
async def register_employee(
    id: int = Form(...),   
    name: str = Form(...),
    department_id: int = Form(None),
    position: str = Form(None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra xem ID này đã có chưa
    existing_emp = db.query(Employee).filter(Employee.id == id).first()
    if existing_emp:
        raise HTTPException(status_code=400, detail=f"Lỗi: ID nhân viên {id} đã tồn tại! Vui lòng chọn số khác.")

    # 2. Tạo nhân viên với ID do người dùng nhập
    new_emp = Employee(
        id=id,  
        name=name, 
        department_id=department_id, 
        position=position
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
    # 3. Tạo thư mục lưu ảnh (Dataset)
    folder_name = f"{new_emp.id}_{name.replace(' ', '_')}"
    save_path = os.path.join("dataset", folder_name)
    
    if not os.path.exists(save_path):
        os.makedirs(save_path)
    
    valid_embeddings = 0
    
    for i, file in enumerate(files):
        file_bytes = await file.read()
        file_location = os.path.join(save_path, f"face_{i}.jpg")
        with open(file_location, "wb") as f:
            f.write(file_bytes)
            
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        embedding = ai_engine.get_face_embedding(img)
        
        if embedding is not None:
            chroma_service.add_data(user_id=new_emp.id, embedding=embedding)
            valid_embeddings += 1
            
    if valid_embeddings == 0:
        db.delete(new_emp)
        db.commit()
        try: os.rmdir(save_path)
        except: pass
        raise HTTPException(status_code=400, detail="Không lấy mẫu được khuôn mặt nào!")

    # Train lại model
    X, y = chroma_service.get_training_data()
    if len(np.unique(y)) > 1:
        ai_engine.train_svm(X, y)

    return {
        "status": "success", 
        "message": f"Đã đăng ký thành công nhân viên ID: {new_emp.id}", 
        "employee_id": new_emp.id
    }
# ==========================================
# 2. API CHẤM CÔNG (CHECK-IN)
# ==========================================
@router.post("/checkin/")
async def check_in(
    file: UploadFile = File(...),
    device_id: str = Form("CAM_01"),
    db: Session = Depends(get_db)
):
    # 1. Xử lý ảnh
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Lấy Vector
    embedding = ai_engine.get_face_embedding(img)
    if embedding is None:
        return {"status": "fail", "message": "Không thấy mặt"}
    
    # 3. Tìm ID trong ChromaDB
    user_id, distance = chroma_service.query_nearest(embedding)
    
    if user_id is None or distance > 0.7:
        return {"status": "unknown", "message": "Người lạ", "confidence": float(1 - distance)}
    
    # 4. Lấy thông tin nhân viên
    employee = db.query(Employee).filter(Employee.id == user_id).first()
    if not employee:
        return {"status": "error", "message": f"Lỗi: Tìm thấy ID {user_id} nhưng không có hồ sơ!"}

    # 5. Logic chấm công
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Lấy log đầu tiên và cuối cùng trong ngày
    first_log = db.query(Attendance).filter(
        Attendance.employee_id == user_id,
        Attendance.check_time >= today_start
    ).order_by(Attendance.check_time.asc()).first()

    last_log_check = db.query(Attendance).filter(
        Attendance.employee_id == user_id,
        Attendance.check_time >= today_start
    ).order_by(Attendance.check_time.desc()).first()

    # --- [FIX QUAN TRỌNG] CHẶN SPAM 60s ---
    if last_log_check:
        # Lấy giờ từ DB và xóa thông tin múi giờ (tzinfo) để khớp với 'now'
        db_time = last_log_check.check_time
        if db_time.tzinfo is not None:
            db_time = db_time.replace(tzinfo=None)

        # Bây giờ mới thực hiện phép trừ
        if (now - db_time).total_seconds() < 60:
             msg = f"[ID:{employee.id}] {employee.name} - Da Cham Cong ({last_log_check.status})"
             return {
                 "status": "success", 
                 "message": msg,
                 "employee_id": employee.id,
                 "confidence": float(1 - distance)
             }

    # Quyết định trạng thái
    if not first_log:
        status = determine_single_shift_status(now, None)
    else:
        status = determine_single_shift_status(now, first_log)

    # 6. Lưu DB
    new_checkin = Attendance(
        employee_id=employee.id,
        check_time=now,
        status=status,
        device_id=device_id
    )
    db.add(new_checkin)
    db.commit()
    
    final_message = f"[ID:{employee.id}] {employee.name} - {status}"

    return {
        "status": "success",
        "message": final_message,
        "employee_id": employee.id,
        "department": employee.department.name if employee.department else "N/A",
        "confidence": float(1 - distance)
    }

# ==========================================
# 3. API KHÁC
# ==========================================
# ==========================================
# API TẠO PHÒNG BAN (BẮT BUỘC NHẬP ID)
# ==========================================
@router.post("/departments/")
def create_department(
    id: int = Form(...),
    name: str = Form(...), 
    db: Session = Depends(get_db)
):
    # 1. Kiểm tra xem ID này đã tồn tại chưa
    existing_dept = db.query(Department).filter(Department.id == id).first()
    if existing_dept:
        raise HTTPException(status_code=400, detail=f"Lỗi: ID Phòng ban {id} đã tồn tại! Vui lòng chọn số khác.")

    # 2. Tạo phòng ban với ID do Admin nhập
    dept = Department(id=id, name=name)

    try:
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return {
            "status": "success", 
            "message": f"Tạo thành công: {dept.name}", 
            "id": dept.id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi Database: {str(e)}")


# ==========================================
# 4. API QUẢN TRỊ HỆ THỐNG
# ==========================================
@router.post("/system/retrain")
def retrain_system_data(db: Session = Depends(get_db)):
    """
    API này thay thế file fix_model.py.
    Dùng để quét lại toàn bộ thư mục 'dataset', nạp vào ChromaDB và train lại Model.
    """
    try:
        success, message = ai_engine.sync_and_retrain(chroma_service)
        if success:
            return {"status": "success", "message": message}
        else:
            raise HTTPException(status_code=400, detail=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 5. API CHO FRONTEND (LẤY DỮ LIỆU)
# ==========================================

# Lấy danh sách nhân viên
@router.get("/employees/")
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(Employee).all()
    return [{"id": e.id, "name": e.name, "department": e.department.name if e.department else "N/A"} for e in employees]

# Lấy lịch sử chấm công
@router.get("/attendance/")
def get_attendance_logs(db: Session = Depends(get_db)):
    logs = db.query(Attendance).order_by(Attendance.check_time.desc()).all()
    
    return [{
        "log_id": log.id, 
        "employee_id": log.employee_id,
        "name": log.employee.name,
        "dept": log.employee.department.name if log.employee.department else "N/A",
        "time": log.check_time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": log.status,
        "device": log.device_id
    } for log in logs]

# Lấy thống kê
@router.get("/stats/")
def get_stats(db: Session = Depends(get_db)):
    # 1. Đếm tổng nhân viên
    total_emp = db.query(Employee).count()
    
    # 2. Đếm tổng phòng ban
    total_dept = db.query(Department).count()
    
    # 3. Đếm số lượt Check-in hôm nay
    today_query = db.query(Attendance).filter(
        Attendance.check_time >= datetime.now().date()
    )
    today_checkin_count = today_query.count()

    # 4. [THÊM MỚI] Lấy danh sách các ID nhân viên đã đi làm hôm nay
    # query(Attendance.employee_id) -> Chỉ lấy cột ID
    # distinct() -> Loại bỏ trùng lặp (nếu chấm 2 lần thì chỉ lấy 1 ID)
    present_records = db.query(Attendance.employee_id).filter(
        Attendance.check_time >= datetime.now().date()
    ).distinct().all()

    list_ids = [row[0] for row in present_records]

    return {
        "employees": total_emp, 
        "departments": total_dept, 
        "today": today_checkin_count,
        "present_ids": list_ids
    }