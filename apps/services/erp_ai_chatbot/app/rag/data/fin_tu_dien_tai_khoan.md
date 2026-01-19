 TÀI LIỆU: TỪ ĐIỂN HỆ THỐNG TÀI KHOẢN KẾ TOÁN (COA DICTIONARY)
 CĂN CỨ: THÔNG TƯ 200/2014/TT-BTC
 MÃ TÀI LIỆU: FIN-COA-DICT-01

---

 PHẦN A: NGUYÊN TẮC PHÂN LOẠI CHI PHÍ (TÀI KHOẢN ĐẦU 6)

Đây là phần quan trọng nhất để phân tích Profit & Loss (P&L).

 1. Tài khoản 641 - Chi phí Bán hàng (Selling Expenses)
Định nghĩa: Bao gồm các chi phí phát sinh thực tế trong quá trình tiêu thụ sản phẩm, hàng hóa, dịch vụ.
Dấu hiệu nhận biết: Chi phí liên quan trực tiếp đến việc đưa hàng ra thị trường.

Các tài khoản cấp 2 chi tiết:
- 6411 (Chi phí nhân viên bán hàng): Lương, thưởng, bảo hiểm của nhân viên Sales, nhân viên Showroom, tiếp thị.
- 6412 (Chi phí vật liệu, bao bì): Bao bì đóng gói, vật liệu dùng cho sửa chữa bảo hành sản phẩm.
- 6413 (Chi phí dụng cụ, đồ dùng): Kệ trưng bày, tủ kính tại cửa hàng, máy POS quẹt thẻ.
- 6414 (Chi phí khấu hao TSCĐ): Khấu hao xe tải giao hàng, khấu hao nhà kho chứa hàng hóa, khấu hao cửa hàng.
- 6415 (Chi phí bảo hành): Chi phí sửa chữa, bảo hành sản phẩm lỗi cho khách.
- 6417 (Chi phí dịch vụ mua ngoài): Tiền thuê kho, thuê cửa hàng, phí vận chuyển bốc xếp hàng đi bán, chi phí chạy quảng cáo (Facebook Ads, Google Ads), hoa hồng đại lý.
- 6418 (Chi phí bằng tiền khác): Chi phí hội nghị khách hàng, tiếp khách của phòng Sales.

 2. Tài khoản 642 - Chi phí Quản lý Doanh nghiệp (G&A Expenses)
Định nghĩa: Bao gồm các chi phí chi dùng cho bộ máy quản lý và điều hành chung toàn doanh nghiệp.
Dấu hiệu nhận biết: Chi phí "nuôi" bộ máy văn phòng (Back-office) và Ban Giám đốc.

Các tài khoản cấp 2 chi tiết:
- 6421 (Chi phí nhân viên quản lý): Lương của Ban Giám đốc, Kế toán, Nhân sự, IT, Hành chính.
- 6422 (Chi phí vật liệu quản lý): Văn phòng phẩm (giấy, bút, mực in), vật liệu sửa chữa văn phòng.
- 6423 (Chi phí đồ dùng văn phòng): Máy tính, máy in, bàn ghế văn phòng.
- 6424 (Chi phí khấu hao TSCĐ): Khấu hao tòa nhà văn phòng, xe ô tô đưa đón Giám đốc.
- 6425 (Thuế, phí, lệ phí): Thuế môn bài, tiền thuê đất.
- 6427 (Chi phí dịch vụ mua ngoài): Tiền điện, nước, internet của văn phòng; chi phí thuê kiểm toán, tư vấn luật; bảo hiểm tài sản văn phòng.
- 6428 (Chi phí bằng tiền khác): Chi phí hội nghị nhân viên, công tác phí của khối văn phòng.

Ví dụ phân biệt:
- Tiền điện tại Cửa hàng -> Hạch toán 6417.
- Tiền điện tại Văn phòng công ty -> Hạch toán 6427.
- Lương nhân viên Sales -> Hạch toán 6411.
- Lương Kế toán trưởng -> Hạch toán 6421.

 3. Tài khoản 632 - Giá vốn hàng bán (COGS)
Định nghĩa: Giá trị vốn của hàng hóa, thành phẩm đã bán được trong kỳ.
Nguyên tắc: Phải tuân thủ nguyên tắc "Phù hợp" (Matching Concept) - Doanh thu ghi nhận đến đâu, giá vốn ghi nhận đến đó.
- Đối với hàng thương mại: Là giá mua vào + chi phí mua hàng phân bổ.
- Đối với sản xuất: Là chi phí sản xuất (NVL + Nhân công + Sản xuất chung).

---

 PHẦN B: TÀI KHOẢN CÔNG NỢ & THANH TOÁN (ĐẦU 1, 3)

 4. Tài khoản 131 - Phải thu của khách hàng (Accounts Receivable)
- Tính chất: Vừa là Tài sản (khi khách nợ mình), vừa là Nguồn vốn (khi khách ứng trước tiền).
- Quy tắc theo dõi: Bắt buộc phải theo dõi chi tiết theo từng Đối tượng (`partner_id`) và từng Hóa đơn/Hợp đồng.
- Lưu ý:
  - Dư Nợ 131: Khách hàng đang nợ tiền công ty -> Tài sản.
  - Dư Có 131: Khách hàng trả thừa hoặc ứng trước tiền -> Nợ phải trả (Doanh thu chưa thực hiện).

 5. Tài khoản 331 - Phải trả cho người bán (Accounts Payable)
- Tính chất: Vừa là Nguồn vốn (khi mình nợ NCC), vừa là Tài sản (khi mình ứng trước tiền cho NCC).
- Quy tắc theo dõi: Theo dõi chi tiết theo từng Nhà cung cấp (`partner_id`).
- Lưu ý:
  - Dư Có 331: Công ty đang nợ tiền NCC -> Nợ phải trả.
  - Dư Nợ 331: Công ty ứng trước tiền cho NCC -> Tài sản.

 6. Tài khoản 111, 112 (Tiền)
- 111 (Tiền mặt): Tiền giấy, tiền xu tại quỹ. Chứng từ gốc là Phiếu Thu / Phiếu Chi.
- 112 (Tiền gửi ngân hàng): Tiền tại NH. Chứng từ gốc là Giấy báo Nợ / Giấy báo Có (Sao kê).
- 113 (Tiền đang chuyển): Tiền đã làm lệnh chuyển đi nhưng bên kia chưa nhận được (thường dùng dịp cuối tháng, lễ tết).

---

 PHẦN C: CÁC TÀI KHOẢN KHÁC THƯỜNG GẶP

 7. Tài khoản 242 - Chi phí trả trước (Prepaid Expenses)
- Định nghĩa: Các khoản chi phí thực tế đã phát sinh nhưng có tác dụng cho nhiều kỳ kế toán (thuê nhà 6 tháng, mua bảo hiểm 1 năm, công cụ dụng cụ xuất dùng).
- Hạch toán: Không ghi ngay vào 641/642 một cục, mà treo vào 242 rồi định kỳ cuối tháng phân bổ dần.

 8. Tài khoản 3331 - Thuế GTGT phải nộp (Output VAT)
- Phản ánh số thuế GTGT đầu ra doanh nghiệp phải nộp cho nhà nước khi bán hàng.
- Công thức cuối kỳ: Thuế phải nộp = Thuế đầu ra (3331) - Thuế đầu vào được khấu trừ (1331).