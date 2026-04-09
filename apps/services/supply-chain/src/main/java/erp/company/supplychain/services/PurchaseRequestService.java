package erp.company.supplychain.services;

import erp.company.supplychain.dto.PurchaseRequestDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

public interface PurchaseRequestService {
    // Table + Filter
    Page<PurchaseRequestDTO> getRequests(String keyword, Integer departmentId, String status, Pageable pageable);

    PurchaseRequestDTO getRequestById(Integer id);

    PurchaseRequestDTO createRequest(PurchaseRequestDTO prDTO);

    PurchaseRequestDTO updateRequest(Integer id, PurchaseRequestDTO prDTO);

    void deleteRequest(Integer id);

    // Validation
    boolean checkPrCodeExists(String prCode);

    // Dropdown (QuotationForm): Lấy các PR đã được duyệt (APPROVED) để làm báo giá
    List<PurchaseRequestDTO> getApprovedRequestsForQuotation();

    // Helper cho Form: Lấy danh sách nhân viên và phòng ban (Mock data hoặc gọi HRM Service)
    List<Map<String, Object>> getEmployeesRef();
    List<Map<String, Object>> getDepartmentsRef();
}