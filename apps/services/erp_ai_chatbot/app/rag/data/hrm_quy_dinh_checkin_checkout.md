 TÀI LIỆU: QUY ĐỊNH CHECK-IN / CHECK-OUT & XỬ LÝ VI PHẠM
 PHÒNG BAN: HUMAN RESOURCES
 ÁP DỤNG: TOÀN BỘ CÁN BỘ NHÂN VIÊN

---

 CHƯƠNG 1: KHUNG GIỜ LÀM VIỆC TIÊU CHUẨN

 Điều 1. Thời gian làm việc (Working Hours)
Toàn thể nhân viên tuân thủ khung giờ làm việc theo ca đã được phân công trên hệ thống ERP.

1. Ca Hành chính (Office Shift):
   - Check-in: Trước 08:30.
   - Check-out: Sau 17:30.
   - Thời gian nghỉ trưa: 12:00 - 13:00 (1 tiếng).
   - Áp dụng: Khối văn phòng, Back-office.

2. Ca Vận hành (Operation Shift - S1/S2):
   - Ca S1: 06:00 - 14:00 (Không nghỉ giữa ca).
   - Ca S2: 14:00 - 22:00 (Không nghỉ giữa ca).
   - Áp dụng: Khối kho vận, bảo vệ, IT trực hệ thống.

 Điều 2. Thời gian Ân hạn (Grace Period)
Công ty áp dụng chính sách ân hạn để hỗ trợ các trường hợp bất khả kháng (tắc đường, thang máy đông):
- Ân hạn đi muộn: 05 phút. (Ví dụ: Ca 08:30, check-in lúc 08:35 vẫn được tính là ĐÚNG GIỜ).
- Ân hạn về sớm: 0 phút. (Không cho phép về sớm, trừ khi có đơn xin phép).

---

 CHƯƠNG 2: QUY TẮC GHI NHẬN DỮ LIỆU (LOGGING RULES)

 Điều 3. Thiết bị chấm công hợp lệ
1. FaceID (Nhận diện khuôn mặt): Đặt tại cửa ra vào chính.
2. Fingerprint (Vân tay): Thiết bị dự phòng.
3. GPS Wifi: Chỉ áp dụng cho nhân viên Sales đi thị trường (phải dùng App công ty và kết nối 4G/Wifi tại điểm khách hàng).

 Điều 4. Logic ghi nhận Giờ vào/Giờ ra
Hệ thống ERP sẽ tự động xử lý dữ liệu thô (`AttendanceLog`) theo nguyên tắc sau:
1. Giờ Check-in (In-Time): Hệ thống lấy lần quét thẻ/khuôn mặt ĐẦU TIÊN trong khung giờ ca làm việc.
2. Giờ Check-out (Out-Time): Hệ thống lấy lần quét thẻ/khuôn mặt CUỐI CÙNG trong ngày.
3. Lưu ý quan trọng: Nếu nhân viên ra ngoài giữa giờ (ví dụ đi gặp khách hàng), không cần Check-out/in giữa giờ, trừ khi về sớm luôn.

---

 CHƯƠNG 3: XỬ LÝ CÁC TRƯỜNG HỢP VI PHẠM & SỰ CỐ

 Điều 5. Đi muộn - Về sớm (Late / Early)
Hệ thống tự động tính phút phạt dựa trên dữ liệu thực tế:
1. Đi muộn (Late):
   - Là trường hợp: `Giờ Check-in > (Giờ vào ca + 5 phút)`.
   - Số phút đi muộn = `Giờ Check-in - Giờ vào ca`.
   - Hệ quả: Bị trừ vào điểm chuyên cần và phạt tiền theo bậc thang (xem Sổ tay nhân viên Chương 2).

2. Về sớm (Early Leave):
   - Là trường hợp: `Giờ Check-out < Giờ ra ca`.
   - Số phút về sớm = `Giờ ra ca - Giờ Check-out`.
   - Hệ quả: Nếu không có đơn xin phép (`LeaveRequest`), thời gian về sớm sẽ bị trừ vào công làm việc.

 Điều 6. Quên chấm công (Missing Check-in/Check-out)
Trường hợp nhân viên đi làm đầy đủ nhưng quên chấm công hoặc máy lỗi:
1. Dấu hiệu nhận biết: Trên bảng công ngày hôm đó hiển thị trạng thái `PRESENT` nhưng cột `Check-out` trống rỗng, hoặc trạng thái `ABSENT` dù có đi làm.
2. Quy trình xử lý (trong vòng 48h):
   - Bước 1: Nhân viên vào module HRM -> Mục "Giải trình chấm công".
   - Bước 2: Chọn ngày bị thiếu, nhập lý do (VD: "Quên check-out", "Máy FaceID không nhận").
   - Bước 3: Tag tên Quản lý trực tiếp để duyệt.
3. Giới hạn: Mỗi nhân viên chỉ được giải trình tối đa 3 lần/tháng. Lần thứ 4 trở đi sẽ không được duyệt và tính là không công.

 Điều 7. Làm thêm giờ (Overtime - OT)
Việc ở lại văn phòng sau giờ làm việc CHỈ được tính là Tăng ca (OT) khi thỏa mãn 2 điều kiện:
1. Có thực hiện Check-out sau giờ quy định.
2. Có Đơn đăng ký tăng ca (OT Request) đã được duyệt trên hệ thống tương ứng với khung giờ đó.

Ví dụ: Ca kết thúc 17:30. Nhân viên Check-out lúc 20:00.
- Nếu CÓ đơn OT (18:00 - 20:00) -> Hệ thống tính 2 giờ OT.
- Nếu KHÔNG có đơn OT -> Hệ thống chỉ ghi nhận giờ ra 20:00 nhưng không tính lương thêm giờ.