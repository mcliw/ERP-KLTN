 PHỤ LỤC 1: QUY ĐỊNH CHI TIẾT VỀ CA LÀM VIỆC & NGUYÊN TẮC TÍNH CÔNG

 Điều 1. Danh mục Ca làm việc (Work Shifts)
Hệ thống ERP ghi nhận các ca làm việc tiêu chuẩn sau đây (tham chiếu `WorkShift`):

1. Ca Hành chính (Standard Shift - HC):
   - Giờ bắt đầu (`start_time`): 08:30
   - Giờ kết thúc (`end_time`): 17:30
   - Giờ nghỉ trưa (`break_time`): 12:00 - 13:00
   - Áp dụng cho: Khối văn phòng, Kế toán, Nhân sự, Sales Admin.

2. Ca Sáng (Morning Shift - S1):
   - Giờ bắt đầu: 06:00
   - Giờ kết thúc: 14:00
   - Áp dụng cho: Nhân viên kho, Bảo vệ.

3. Ca Chiều (Afternoon Shift - S2):
   - Giờ bắt đầu: 14:00
   - Giờ kết thúc: 22:00
   - Áp dụng cho: Nhân viên kho, Bảo vệ.

(Lưu ý: Nhân viên cần xem lịch phân ca trên hệ thống để biết mình thuộc ca nào trong ngày).

 Điều 2. Nguyên tắc ghi nhận dữ liệu chấm công (Timesheet Logic)

 2.1. Dữ liệu gốc (Attendance Logs)
- Hệ thống ghi nhận tất cả các lần Check-in/Check-out từ máy chấm công hoặc FaceID.
- Nếu trong ngày có nhiều lần check, hệ thống sẽ lấy:
  - Giờ vào (Check-in): Lần ghi nhận sớm nhất trong khoảng cho phép của ca.
  - Giờ ra (Check-out): Lần ghi nhận muộn nhất trong khoảng cho phép của ca.

 2.2. Trạng thái ngày công (Timesheet Status)
Trạng thái ngày công (`status`) trong bảng `TimesheetDaily` được xác định như sau:
- PRESENT: Có dữ liệu Check-in VÀ Check-out hợp lệ.
- ABSENT: Không có dữ liệu chấm công và không có đơn xin nghỉ phép được duyệt.
- LEAVE: Có đơn xin nghỉ phép (`LeaveRequest`) trạng thái `APPROVED` bao phủ ngày đó.
- HOLIDAY: Ngày lễ theo quy định nhà nước.

 Điều 3. Công thức tính công & Phạt (Calculation Rules)

 3.1. Tính số công (Working Day Count)
Số công (`working_day_count`) được tính dựa trên tổng giờ làm việc thực tế (Actual Working Hours):
- Dưới 4 giờ: Tính 0 công.
- Từ 4 giờ đến dưới 7 giờ: Tính 0.5 công.
- Từ 7 giờ trở lên: Tính 1.0 công.
(Thời gian làm việc thực tế = Thời gian Check-out - Thời gian Check-in - Thời gian nghỉ trưa).

 3.2. Tính phút đi muộn (Late Minutes)
- Công thức: `Late = Max(0, Thực tế Check-in - (Giờ bắt đầu ca + 5 phút ân hạn))`
- Ví dụ (Ca HC 08:30):
  - Check-in 08:32 -> Muộn 0 phút (trong vùng an toàn).
  - Check-in 08:36 -> Muộn 6 phút (tính từ mốc 08:30).

 3.3. Tính phút về sớm (Early Leave Minutes)
- Công thức: `Early = Max(0, Giờ kết thúc ca - Thực tế Check-out)`
- Ví dụ (Ca HC 17:30):
  - Check-out 17:29 -> Về sớm 1 phút.
  - Check-out 17:31 -> Về sớm 0 phút.

 Điều 4. Xử lý sự cố chấm công (Missing Checkout Handling)

 4.1. Các trường hợp thường gặp
- Quên Check-out khi ra về.
- Máy chấm công lỗi, không nhận diện được khuôn mặt.
- Đi công tác hoặc ra ngoài gặp khách hàng (không thể check tại văn phòng).

 4.2. Quy trình giải trình (Explanation Process)
1. Bước 1: Nhân viên kiểm tra dữ liệu trên tool `ngay_thieu_checkout` để xác định các ngày bị lỗi (thường hiển thị trạng thái PRESENT nhưng thiếu `check_out_time`).
2. Bước 2: Gửi "Yêu cầu giải trình chấm công" (Explanation Request) trên hệ thống, kèm lý do và bằng chứng (nếu có, ví dụ email xác nhận gặp khách hàng).
3. Bước 3: Quản lý trực tiếp phê duyệt.
4. Bước 4: Sau khi duyệt, hệ thống HR sẽ cập nhật lại giờ Check-out thủ công và tính lại công cho ngày đó.
   - Lưu ý: Giải trình phải được gửi trong vòng 48h kể từ ngày xảy ra sự cố. Quá hạn sẽ không được chấp nhận và tính là không công (trừ trường hợp bất khả kháng).