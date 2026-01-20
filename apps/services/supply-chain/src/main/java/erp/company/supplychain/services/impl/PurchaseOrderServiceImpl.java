package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.PoItemDTO;
import erp.company.supplychain.dto.PurchaseOrderDTO;
import erp.company.supplychain.dto.QuotationDTO;
import erp.company.supplychain.entity.PoItem;
import erp.company.supplychain.entity.PurchaseOrder;
import erp.company.supplychain.entity.enums.PoStatus;
import erp.company.supplychain.repository.PoItemRepository;
import erp.company.supplychain.repository.ProductRepository;
import erp.company.supplychain.repository.PurchaseOrderRepository;
import erp.company.supplychain.repository.QuotationRepository;
import erp.company.supplychain.repository.SupplierRepository;
import erp.company.supplychain.services.PurchaseOrderService;
import erp.company.supplychain.services.QuotationService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderServiceImpl implements PurchaseOrderService {

    private final PurchaseOrderRepository poRepository;
    private final PoItemRepository poItemRepository;
    private final QuotationService quotationService; // Reuse logic from Quotation
    private final QuotationRepository quotationRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    @Override
    public Page<PurchaseOrderDTO> getPurchaseOrders(String keyword, Integer supplierId, String status, Pageable pageable) {
        Specification<PurchaseOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(keyword)) {
                predicates.add(cb.like(cb.lower(root.get("poCode")), "%" + keyword.toLowerCase() + "%"));
            }
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplier").get("supplierId"), supplierId));
            }
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(root.get("status"), PoStatus.valueOf(status)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return poRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public PurchaseOrderDTO getPoById(Integer id) {
        return mapToDTO(poRepository.findById(id).orElseThrow());
    }

    @Override
    @Transactional
    public PurchaseOrderDTO createPO(PurchaseOrderDTO dto) {
        if (checkPoCodeExists(dto.getPoCode())) throw new RuntimeException("PO Code exists");

        PurchaseOrder entity = new PurchaseOrder();
        mapToEntity(dto, entity);
        
        PurchaseOrder savedPo = poRepository.save(entity);

        // Save Items
        if (dto.getItems() != null) {
            List<PoItem> items = dto.getItems().stream().map(itemDto -> {
                PoItem item = new PoItem();
                item.setPurchaseOrder(savedPo);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantityOrdered(itemDto.getQuantityOrdered());
                item.setQuantityReceived(0);
                item.setUnitPrice(itemDto.getUnitPrice());
                // Calculate Total Line
                BigDecimal total = itemDto.getUnitPrice().multiply(BigDecimal.valueOf(itemDto.getQuantityOrdered()));
                item.setTotalLineAmount(total);
                return item;
            }).collect(Collectors.toList());
            poItemRepository.saveAll(items);
            savedPo.setItems(items);
        }

        return mapToDTO(savedPo);
    }

    @Override
    @Transactional
    public PurchaseOrderDTO updatePO(Integer id, PurchaseOrderDTO dto) {
        PurchaseOrder entity = poRepository.findById(id).orElseThrow();
        
        // Cannot update if Approved/Completed
        if (entity.getStatus() == PoStatus.APPROVED || entity.getStatus() == PoStatus.COMPLETED) {
            throw new RuntimeException("Cannot edit approved PO");
        }

        mapToEntity(dto, entity);
        PurchaseOrder savedPo = poRepository.save(entity);

        // Update items (delete and recreate strategy)
        if (dto.getItems() != null) {
            poItemRepository.deleteByPurchaseOrder_PoId(id);
            List<PoItem> items = dto.getItems().stream().map(itemDto -> {
                PoItem item = new PoItem();
                item.setPurchaseOrder(savedPo);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantityOrdered(itemDto.getQuantityOrdered());
                item.setQuantityReceived(0); // Reset or Keep? Usually logic keeps received if partial, but here we assume editing draft.
                item.setUnitPrice(itemDto.getUnitPrice());
                item.setTotalLineAmount(itemDto.getTotalLineAmount());
                return item;
            }).collect(Collectors.toList());
            poItemRepository.saveAll(items);
            savedPo.setItems(items);
        }

        return mapToDTO(savedPo);
    }

    @Override
    public void deletePO(Integer id) {
        poRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void approvePO(Integer id) {
        PurchaseOrder po = poRepository.findById(id).orElseThrow();
        po.setStatus(PoStatus.APPROVED);
        poRepository.save(po);
    }

    @Override
    @Transactional
    public void completePO(Integer id) {
        PurchaseOrder po = poRepository.findById(id).orElseThrow();
        po.setStatus(PoStatus.COMPLETED);
        poRepository.save(po);
    }

    @Override
    @Transactional
    public void cancelPO(Integer id) {
        PurchaseOrder po = poRepository.findById(id).orElseThrow();
        po.setStatus(PoStatus.CANCELLED);
        poRepository.save(po);
    }

    @Override
    public PurchaseOrderDTO getDataFromQuotation(Integer quotationId) {
        // Fetch Quotation DTO
        QuotationDTO qDTO = quotationService.getQuotationById(quotationId);
        
        // Map to PO DTO structure
        PurchaseOrderDTO poDTO = new PurchaseOrderDTO();
        poDTO.setQuotationId(quotationId);
        poDTO.setSupplierId(qDTO.getSupplierId());
        poDTO.setSupplierName(qDTO.getSupplierName());
        poDTO.setTotalAmount(qDTO.getTotalAmount());
        
        // Map Items
        if (qDTO.getItems() != null) {
            List<PoItemDTO> poItems = qDTO.getItems().stream().map(qItem -> {
                PoItemDTO item = new PoItemDTO();
                item.setProductId(qItem.getProductId());
                item.setProductName(qItem.getProductName());
                item.setQuantityOrdered(qItem.getQuantity()); // Mapping Quantity
                item.setUnitPrice(qItem.getUnitPrice());
                item.setTotalLineAmount(qItem.getTotalLine());
                return item;
            }).collect(Collectors.toList());
            poDTO.setItems(poItems);
        }
        
        return poDTO;
    }

    @Override
    public boolean checkPoCodeExists(String poCode) {
        return poRepository.existsByPoCode(poCode);
    }

    private PurchaseOrderDTO mapToDTO(PurchaseOrder entity) {
        PurchaseOrderDTO dto = new PurchaseOrderDTO();
        dto.setPoId(entity.getPoId());
        dto.setPoCode(entity.getPoCode());
        dto.setSupplierId(entity.getSupplier().getSupplierId());
        dto.setSupplierName(entity.getSupplier().getSupplierName());
        dto.setOrderDate(entity.getOrderDate());
        dto.setExpectedDeliveryDate(entity.getExpectedDeliveryDate());
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setTaxAmount(entity.getTaxAmount());
        dto.setDiscountAmount(entity.getDiscountAmount());
        dto.setStatus(entity.getStatus().name());
        dto.setApprovedBy(entity.getApprovedBy());
        
        if (entity.getQuotation() != null) {
            dto.setQuotationId(entity.getQuotation().getQuotationId());
            dto.setQuotationCode(entity.getQuotation().getQuotationCode());
        }

        if (entity.getItems() != null) {
            dto.setItems(entity.getItems().stream().map(item -> {
                PoItemDTO itemDto = new PoItemDTO();
                itemDto.setPoItemId(item.getPoItemId());
                itemDto.setProductId(item.getProduct().getProductId());
                itemDto.setProductName(item.getProduct().getProductName());
                itemDto.setProductCode(item.getProduct().getSku());
                itemDto.setQuantityOrdered(item.getQuantityOrdered());
                itemDto.setQuantityReceived(item.getQuantityReceived());
                itemDto.setUnitPrice(item.getUnitPrice());
                itemDto.setTotalLineAmount(item.getTotalLineAmount());
                return itemDto;
            }).collect(Collectors.toList()));
        }
        return dto;
    }

    private void mapToEntity(PurchaseOrderDTO dto, PurchaseOrder entity) {
        entity.setPoCode(dto.getPoCode());
        entity.setOrderDate(dto.getOrderDate());
        entity.setExpectedDeliveryDate(dto.getExpectedDeliveryDate());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setTaxAmount(dto.getTaxAmount());
        entity.setDiscountAmount(dto.getDiscountAmount());
        entity.setStatus(dto.getStatus() != null ? PoStatus.valueOf(dto.getStatus()) : PoStatus.DRAFT);
        
        entity.setSupplier(supplierRepository.getReferenceById(dto.getSupplierId()));
        if (dto.getQuotationId() != null) {
            entity.setQuotation(quotationRepository.getReferenceById(dto.getQuotationId()));
        }
    }
}