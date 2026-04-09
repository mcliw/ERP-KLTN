 TÀI LIỆU: DANH MỤC TÀI KHOẢN & QUY ĐỊNH THUẾ
 MÃ TÀI LIỆU: FIN-COA-01

---

 CHƯƠNG 1: DIỄN GIẢI TÀI KHOẢN KẾ TOÁN (COA DICTIONARY)

Hệ thống ERP sử dụng Thông tư 200/2014/TT-BTC. Dưới đây là các tài khoản thường dùng:

 Nhóm 1: Tài sản ngắn hạn
- 111 - Tiền mặt: Tiền giấy tại két sắt công ty.
- 112 - Tiền gửi ngân hàng: Tiền tại các tài khoản ngân hàng thương mại.
- 131 - Phải thu khách hàng (AR): Số tiền khách hàng nợ công ty (Theo dõi chi tiết theo `partner_id`).
- 141 - Tạm ứng: Tiền nhân viên đang giữ để đi công tác.

 Nhóm 3: Nợ phải trả
- 331 - Phải trả người bán (AP): Số tiền công ty nợ nhà cung cấp.
- 334 - Phải trả người lao động: Lương, thưởng chưa thanh toán.
- 3331 - Thuế GTGT phải nộp: Thuế đầu ra.

 Nhóm 5, 6: Doanh thu & Chi phí
- 511 - Doanh thu bán hàng: Ghi nhận khi xuất hóa đơn (`ARInvoice`).
- 632 - Giá vốn hàng bán: Ghi nhận khi xuất kho (`GoodsIssue`).
- 642 - Chi phí quản lý: Tiền điện, nước, văn phòng phẩm.

---

 CHƯƠNG 2: QUY ĐỊNH VỀ HÓA ĐƠN & THUẾ (INVOICING RULES)

 Điều 1. Thời điểm xuất hóa đơn
1. Bán hàng: Phải xuất hóa đơn GTGT ngay khi chuyển giao quyền sở hữu hoặc quyền sử dụng hàng hóa cho người mua, không phân biệt đã thu tiền hay chưa.
2. Dịch vụ: Xuất hóa đơn khi hoàn thành việc cung ứng dịch vụ hoặc khi thu tiền trước.

 Điều 2. Thuế suất GTGT (VAT)
- 0%: Hàng hóa xuất khẩu, phần mềm xuất khẩu.
- 8%: Áp dụng cho các mặt hàng được giảm thuế theo Nghị định (nếu có hiệu lực tại thời điểm xuất).
- 10%: Mức thuế suất phổ thông cho hầu hết hàng hóa, dịch vụ.
- KCT (Không chịu thuế): Phần mềm nội địa, sản phẩm nông nghiệp sơ chế.