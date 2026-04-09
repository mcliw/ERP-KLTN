import pandas as pd
from sqlalchemy import create_engine
from app.database import DATABASE_URL
from datetime import datetime, time, timedelta

def calculate_work_hours(row):
    """
    Hàm tính toán công thực tế:
    Công = 8h - (Phút Đi Muộn) - (Phút Về Sớm)
    """
    # Mốc chuẩn
    START_WORK = datetime.combine(row['Date'], time(8, 0))
    END_WORK = datetime.combine(row['Date'], time(17, 0))
    STANDARD_HOURS = 8.0
    
    in_time = row['CheckIn']
    out_time = row['CheckOut']

    if pd.isnull(in_time) or pd.isnull(out_time):
        return 0.0, "Thiếu Check-in/out"

    # 1. TÍNH ĐI MUỘN (Late)
    # Nếu đến sau 8:00 thì tính là muộn (Bỏ qua 15p ân hạn khi tính công, hoặc tùy bạn)
    # Ở đây tôi tính chặt: Cứ sau 8:00 là trừ thời gian thực
    late_minutes = 0
    if in_time > START_WORK:
        late_minutes = (in_time - START_WORK).total_seconds() / 60

    # 2. TÍNH VỀ SỚM (Early)
    early_minutes = 0
    if out_time < END_WORK:
        early_minutes = (END_WORK - out_time).total_seconds() / 60

    # 3. TỔNG KẾT
    # Đổi phút ra giờ
    lost_hours = (late_minutes + early_minutes) / 60
    
    # Công thực tế
    actual_work = STANDARD_HOURS - lost_hours
    
    # Làm tròn 2 số thập phân
    return max(0, round(actual_work, 2)), f"Muộn {int(late_minutes)}p, Sớm {int(early_minutes)}p"

def export_salary_report():
    print("📊 ĐANG TÍNH TOÁN CÔNG THEO QUY TẮC 8 TIẾNG...")
    
    engine = create_engine(DATABASE_URL)
    
    # Lấy dữ liệu thô
    query = """
    SELECT 
        e.id as "ID",
        e.name as "Ten",
        d.name as "PhongBan",
        a.check_time
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY a.check_time ASC
    """
    
    df = pd.read_sql(query, engine)
    
    if df.empty:
        print("⚠️ Chưa có dữ liệu!")
        return

    # Xử lý dữ liệu: Gom nhóm theo (Nhân viên + Ngày)
    df['check_time'] = pd.to_datetime(df['check_time'])
    df['Date'] = df['check_time'].dt.date
    
    # Group by để tìm Giờ Vào (Min) và Giờ Ra (Max) trong ngày
    report = df.groupby(['ID', 'Ten', 'PhongBan', 'Date'])['check_time'].agg(['min', 'max']).reset_index()
    report.columns = ['ID', 'Họ Tên', 'Phòng Ban', 'Date', 'CheckIn', 'CheckOut']
    
    # Nếu CheckIn == CheckOut (tức là mới chấm 1 lần), coi như chưa CheckOut
    report.loc[report['CheckIn'] == report['CheckOut'], 'CheckOut'] = pd.NaT

    # Áp dụng công thức tính công
    report[['Công (Giờ)', 'Ghi Chú']] = report.apply(
        lambda row: pd.Series(calculate_work_hours(row)), axis=1
    )
    
    # Xuất Excel
    file_name = "Bang_Cham_Cong_Chuan.xlsx"
    report.to_excel(file_name, index=False)
    print(f"✅ ĐÃ XUẤT BÁO CÁO: {file_name}")
    print("👉 Cột 'Công (Giờ)' đã tự động trừ thời gian Muộn/Sớm của bạn!")

if __name__ == "__main__":
    export_salary_report()