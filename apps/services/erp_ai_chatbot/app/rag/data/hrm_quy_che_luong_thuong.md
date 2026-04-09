 TÀI LIỆU: QUY CHẾ LƯƠNG THƯỞNG & PHÚC LỢI
 MÃ TÀI LIỆU: HRM-SALARY-01

---

 CHƯƠNG 1: CẤU TRÚC THU NHẬP (INCOME STRUCTURE)

Tổng thu nhập (Gross Income) của nhân viên bao gồm các thành phần sau:

 Điều 1. Lương cơ bản (Basic Salary)
- Là mức lương thỏa thuận trong Hợp đồng lao động, dùng làm căn cứ đóng Bảo hiểm xã hội (BHXH).
- Được trả dựa trên số ngày công thực tế trong tháng.

 Điều 2. Các khoản Phụ cấp (Allowances)
Theo quy định hiện hành (và dữ liệu hợp đồng trên hệ thống), công ty áp dụng 3 loại phụ cấp cố định:

1. Phụ cấp Trách nhiệm (`allowance_responsibility`):
   - Áp dụng cho cấp Leader/Manager hoặc các vị trí đặc thù.
   - Mức hưởng: Tùy theo bậc chức danh (Level).
   - Tính chất: Chịu thuế TNCN, Tính đóng BHXH (tùy mức).

2. Phụ cấp Đi lại / Xăng xe (`allowance_transport`):
   - Hỗ trợ chi phí đi lại cho nhân viên.
   - Mức hưởng: Cố định hàng tháng (ví dụ 500.000 VNĐ).
   - Tính chất: Chịu thuế TNCN, KHÔNG tính đóng BHXH.

3. Phụ cấp Ăn trưa (`allowance_lunch`):
   - Hỗ trợ bữa trưa.
   - Mức hưởng: Tối đa 730.000 VNĐ/tháng (theo luật thuế hiện hành).
   - Tính chất: MIỄN thuế TNCN, KHÔNG tính đóng BHXH.

---

 CHƯƠNG 2: CÔNG THỨC TÍNH LƯƠNG (GROSS TO NET FORMULA)

Hệ thống tính toán lương thực nhận (Net Salary) theo quy trình 3 bước sau:

 Bước 1: Tính Tổng thu nhập (Total Gross)
> Gross thực tế = (Lương cơ bản + Phụ cấp) / Ngày công chuẩn  Ngày công thực tế + Lương OT + Thưởng (nếu có)

 Bước 2: Tính các khoản khấu trừ (Deductions)

1. Bảo hiểm bắt buộc (Nhân viên đóng 10.5%):
   - BHXH (8%): Tính trên (Lương cơ bản + PC Trách nhiệm).
   - BHYT (1.5%): Tính trên (Lương cơ bản + PC Trách nhiệm).
   - BHTN (1%): Tính trên (Lương cơ bản + PC Trách nhiệm).
   (Lưu ý: Mức lương đóng bảo hiểm tối đa là 20 lần mức lương cơ sở).

2. Thuế Thu nhập cá nhân (PIT):
   - Thu nhập chịu thuế = Tổng Gross - (PC Ăn trưa + PC Điện thoại...).
   - Thu nhập tính thuế = Thu nhập chịu thuế - Các khoản giảm trừ.
     + Giảm trừ gia cảnh bản thân: 11.000.000 VNĐ/tháng.
     + Giảm trừ người phụ thuộc: 4.400.000 VNĐ/người/tháng.
     + Các khoản đóng bảo hiểm (10.5% ở trên).
   - Thuế TNCN = Thu nhập tính thuế  Thuế suất (theo biểu lũy tiến từng phần 5% - 35%).

 Bước 3: Tính Lương thực nhận (Net Salary)
> NET SALARY = Gross thực tế - (Bảo hiểm 10.5% + Thuế TNCN + Các khoản phạt/tạm ứng)

---

 CHƯƠNG 3: KỲ TRẢ LƯƠNG
- Lương được tính từ ngày 01 đến ngày cuối tháng (`PayrollPeriod`).
- Ngày thanh toán: Ngày 05 của tháng kế tiếp.
- Nếu ngày 05 trùng vào Thứ 7/CN, lương sẽ được chuyển khoản vào ngày làm việc trước đó.