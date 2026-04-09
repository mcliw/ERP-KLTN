TÀI LIỆU: ĐIỀU KIỆN ÁP DỤNG VOUCHER & MÃ GIẢM GIÁ
MÃ TÀI LIỆU: CRM-VOUCHER-DETAIL-01

CHƯƠNG 1: CÁC LỖI THƯỜNG GẶP KHI ÁP DỤNG VOUCHER

Khi hệ thống báo lỗi "Voucher không hợp lệ", nguyên nhân thường rơi vào các trường hợp sau (tham chiếu logic `kiem_tra_voucher_hop_le`):

 Điều 1. Lỗi về Thời gian (`valid_from` - `valid_to`)
- Chưa đến giờ: Voucher chỉ có hiệu lực từ đúng khung giờ quy định (ví dụ: 00:00 ngày 11/11).
- Đã hết hạn: Voucher đã qua ngày kết thúc.
- Lưu ý: Thời gian hệ thống tính theo múi giờ GMT+7 (Asia/Bangkok).

 Điều 2. Lỗi về Số lượng (`usage_limit` vs `used_count`)
- Mỗi mã voucher có số lượng phát hành giới hạn (ví dụ: chỉ có 100 mã).
- Cơ chế "First come, first served": Ai thanh toán trước được hưởng trước. Việc lưu mã vào ví chưa đảm bảo sẽ dùng được nếu người khác đã dùng hết lượt.

 Điều 3. Lỗi về Đơn hàng tối thiểu (`min_order_amount`)
- Tổng giá trị đơn hàng (sau khi trừ khuyến mãi trực tiếp, trước khi cộng phí ship) phải lớn hơn mức sàn.
- Ví dụ: Voucher giảm 50k cho đơn từ 500k. Nếu đơn hàng là 499k -> Không áp dụng được.

 Điều 4. Lỗi về Đối tượng khách hàng
1. Voucher khách mới (`is_new_customer`):
   - Chỉ áp dụng cho tài khoản chưa từng có đơn hàng thành công nào trong lịch sử.
   - Nếu đã từng mua và hủy đơn, vẫn có thể được tính là khách mới (tùy cấu hình).
2. Voucher riêng tư (Target User):
   - Một số mã chỉ được gán cho user_id cụ thể (quà sinh nhật, đền bù khiếu nại). Người khác nhập mã này sẽ báo lỗi "Không thuộc đối tượng áp dụng".

## CHƯƠNG 2: QUY TẮC CỘNG GỘP (STACKING RULES)
- Nguyên tắc: Mỗi đơn hàng chỉ được áp dụng 01 Voucher giảm giá (Trừ khi có quy định khác như được dùng kèm Voucher FreeShip).
- Hệ thống sẽ tự động gợi ý voucher có mức giảm tốt nhất (Best Voucher) thông qua tool `goi_y_voucher_tot_nhat`.