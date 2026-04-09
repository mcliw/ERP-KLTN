package erp.company.sales.service;

import erp.company.sales.dto.VoucherDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VoucherService {

    /**
     * Phục vụ: VoucherFilter.jsx & VoucherTable.jsx
     * Chức năng: Tìm kiếm Voucher theo Mã (Code), lọc theo Loại giảm giá và Trạng thái.
     * Lưu ý: Cần join bảng VoucherDetail để tìm theo Code.
     */
    Page<VoucherDTO> getVouchers(String keyword, String discountType, String status, Pageable pageable);

    /**
     * Phục vụ: VoucherForm.jsx (Mode = Edit)
     * Chức năng: Lấy dữ liệu Voucher, gộp thông tin từ 3 bảng (Voucher, Detail, Constraint)
     * thành 1 DTO phẳng (flat) để hiển thị lên Form.
     */
    VoucherDTO getVoucherById(Integer id);

    /**
     * Phục vụ: VoucherForm.jsx (Mode = Create)
     * Chức năng: Nhận DTO phẳng, tách dữ liệu và lưu vào 3 bảng tương ứng trong Transaction.
     */
    VoucherDTO createVoucher(VoucherDTO voucherDTO);

    /**
     * Phục vụ: VoucherForm.jsx (Mode = Edit -> Submit)
     * Chức năng: Cập nhật thông tin Voucher.
     */
    VoucherDTO updateVoucher(Integer id, VoucherDTO voucherDTO);

    /**
     * Phục vụ: VoucherTable.jsx (Nút Xóa)
     * Chức năng: Xóa mềm Voucher.
     */
    void deleteVoucher(Integer id);

    /**
     * Phục vụ: Logic áp dụng mã giảm giá khi bán hàng (Check Code)
     * Chức năng: Tìm Voucher khả dụng theo mã code string (VD: "SUMMER2024").
     */
    VoucherDTO findByCode(String code);
}