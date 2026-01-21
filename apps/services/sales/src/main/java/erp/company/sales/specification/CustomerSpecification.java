package erp.company.sales.specification;

import erp.company.sales.entity.Customer;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

public class CustomerSpecification {

    /**
     * Tạo Query động dựa trên CustomerFilter.jsx
     */
    public static Specification<Customer> filter(String keyword, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Luôn loại bỏ các bản ghi đã bị xóa mềm (Soft Delete)
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Xử lý tìm kiếm từ khóa (Keyword)
            // Tìm trong: Mã KH, Tên, SĐT, Email
            if (StringUtils.hasText(keyword)) {
                String search = "%" + keyword.toLowerCase().trim() + "%";
                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("code")), search),
                        cb.like(cb.lower(root.get("fullName")), search),
                        cb.like(cb.lower(root.get("phone")), search),
                        cb.like(cb.lower(root.get("email")), search)
                );
                predicates.add(searchPredicate);
            }

            // 3. Xử lý lọc theo trạng thái (Status)
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Kết hợp tất cả điều kiện bằng AND
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}