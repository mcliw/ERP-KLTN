package erp.company.supplychain.repository;

import erp.company.supplychain.entity.PrItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrItemRepository extends JpaRepository<PrItem, Integer> {

    /**
     * Tìm tất cả các item thuộc về một phiếu yêu cầu mua hàng (Purchase Request).
     * * Giải thích tên hàm:
     * - findBy: Tiền tố truy vấn.
     * - PurchaseRequest: Tên thuộc tính quan hệ trong entity PrItem.
     * - _PrId: Tên thuộc tính khóa chính trong entity PurchaseRequest.
     * * @param prId ID của phiếu yêu cầu
     * @return Danh sách chi tiết sản phẩm của phiếu yêu cầu đó
     */
    List<PrItem> findByPurchaseRequest_PrId(Integer prId);

    // Xóa tất cả item của 1 PR (dùng khi xóa cứng PR)
    void deleteByPurchaseRequest_PrId(Integer prId);
}