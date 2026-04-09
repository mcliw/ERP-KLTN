 TÀI LIỆU: QUY TRÌNH TIẾP NHẬN & XỬ LÝ KHIẾU NẠI
 MÃ TÀI LIỆU: CRM-COMPLAINT-01

---

 CHƯƠNG 1: TIẾP NHẬN KHIẾU NẠI

 Điều 1. Kênh tiếp nhận
Khách hàng có thể gửi khiếu nại qua:
1. Tổng đài CSKH (Hotline).
2. Chatbot/Livechat trên Website/App.
3. Đánh giá 1-2 sao trên hệ thống Review sản phẩm (Tool `danh_gia_san_pham`).

 Điều 2. Nguyên tắc "Lắng nghe - Xin lỗi - Giải quyết"
Khi gặp khách hàng đang nóng giận, Nhân viên/Bot cần:
1. Xác thực: Yêu cầu cung cấp Mã đơn hàng (`order_id`) hoặc Số điện thoại đặt hàng để kiểm tra trên hệ thống.
2. Lắng nghe: Ghi nhận chi tiết vấn đề (Hàng lỗi, giao chậm, thái độ nhân viên...).
3. Xin lỗi: Xin lỗi vì trải nghiệm không tốt (chưa cần biết lỗi của ai).

---

 CHƯƠNG 2: QUY TRÌNH XỬ LÝ (RESOLUTION PROCESS)

 Bước 1: Xác minh sự việc (Verify)
- Kiểm tra trạng thái đơn hàng (`tra_cuu_trang_thai_don_hang`).
- Kiểm tra lịch sử giao dịch (`lich_su_mua_hang`).
- Nếu khiếu nại về sản phẩm: Yêu cầu khách gửi ảnh/video bằng chứng.

 Bước 2: Phân loại & Điều hướng
1. Khiếu nại Giao vận (Shipper thái độ, giao chậm): Chuyển bộ phận Vận hành làm việc với bên ship.
2. Khiếu nại Sản phẩm (Lỗi, cũ, hỏng): Chuyển bộ phận Kỹ thuật thẩm định.
3. Khiếu nại Thái độ nhân viên: Chuyển Quản lý cửa hàng (Store Manager).

 Bước 3: Đưa ra phương án giải quyết (Solution)
- Phương án 1 (Bồi thường nhẹ): Tặng Voucher giảm giá 50k-100k cho đơn sau (Dùng `vouchers.py` để lấy mã voucher xin lỗi).
- Phương án 2 (Đổi trả): Hỗ trợ đổi hàng tận nhà (Shipper mang hàng mới đến, lấy hàng cũ về).
- Phương án 3 (Hoàn tiền): Thu hồi hàng và hoàn tiền 100%.

 Bước 4: Phản hồi & Đóng khiếu nại (Close Ticket)
- Thông báo kết quả xử lý cho khách trong vòng 24h.
- Cập nhật trạng thái khiếu nại trên CRM.
- Gọi điện xác nhận khách hàng đã hài lòng (`Happy Call`) sau 3 ngày.