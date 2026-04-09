package erp.company.supplychain.services;

import erp.company.supplychain.dto.SupplierDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface SupplierService {
    // Table + Filter
    Page<SupplierDTO> getSuppliers(String keyword, String status, Double minRating, Pageable pageable);

    SupplierDTO getSupplierById(Integer id);

    SupplierDTO createSupplier(SupplierDTO supplierDTO);

    SupplierDTO updateSupplier(Integer id, SupplierDTO supplierDTO);

    void deleteSupplier(Integer id);

    // Validation
    boolean checkCodeExists(String code);
    boolean checkTaxCodeExists(String taxCode);

    // Dropdown (Quotation, PO Form): Lấy NCC đang hợp tác
    List<SupplierDTO> getActiveSuppliers();
}