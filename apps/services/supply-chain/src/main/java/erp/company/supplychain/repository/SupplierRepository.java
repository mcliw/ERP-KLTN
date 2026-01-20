package erp.company.supplychain.repository;

import erp.company.supplychain.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Integer>, JpaSpecificationExecutor<Supplier> {

    // Validation: Check trùng mã và MST (SupplierForm)
    boolean existsBySupplierCode(String supplierCode);
    boolean existsByTaxCode(String taxCode);

    // Dropdown: Lấy nhà cung cấp đang hợp tác (QuotationForm, POForm)
    List<Supplier> findByStatus(String status);
}