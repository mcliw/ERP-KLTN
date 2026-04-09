TÀI LIỆU: CHÍNH SÁCH GIÁ & CHIẾT KHẤU (PRICING & DISCOUNT POLICY)
MÃ TÀI LIỆU: CRM-PRICE-01
NGÀY HIỆU LỰC: 01/01/2026

---

 CHƯƠNG 1: QUY ĐỊNH VỀ GIÁ BÁN (PRICING RULES)

 Điều 1. Giá niêm yết (Original Price)
1. Định nghĩa: Là giá bán lẻ đề xuất chưa bao gồm chiết khấu, được thiết lập trên từng biến thể sản phẩm (`ProductVariant.original_price`).
2. Nguyên tắc: Giá niêm yết đã bao gồm thuế GTGT (VAT) trừ khi có ghi chú khác.

 Điều 2. Giá khuyến mãi trực tiếp (Direct Discount)
Hệ thống hỗ trợ thiết lập giảm giá trực tiếp trên sản phẩm. Quy tắc tính giá cuối cùng (`final_price`) được thực hiện theo thứ tự ưu tiên sau (tham chiếu logic `calc_variant_final_price`):

1. Ưu tiên 1 - Giảm theo số tiền (`discount_amount`):
   - Nếu sản phẩm được cài đặt giảm một số tiền cố định (VD: Giảm 50.000đ).
   - Công thức: `Final Price = Original Price - Discount Amount`.
   - Lưu ý: Giá sau giảm không được thấp hơn 0.

2. Ưu tiên 2 - Giảm theo phần trăm (`discount_percent`):
   - Chỉ áp dụng khi KHÔNG có giảm theo số tiền.
   - Công thức: `Final Price = Original Price  (1 - Discount Percent / 100)`.

---

 CHƯƠNG 2: CHÍNH SÁCH VOUCHER & MÃ GIẢM GIÁ

 Điều 3. Phân loại Voucher
Hệ thống CRM hỗ trợ 2 loại voucher chính (tham chiếu `voucher_compute_discount`):

1. Voucher theo Tiền (Fixed Amount):
   - Giảm một số tiền cố định trực tiếp vào tổng đơn hàng.
   - Ví dụ: Voucher 50K cho đơn từ 200K.

2. Voucher theo Phần trăm (Percentage):
   - Giảm % trên tổng giá trị đơn hàng.
   - Mức giảm tối đa (Max Cap / `max_discount_amount`): Để kiểm soát rủi ro, voucher phần trăm thường đi kèm mức trần.
   - Ví dụ: Giảm 10% tối đa 50.000 VNĐ. Nếu khách mua 1.000.000đ (10% là 100k) thì cũng chỉ được giảm 50.000đ.

 Điều 4. Điều kiện áp dụng Voucher (Constraints)
Một Voucher được coi là hợp lệ (Valid) khi thỏa mãn tất cả các điều kiện sau (kiểm tra bởi tool `kiem_tra_voucher_hop_le`):

1. Thời hạn: Ngày sử dụng nằm trong khoảng `valid_from` và `valid_to`.
2. Số lượng: Số lần đã sử dụng (`used_count`) phải nhỏ hơn giới hạn phát hành (`usage_limit`).
3. Giá trị đơn hàng tối thiểu (`min_order_amount`): Tổng tiền hàng phải lớn hơn hoặc bằng mức sàn quy định.
4. Đối tượng khách hàng:
   - Khách hàng mới (`is_new_customer`): Một số voucher chỉ dành cho khách chưa từng có đơn hàng nào trên hệ thống.
   - Khách hàng thân thiết: Dành cho nhóm khách hàng cụ thể (kiểm tra theo `target_user_id`).

---

CHƯƠNG 3: CHÍNH SÁCH CÔNG NỢ & THANH TOÁN (PAYMENT TERMS)

 Điều 5. Phân loại khách hàng & Hạn mức
1. Khách lẻ (B2C):
   - Yêu cầu thanh toán 100% khi đặt hàng hoặc COD.
   - Không áp dụng công nợ.

2. Đại lý / Doanh nghiệp (B2B):
   - Hạn mức công nợ (Credit Limit): Được cấp hạn mức dựa trên lịch sử tín dụng (ví dụ: 50.000.000 VNĐ).
   - Thời hạn thanh toán (Payment Term): Net 30 (Thanh toán trong vòng 30 ngày kể từ ngày xuất hóa đơn).
   - Nếu vượt quá hạn mức hoặc quá hạn thanh toán (`ar_qua_han`), hệ thống sẽ chặn không cho tạo đơn hàng mới.

 Điều 6. Quy trình xử lý nợ quá hạn
1. Quá hạn 1-7 ngày: Nhắc nhở qua Email/SMS.
2. Quá hạn 8-30 ngày: Nhân viên Sale gọi điện nhắc nợ, tạm dừng cấp hàng.
3. Quá hạn > 30 ngày: Chuyển bộ phận pháp lý, tính vào nợ xấu và đưa vào Blacklist.