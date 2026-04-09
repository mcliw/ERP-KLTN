package erp.company.accounting.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import erp.company.accounting.entity.BusinessPartner;
import erp.company.accounting.entity.enums.PartnerType;
import erp.company.accounting.repository.BusinessPartnerRepository;
import erp.company.accounting.service.BusinessPartnerService;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BusinessPartnerServiceImpl implements BusinessPartnerService {

    private final BusinessPartnerRepository partnerRepo;

    @Override
    public List<BusinessPartner> getPartnersByType(PartnerType type) {
        return partnerRepo.findByPartnerType(type);
    }

    @Override
    public Optional<BusinessPartner> findByExternalId(String externalId, PartnerType type) {
        return partnerRepo.findByExternalIdAndPartnerType(externalId, type);
    }

    @Override
    public BusinessPartner syncPartner(BusinessPartner partner) {
        // Logic: Nếu tồn tại ExternalID thì update, chưa thì insert
        Optional<BusinessPartner> existing = partnerRepo.findByExternalIdAndPartnerType(
                partner.getExternalId(), partner.getPartnerType());
        
        if (existing.isPresent()) {
            BusinessPartner dbPartner = existing.get();
            dbPartner.setPartnerName(partner.getPartnerName());
            dbPartner.setTaxCode(partner.getTaxCode());
            dbPartner.setContactInfo(partner.getContactInfo());
            return partnerRepo.save(dbPartner);
        } else {
            return partnerRepo.save(partner);
        }
    }
}