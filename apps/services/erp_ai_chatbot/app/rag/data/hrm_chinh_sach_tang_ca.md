 TÀI LIỆU: CHÍNH SÁCH TĂNG CA & LÀM THÊM GIỜ (OVERTIME POLICY)
 MÃ TÀI LIỆU: HRM-OT-01
 NGÀY HIỆU LỰC: 01/01/2026

---

 CHƯƠNG 1: QUY ĐỊNH CHUNG

 Điều 1. Định nghĩa Tăng ca (Overtime - OT)
Tăng ca là khoảng thời gian nhân viên làm việc ngoài giờ làm việc tiêu chuẩn theo yêu cầu của công việc.
- OT Ngày thường: Làm thêm sau 18:00 các ngày từ Thứ 2 đến Thứ 6.
- OT Cuối tuần: Làm thêm vào Thứ 7 hoặc Chủ nhật.
- OT Ngày Lễ: Làm thêm vào các ngày Lễ, Tết được hưởng nguyên lương theo quy định Nhà nước.

 Điều 2. Điều kiện ghi nhận Tăng ca
Hệ thống ERP chỉ ghi nhận và tính lương tăng ca khi thỏa mãn ĐỒNG THỜI 3 điều kiện sau:
1. Có phát sinh công việc thực tế cần giải quyết gấp.
2. Có Đơn đăng ký tăng ca (OT Request) trên hệ thống được Quản lý trực tiếp phê duyệt (`status = 'APPROVED'`).
3. Có dữ liệu Check-in/Check-out thực tế trùng khớp với thời gian đăng ký.
   (Ví dụ: Đăng ký OT 18:00-20:00 nhưng Check-out lúc 18:30 -> Chỉ tính 0.5 giờ).

---

 CHƯƠNG 2: CÔNG THỨC TÍNH LƯƠNG TĂNG CA

 Điều 3. Hệ số làm thêm giờ
Lương làm thêm giờ = (Lương thực tế theo giờ) x (Số giờ OT) x (Hệ số).

1. Ngày làm việc bình thường (Weekdays):
   - Khung giờ: 18:00 - 22:00
   - Hệ số: 150% (1.5)
   - Diễn giải: Nhân viên nhận 1.5 lần mức lương giờ tiêu chuẩn.

2. Ngày nghỉ hàng tuần (Weekends):
   - Áp dụng: Thứ 7, Chủ nhật.
   - Hệ số: 200% (2.0)
   - Diễn giải: Nhân viên nhận gấp đôi mức lương giờ tiêu chuẩn.

3. Ngày Lễ, Tết (Public Holidays):
   - Áp dụng: Các ngày nghỉ lễ theo lịch Nhà nước (Tết Dương lịch, Tết Âm lịch, 30/4, 1/5...).
   - Hệ số: 300% (3.0)
   - Diễn giải: Nhân viên nhận gấp 3 lần mức lương giờ tiêu chuẩn (chưa kể lương ngày lễ được hưởng nguyên lương).

4. Làm đêm (Night Shift OT):
   - Khung giờ: 22:00 - 06:00 sáng hôm sau.
   - Hệ số cộng thêm: +30% so với hệ số của ngày hôm đó (ví dụ: OT đêm ngày thường = 150% + 30% = 180%).

 Điều 4. Giới hạn giờ làm thêm (OT Limits)
Để đảm bảo sức khỏe nhân viên và tuân thủ Luật Lao động, hệ thống sẽ cảnh báo nếu vượt quá giới hạn:
1. Theo ngày: Không quá 4 giờ/ngày.
2. Theo tháng: Không quá 40 giờ/tháng.
3. Theo năm: Không quá 200 giờ/năm (trừ một số ngành nghề đặc thù được cấp phép lên 300 giờ).

---

 CHƯƠNG 3: THANH TOÁN
- Giờ OT đã duyệt sẽ được tổng hợp vào ngày cuối cùng của tháng (tham chiếu tool `tong_hop_tang_ca_thang`).
- Tiền lương OT được chi trả cùng với kỳ lương hàng tháng (vào ngày 05 tháng sau).