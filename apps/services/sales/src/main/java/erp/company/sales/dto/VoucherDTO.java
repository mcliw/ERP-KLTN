package erp.company.sales.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class VoucherDTO {
    private Integer id;

    // Layout: VoucherForm - Mã Voucher (lấy từ bảng voucher_detail)
    private String code;

    // Layout: VoucherForm - Loại giảm giá (PERCENTAGE / FIXED_AMOUNT)
    private String discountType;

    // Layout: VoucherForm - Giá trị giảm
    private BigDecimal discountValue;

    // Layout: VoucherForm - Trạng thái (ACTIVE/INACTIVE) -> Map với is_active trong DB
    private String status;

    // Layout: VoucherForm - Điều kiện áp dụng (lấy từ bảng voucher_constraint)
    private BigDecimal minOrderAmount;

    // Layout: VoucherForm - Mức giảm tối đa
    private BigDecimal maxDiscountAmount;

    // Layout: VoucherTable - Ngày tạo
    private LocalDateTime createdAt;
}