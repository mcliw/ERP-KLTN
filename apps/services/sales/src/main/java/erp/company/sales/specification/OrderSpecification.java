package erp.company.sales.specification;

import erp.company.sales.entity.Order;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class OrderSpecification {

    public static Specification<Order> filter(String keyword, 
                                              UUID customerId, 
                                              String status, 
                                              String paymentMethod) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Loại bỏ bản ghi đã xóa
            predicates.add(cb.isNull(root.get("deletedAt")));

            // 2. Tìm kiếm từ khóa (Mã đơn - ID, hoặc Địa chỉ giao hàng)
            if (StringUtils.hasText(keyword)) {
                String search = "%" + keyword.toLowerCase().trim() + "%";
                
                // Mẹo: ID là số, nhưng muốn search like text thì cần ép kiểu hoặc chỉ search address
                // Ở đây tìm theo Address và ID (ép sang string)
                Predicate addressLike = cb.like(cb.lower(root.get("shippingAddress")), search);
                
                // Nếu keyword là số thì mới tìm theo ID
                if (keyword.matches("\\d+")) {
                     Predicate idEqual = cb.equal(root.get("id"), Integer.parseInt(keyword));
                     predicates.add(cb.or(addressLike, idEqual));
                } else {
                     predicates.add(addressLike);
                }
            }

            // 3. Lọc theo Khách hàng cụ thể
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customerId"), customerId));
            }

            // 4. Lọc theo Trạng thái đơn hàng
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(root.get("orderStatus"), status));
            }
            
            // 5. Lọc theo Phương thức thanh toán (COD, MOMO...)
            if (StringUtils.hasText(paymentMethod)) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}