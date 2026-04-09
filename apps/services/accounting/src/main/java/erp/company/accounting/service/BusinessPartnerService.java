package erp.company.accounting.service;

import java.util.List;
import java.util.Optional;

import erp.company.accounting.entity.BusinessPartner;
import erp.company.accounting.entity.enums.PartnerType;

public interface BusinessPartnerService {

    // 1. Lấy danh sách đối tác theo loại (CUSTOMER/SUPPLIER)
    List<BusinessPartner> getPartnersByType(PartnerType type);
    
    // 2. Tìm đối tác theo mã (Hỗ trợ mapping khi import hoặc sync)
    Optional<BusinessPartner> findByExternalId(String externalId, PartnerType type);

    // 3. Đồng bộ đối tác từ module khác (Sales/Purchasing gọi sang)
    BusinessPartner syncPartner(BusinessPartner partner);
}