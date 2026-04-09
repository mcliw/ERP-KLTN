package erp.company.accounting.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import erp.company.accounting.entity.BusinessPartner;
import erp.company.accounting.entity.enums.PartnerType;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessPartnerRepository extends JpaRepository<BusinessPartner, Integer>, JpaSpecificationExecutor<BusinessPartner> {

    // 1. Lấy danh sách theo loại (Customer/Supplier) cho Dropdown
    List<BusinessPartner> findByPartnerType(PartnerType partnerType);

    // 2. Tìm đối tác theo ID từ hệ thống ngoài (External ID từ Sales/Purchasing)
    // Dùng khi đồng bộ dữ liệu hoặc khi Form gửi ID đơn hàng cần map về đối tác
    Optional<BusinessPartner> findByExternalIdAndPartnerType(String externalId, PartnerType partnerType);
}