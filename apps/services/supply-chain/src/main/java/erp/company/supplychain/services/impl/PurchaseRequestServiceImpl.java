package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.PrItemDTO;
import erp.company.supplychain.dto.PurchaseRequestDTO;
import erp.company.supplychain.entity.PrItem;
import erp.company.supplychain.entity.PurchaseRequest;
import erp.company.supplychain.entity.enums.PrStatus;
import erp.company.supplychain.repository.PrItemRepository;
import erp.company.supplychain.repository.ProductRepository;
import erp.company.supplychain.repository.PurchaseRequestRepository;
import erp.company.supplychain.services.PurchaseRequestService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseRequestServiceImpl implements PurchaseRequestService {

    private final PurchaseRequestRepository prRepository;
    private final PrItemRepository itemRepository;
    private final ProductRepository productRepository;

    @Override
    public Page<PurchaseRequestDTO> getRequests(String keyword, Integer departmentId, String status, Pageable pageable) {
        Specification<PurchaseRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("prCode")), "%" + keyword.toLowerCase() + "%"),
                        cb.like(cb.lower(root.get("reason")), "%" + keyword.toLowerCase() + "%")
                ));
            }
            if (departmentId != null) {
                predicates.add(cb.equal(root.get("departmentId"), departmentId));
            }
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(root.get("status"), PrStatus.valueOf(status)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return prRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public PurchaseRequestDTO getRequestById(Integer id) {
        PurchaseRequest entity = prRepository.findById(id).orElseThrow();
        // Fetch items explicitly if lazy loading issues arise or utilize mapToDTO
        return mapToDTO(entity);
    }

    @Override
    @Transactional
    public PurchaseRequestDTO createRequest(PurchaseRequestDTO dto) {
        if (checkPrCodeExists(dto.getPrCode())) throw new RuntimeException("Code exists");
        
        PurchaseRequest entity = new PurchaseRequest();
        mapToEntity(dto, entity);
        
        // Save parent first to get ID
        PurchaseRequest savedPr = prRepository.save(entity);
        
        // Save items
        if (dto.getItems() != null) {
            List<PrItem> items = dto.getItems().stream().map(itemDto -> {
                PrItem item = new PrItem();
                item.setPurchaseRequest(savedPr);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantityRequested(itemDto.getQuantityRequested());
                item.setExpectedDate(itemDto.getExpectedDate());
                return item;
            }).collect(Collectors.toList());
            itemRepository.saveAll(items);
            savedPr.setItems(items); // Update for return
        }
        
        return mapToDTO(savedPr);
    }

    @Override
    @Transactional
    public PurchaseRequestDTO updateRequest(Integer id, PurchaseRequestDTO dto) {
        PurchaseRequest entity = prRepository.findById(id).orElseThrow();
        
        // Update basic fields
        entity.setRequestDate(dto.getRequestDate());
        entity.setReason(dto.getReason());
        if (dto.getStatus() != null) entity.setStatus(PrStatus.valueOf(dto.getStatus()));
        
        // Update Items: Simple strategy - Delete all and re-insert
        // A better strategy would be to check IDs and update existing ones.
        if (dto.getItems() != null) {
             itemRepository.deleteByPurchaseRequest_PrId(id);
             
             List<PrItem> newItems = dto.getItems().stream().map(itemDto -> {
                PrItem item = new PrItem();
                item.setPurchaseRequest(entity);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantityRequested(itemDto.getQuantityRequested());
                item.setExpectedDate(itemDto.getExpectedDate());
                return item;
            }).collect(Collectors.toList());
            
            // entity.setItems(newItems); // Cascade ALL handles save
            itemRepository.saveAll(newItems);
            entity.setItems(newItems);
        }

        return mapToDTO(prRepository.save(entity));
    }

    @Override
    public void deleteRequest(Integer id) {
        // Hard delete allowed only for DRAFT? Check business logic.
        prRepository.deleteById(id);
    }

    @Override
    public boolean checkPrCodeExists(String prCode) {
        return prRepository.existsByPrCode(prCode);
    }

    @Override
    public List<PurchaseRequestDTO> getApprovedRequestsForQuotation() {
        return prRepository.findByStatus(PrStatus.APPROVED).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }
    
    // Mock data for HRM logic as per FE service
    @Override
    public List<Map<String, Object>> getEmployeesRef() {
        return List.of(); 
    }
    @Override
    public List<Map<String, Object>> getDepartmentsRef() {
        return List.of();
    }

    private PurchaseRequestDTO mapToDTO(PurchaseRequest entity) {
        PurchaseRequestDTO dto = new PurchaseRequestDTO();
        dto.setPrId(entity.getPrId());
        dto.setPrCode(entity.getPrCode());
        dto.setRequesterId(entity.getRequesterId());
        dto.setDepartmentId(entity.getDepartmentId());
        dto.setRequestDate(entity.getRequestDate());
        dto.setReason(entity.getReason());
        dto.setStatus(entity.getStatus().name());
        dto.setCreatedAt(entity.getCreatedAt());

        if (entity.getItems() != null) {
            dto.setItems(entity.getItems().stream().map(item -> {
                PrItemDTO itemDTO = new PrItemDTO();
                itemDTO.setPrItemId(item.getPrItemId());
                itemDTO.setProductId(item.getProduct().getProductId());
                itemDTO.setProductName(item.getProduct().getProductName());
                itemDTO.setQuantityRequested(item.getQuantityRequested());
                itemDTO.setExpectedDate(item.getExpectedDate());
                return itemDTO;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    private void mapToEntity(PurchaseRequestDTO dto, PurchaseRequest entity) {
        entity.setPrCode(dto.getPrCode());
        entity.setRequesterId(dto.getRequesterId());
        entity.setDepartmentId(dto.getDepartmentId());
        entity.setRequestDate(dto.getRequestDate());
        entity.setReason(dto.getReason());
        entity.setStatus(dto.getStatus() != null ? PrStatus.valueOf(dto.getStatus()) : PrStatus.DRAFT);
    }
}