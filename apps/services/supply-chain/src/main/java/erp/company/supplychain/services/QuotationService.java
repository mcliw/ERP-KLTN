package erp.company.supplychain.services;

import erp.company.supplychain.dto.QuotationDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface QuotationService {
    // Table + Filter
    Page<QuotationDTO> getQuotations(String keyword, Integer supplierId, String status, Pageable pageable);

    QuotationDTO getQuotationById(Integer id);

    QuotationDTO createQuotation(QuotationDTO quotationDTO);

    QuotationDTO updateQuotation(Integer id, QuotationDTO quotationDTO);

    void deleteQuotation(Integer id);

    // Table Action: Chọn báo giá này (Đánh dấu isSelected = true, các cái khác cùng PR thành false)
    void selectQuotation(Integer id);

    // Table Action: Duyệt báo giá (Đổi status -> APPROVED)
    void approveQuotation(Integer id);
    
    // Table Action: Từ chối báo giá
    void rejectQuotation(Integer id);

    // Form Logic: Lấy items từ PR để fill vào form tạo báo giá
    // Trả về DTO chứa sẵn list items lấy từ PR
    QuotationDTO initQuotationFromPr(Integer prId);

    // Dropdown (PO Form): Lấy danh sách báo giá khả dụng để tạo PO (Approved hoặc Selected)
    List<QuotationDTO> getAvailableQuotationsForPO();
}