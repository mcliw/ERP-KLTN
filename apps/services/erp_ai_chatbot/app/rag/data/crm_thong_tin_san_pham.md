 TÀI LIỆU: KIẾN THỨC SẢN PHẨM & QUẢN LÝ DANH MỤC
 MÃ TÀI LIỆU: CRM-PROD-01

---

 CHƯƠNG 1: CẤU TRÚC SẢN PHẨM TRÊN HỆ THỐNG

 Điều 1. Sản phẩm & Biến thể (Product vs Variant)
1. Sản phẩm cha (Product):
   - Là đại diện chung (ví dụ: iPhone 15 Pro Max).
   - Chứa thông tin chung: Mô tả, Hãng sản xuất (`Brand`), Chính sách bảo hành.
2. Biến thể (Variant):
   - Là phiên bản cụ thể có thể bán được (ví dụ: iPhone 15 Pro Max - 256GB - Titan Tự nhiên).
   - Có SKU riêng, Giá bán riêng (`original_price`) và Tồn kho riêng (`stock`).

 Điều 2. Quy ước đặt mã SKU
Mã SKU giúp định danh nhanh sản phẩm, thường có cấu trúc: `THUONGHIEU-LOAI-MODEL-MAUSAC`.
- Ví dụ: `AP-IP15-PM-TI` (Apple iPhone 15 Pro Max Titan).
- Khi khách hàng hỏi tồn kho, nhân viên nên tra cứu bằng SKU để có kết quả chính xác nhất (tool `tim_san_pham`).

---

 CHƯƠNG 2: CHÍNH SÁCH BẢO HÀNH (WARRANTY)

 Điều 3. Thời gian bảo hành tiêu chuẩn
- Thiết bị điện tử (Laptop, PC, Điện thoại): Bảo hành 12 tháng chính hãng.
- Phụ kiện (Chuột, Phím, Tai nghe): Bảo hành 6 tháng (1 đổi 1 nếu lỗi NSX).
- Linh kiện máy tính (RAM, SSD): Bảo hành 36 tháng.

 Điều 4. Điều kiện từ chối bảo hành
1. Sản phẩm mất tem bảo hành hoặc tem bị rách/tẩy xóa.
2. Sản phẩm bị tác động vật lý (rơi vỡ, móp méo) hoặc ngấm nước.
3. Tự ý tháo lắp, sửa chữa tại các đơn vị không được ủy quyền.

---

 CHƯƠNG 3: TRẠNG THÁI SẢN PHẨM
- New (Mới): Hàng nguyên seal, chưa kích hoạt.
- Open-box: Hàng đã mở hộp kiểm tra, đầy đủ phụ kiện, chưa qua sử dụng.
- Used (Cũ): Hàng đã qua sử dụng, có trầy xước nhẹ, giá rẻ hơn.