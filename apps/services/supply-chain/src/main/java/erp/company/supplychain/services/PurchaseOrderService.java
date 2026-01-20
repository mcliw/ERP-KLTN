package erp.company.supplychain.services;

import erp.company.supplychain.dto.PurchaseOrderDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PurchaseOrderService {
    // Table + Filter
    Page<PurchaseOrderDTO> getPurchaseOrders(String keyword, Integer supplierId, String status, Pageable pageable);

    PurchaseOrderDTO getPoById(Integer id);

    PurchaseOrderDTO createPO(PurchaseOrderDTO poDTO);

    PurchaseOrderDTO updatePO(Integer id, PurchaseOrderDTO poDTO);

    void deletePO(Integer id);

    // Table Action: Duyệt đơn hàng
    void approvePO(Integer id);

    // Table Action: Hoàn thành đơn hàng (khi nhập kho đủ)
    void completePO(Integer id);
    
    // Table Action: Hủy đơn hàng
    void cancelPO(Integer id);

    // Form Logic: Lấy dữ liệu từ Quotation để fill vào Form PO
    // Map items, supplier, giá từ Quotation sang PO structure
    PurchaseOrderDTO getDataFromQuotation(Integer quotationId);

    // Validation
    boolean checkPoCodeExists(String poCode);
}