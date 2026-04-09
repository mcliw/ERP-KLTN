package erp.company.sales.specification;

import erp.company.sales.entity.Voucher;
import erp.company.sales.entity.VoucherDetail;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class VoucherSpecification {

    public static Specification<Voucher> filter(String keyword, String discountType, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // 1. Loại bỏ bản ghi đã xóa
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Tìm kiếm theo Mã Code (Cần Join sang bảng VoucherDetail)
            if (StringUtils.hasText(keyword)) {
                // Join bảng VoucherDetail để lấy trường 'code'
                Join<Voucher, VoucherDetail> detailJoin = root.join("details", JoinType.INNER);
                
                String search = "%" + keyword.toUpperCase().trim() + "%";
                predicates.add(cb.like(detailJoin.get("code"), search));
            }

            // 3. Lọc theo loại giảm giá (FIXED_AMOUNT / PERCENTAGE)
            if (StringUtils.hasText(discountType)) {
                predicates.add(cb.equal(root.get("discountType"), discountType));
            }

            // 4. Lọc theo trạng thái (Map is_active dựa trên string Status gửi từ FE)
            if (StringUtils.hasText(status)) {
                boolean isActive = "ACTIVE".equalsIgnoreCase(status);
                predicates.add(cb.equal(root.get("isActive"), isActive));
            }

            // Group By để tránh duplicate kết quả do Join
            query.distinct(true);

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}