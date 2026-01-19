 TÀI LIỆU: QUY TRÌNH TẠM ỨNG & HOÀN ỨNG (ADVANCE & REIMBURSEMENT)
 MÃ TÀI LIỆU: FIN-ADVANCE-01

---

 CHƯƠNG 1: TẠM ỨNG (CASH ADVANCE)

 Điều 1. Điều kiện tạm ứng
1. Chỉ tạm ứng cho các công việc đã được phê duyệt kế hoạch.
2. Nhân viên phải thanh toán dứt điểm các khoản tạm ứng cũ trước khi đề xuất khoản mới (Quy tắc "Không gối đầu").

 Điều 2. Quy trình nhận tiền
1. Tạo phiếu "Đề nghị tạm ứng" trên ERP.
2. Sau khi được duyệt, Kế toán thanh toán lập phiếu chi (`CashTransaction` loại `PAYMENT`).
3. Nhân viên nhận tiền mặt hoặc chuyển khoản và ký nhận.

---

 CHƯƠNG 2: HOÀN ỨNG (REIMBURSEMENT / SETTLEMENT)

 Điều 3. Thời hạn hoàn ứng
- Chậm nhất 05 ngày làm việc sau khi kết thúc chuyến công tác hoặc hoàn thành công việc mua sắm.
- Nếu quá hạn, Kế toán sẽ trừ trực tiếp vào lương tháng gần nhất.

 Điều 4. Xử lý chênh lệch
Khi làm thủ tục quyết toán:
1. Trường hợp Chi > Tạm ứng:
   - Công ty chi trả thêm phần chênh lệch cho nhân viên.
   - Tạo phiếu chi (`PAYMENT`) với lý do "Chi hoàn ứng bổ sung".
2. Trường hợp Chi < Tạm ứng:
   - Nhân viên phải nộp lại tiền thừa về quỹ.
   - Kế toán lập phiếu thu (`CashTransaction` loại `RECEIPT`) với lý do "Thu hồi tạm ứng thừa".