 TÀI LIỆU: CẨM NANG HƯỚNG DẪN HẠCH TOÁN (ACCOUNTING MANUAL)
 MÃ TÀI LIỆU: FIN-ACC-MANUAL-01

---

 CHƯƠNG 1: NGHIỆP VỤ MUA HÀNG (PURCHASE CYCLE)

 Nghiệp vụ 1: Mua hàng nhập kho (Standard Inventory Purchase)
Khi hàng về đến kho và nhận được hóa đơn GTGT của nhà cung cấp.

Bút toán 1: Ghi nhận giá trị hàng hóa
- Nợ TK 156 (Hàng hóa): Giá mua chưa thuế.
- Nợ TK 1331 (Thuế GTGT được khấu trừ): Tiền thuế.
- Có TK 331 (Phải trả người bán): Tổng giá thanh toán.
(Áp dụng cho tool `ap_chi_tiet` với loại hóa đơn mua hàng hóa).

 Nghiệp vụ 2: Mua dịch vụ / Tài sản cố định (Service/Asset Purchase)
Khi mua dịch vụ (điện, nước, thuê ngoài) hoặc mua TSCĐ.

Trường hợp 1: Mua dịch vụ dùng ngay (không qua kho)
- Nợ TK 641/642 (Chi phí): Giá chưa thuế (Tùy bộ phận sử dụng).
- Nợ TK 1331: Tiền thuế.
- Có TK 331/111/112: Tổng tiền.

Trường hợp 2: Mua TSCĐ (Xe cộ, Máy móc lớn)
- Nợ TK 211 (Tài sản cố định hữu hình): Nguyên giá.
- Nợ TK 1332 (Thuế GTGT TSCĐ): Thuế VAT.
- Có TK 331/112: Tổng tiền.

 Nghiệp vụ 3: Trả lại hàng mua (Purchase Return)
Khi trả lại hàng lỗi cho nhà cung cấp (`RETURN_TO_VENDOR`).
- Nợ TK 331: Giảm trừ công nợ phải trả.
- Có TK 156: Giảm giá trị hàng trong kho.
- Có TK 1331: Giảm thuế đầu vào tương ứng.

---

 CHƯƠNG 2: NGHIỆP VỤ BÁN HÀNG (SALES CYCLE)

 Nghiệp vụ 4: Bán hàng thương mại (Standard Sales)
Khi xuất kho giao hàng cho khách và xuất hóa đơn. Kế toán phải ghi nhận đồng thời 2 bút toán:

Bút toán 1: Ghi nhận Doanh thu (Revenue)
- Nợ TK 131 (Nếu bán chịu) HOẶC 111/112 (Nếu thu ngay).
- Có TK 5111 (Doanh thu bán hàng hóa): Giá bán chưa thuế.
- Có TK 33311 (Thuế GTGT đầu ra): Thuế VAT.

Bút toán 2: Ghi nhận Giá vốn (Cost of Goods Sold)
- Nợ TK 632 (Giá vốn hàng bán): Giá trị xuất kho của hàng hóa.
- Có TK 156 (Hàng hóa): Giảm trừ kho.
(Hệ thống tự động tính giá vốn theo phương pháp Bình quân gia quyền hoặc FIFO tùy cấu hình).

 Nghiệp vụ 5: Các khoản Giảm trừ Doanh thu
Khi khách hàng trả lại hàng đã mua (Sales Return) hoặc chiết khấu thương mại.
- Nợ TK 521 (Các khoản giảm trừ doanh thu).
- Nợ TK 33311: Giảm thuế đầu ra phải nộp.
- Có TK 131/111/112: Trả lại tiền cho khách hoặc trừ nợ.
Đồng thời nhập lại kho hàng trả lại:
- Nợ TK 156: Giá vốn hàng trả lại.
- Có TK 632: Giảm giá vốn.

---

 CHƯƠNG 3: NGHIỆP VỤ TIỀN LƯƠNG & BẢO HIỂM (PAYROLL)

 Nghiệp vụ 6: Tính lương cuối tháng (Salary Accrual)
Căn cứ vào Bảng lương (`bang_luong.py`) đã duyệt.

1. Hạch toán chi phí lương:
   - Nợ TK 6411 (Bộ phận BH), 6421 (Bộ phận QL), 622 (Nhân công SX).
   - Có TK 334 (Phải trả người lao động): Tổng lương Gross.

2. Trích bảo hiểm & Kinh phí công đoàn (Phần Doanh nghiệp chịu):
   - Nợ TK 641/642/622: 21.5% (BHXH 17.5%, BHYT 3%, BHTN 1%).
   - Có TK 3383, 3384, 3386: Các quỹ bảo hiểm.

3. Trích bảo hiểm & Thuế (Phần Nhân viên chịu - Khấu trừ lương):
   - Nợ TK 334 (Trừ vào lương NV).
   - Có TK 3383, 3384, 3386: 10.5% (BHXH 8%, BHYT 1.5%, BHTN 1%).
   - Có TK 3335: Thuế TNCN phải nộp hộ.

 Nghiệp vụ 7: Thanh toán lương (Salary Payment)
Khi chuyển khoản lương vào ngày 05 hàng tháng.
- Nợ TK 334 (Phải trả người lao động): Số tiền thực nhận (Net Salary).
- Có TK 112 (Tiền gửi ngân hàng).

---

 CHƯƠNG 4: NGHIỆP VỤ TÀI CHÍNH KHÁC

 Nghiệp vụ 8: Tạm ứng & Hoàn ứng
1. Khi chi tạm ứng:
   - Nợ TK 141 (Tạm ứng): Theo nhân viên.
   - Có TK 111/112.
2. Khi hoàn ứng (Quyết toán):
   - Nợ TK 641/642/156: Ghi nhận chi phí theo hóa đơn mang về.
   - Nợ TK 1331: Thuế đầu vào (nếu có).
   - Có TK 141: Trừ vào số tiền đã ứng.
3. Xử lý chênh lệch:
   - Nếu Thiếu (Chi > Ứng): Chi thêm (Có 111).
   - Nếu Thừa (Chi < Ứng): Thu lại (Nợ 111).