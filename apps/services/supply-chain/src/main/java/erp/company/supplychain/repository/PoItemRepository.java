package erp.company.supplychain.repository;

import erp.company.supplychain.entity.PoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PoItemRepository extends JpaRepository<PoItem, Integer> {

    /**
     * Tìm tất cả các item thuộc về một đơn hàng mua (Purchase Order) cụ thể.
     * * Giải thích tên hàm:
     * - findBy: Tiền tố truy vấn.
     * - PurchaseOrder: Tên thuộc tính quan hệ trong entity PoItem.
     * - _PoId: Tên thuộc tính khóa chính trong entity PurchaseOrder.
     * * @param poId ID của đơn hàng mua
     * @return Danh sách chi tiết sản phẩm của đơn hàng đó
     */
    List<PoItem> findByPurchaseOrder_PoId(Integer poId);
    
    // Nếu cần xóa nhanh tất cả item của 1 PO (dùng cho hàm destroy PO)
    void deleteByPurchaseOrder_PoId(Integer poId);
}