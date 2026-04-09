package erp.company.supplychain.repository;

import erp.company.supplychain.entity.GoodsReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Integer>, JpaSpecificationExecutor<GoodsReceipt> {

    boolean existsByGrCode(String grCode);

    // Tìm phiếu nhập theo PO (để biết PO này đã nhập bao nhiêu lần)
    List<GoodsReceipt> findByPurchaseOrder_PoId(Integer poId);
}