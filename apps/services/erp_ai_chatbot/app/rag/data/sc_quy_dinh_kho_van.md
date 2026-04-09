 TÀI LIỆU: QUY ĐỊNH QUẢN LÝ KHO & ĐỔI TRẢ HÀNG
 MÃ TÀI LIỆU: SC-INV-01

---

 CHƯƠNG 1: QUY TRÌNH KIỂM KÊ KHO (STOCKTAKE PROCESS)

 Điều 1. Tần suất kiểm kê
1. Kiểm kê định kỳ (Cyclic Count):
   - Thực hiện vào ngày cuối cùng của mỗi tháng.
   - Đối tượng: Toàn bộ kho hoặc nhóm hàng ABC (A: hàng giá trị cao - kiểm tháng; C: hàng giá trị thấp - kiểm quý).
2. Kiểm kê đột xuất (Spot Check):
   - Thực hiện khi có nghi ngờ mất mát hoặc chênh lệch tồn kho bất thường.

 Điều 2. Quy trình thực hiện
1. Bước 1: Đóng băng kho (Freeze): Ngừng mọi hoạt động Nhập/Xuất trong thời gian kiểm kê.
2. Bước 2: Tạo đợt kiểm kê: Tạo mã `Stocktake` trên hệ thống.
3. Bước 3: Đếm thực tế: Thủ kho đi đếm số lượng thực tế tại từng Bin/Vị trí và nhập vào máy.
4. Bước 4: Đối chiếu: Hệ thống tự động so sánh `Actual Quantity` (Thực tế) và `System Quantity` (Sổ sách).

 Điều 3. Xử lý Chênh lệch (Variance Handling)
Dựa trên báo cáo `bao_cao_chenh_lech_kiem_ke`:

1. Chênh lệch trong định mức (sai số < 0.5%):
   - Thủ kho làm giải trình.
   - Kế toán kho thực hiện bút toán điều chỉnh kho (Inventory Adjustment) để cân bằng sổ sách.

2. Chênh lệch vượt định mức (sai số > 0.5% hoặc giá trị > 2.000.000 VNĐ):
   - Phải lập biên bản sự việc.
   - Thủ kho phải bồi thường 100% giá trị hàng thiếu nếu không giải trình được nguyên nhân hợp lý.
   - Quy trình kỷ luật sẽ được kích hoạt.

---

 CHƯƠNG 2: CHÍNH SÁCH ĐỔI TRẢ HÀNG NHẬP (RETURN TO VENDOR)

 Điều 4. Điều kiện trả hàng
Hàng hóa đã nhập kho (Goods Receipt) được phép làm thủ tục trả lại Nhà cung cấp trong các trường hợp:
1. Hàng bị lỗi kỹ thuật, hư hỏng do vận chuyển của NCC.
2. Hàng giao sai quy cách, mẫu mã so với PO (dựa trên tool `doi_chieu_so_luong_po_va_gr`).
3. Hàng cận date (theo thỏa thuận hợp đồng).

 Điều 5. Quy trình trả hàng trên hệ thống
1. Bước 1: Kho lập biên bản ghi nhận tình trạng hàng lỗi, có ảnh chụp minh chứng.
2. Bước 2: Tạo phiếu xuất kho (Goods Issue) với loại xuất là `RETURN_TO_VENDOR` (Trả hàng NCC).
   (Lưu ý: Không dùng loại xuất `INTERNAL_USE` hay `SALES` cho mục đích này).
3. Bước 3: Kế toán công nợ (`ap_no`) sẽ trừ tiền tương ứng vào công nợ phải trả của NCC đó.

 Điều 6. Thời hạn xử lý
- Hàng lỗi phải được thông báo cho NCC trong vòng 48 giờ kể từ khi nhập kho.
- Việc xuất trả thực tế phải hoàn tất trong vòng 07 ngày.