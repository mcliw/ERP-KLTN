package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.QuotationDTO;
import erp.company.supplychain.dto.QuotationItemDTO;
import erp.company.supplychain.entity.PurchaseRequest;
import erp.company.supplychain.entity.Quotation;
import erp.company.supplychain.entity.QuotationItem;
import erp.company.supplychain.repository.ProductRepository;
import erp.company.supplychain.repository.PurchaseRequestRepository;
import erp.company.supplychain.repository.QuotationItemRepository; // Cần tạo repo này
import erp.company.supplychain.repository.QuotationRepository;
import erp.company.supplychain.repository.SupplierRepository;
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
public class QuotationServiceImpl implements QuotationService {

    private final QuotationRepository quotationRepository;
    private final QuotationItemRepository quotationItemRepository; // Cần thêm vào package repository
    private final PurchaseRequestRepository prRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    @Override
    public Page<QuotationDTO> getQuotations(String keyword, Integer supplierId, String status, Pageable pageable) {
        Specification<Quotation> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("quotationCode")), like), // RFQ Code
                        // Search by PR Code through relation
                        cb.like(cb.lower(root.get("purchaseRequest").get("prCode")), like)
                ));
            }
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplier").get("supplierId"), supplierId));
            }
            if (StringUtils.hasText(status)) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return quotationRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public QuotationDTO getQuotationById(Integer id) {
        return mapToDTO(quotationRepository.findById(id).orElseThrow());
    }

    @Override
    @Transactional
    public QuotationDTO createQuotation(QuotationDTO dto) {
        if (quotationRepository.existsByQuotationCode(dto.getQuotationCode())) {
            throw new RuntimeException("Mã báo giá (RFQ) đã tồn tại");
        }

        Quotation entity = new Quotation();
        mapToEntity(dto, entity);
        
        Quotation savedQuotation = quotationRepository.save(entity);

        // Save Items
        if (dto.getItems() != null) {
            List<QuotationItem> items = dto.getItems().stream().map(itemDto -> {
                QuotationItem item = new QuotationItem();
                item.setQuotation(savedQuotation);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantity(itemDto.getQuantity());
                item.setUnitPrice(itemDto.getUnitPrice());
                // totalLine is calculated/generated in DB or we can set it here if Entity allows
                // item.setTotalLine(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()))); 
                return item;
            }).collect(Collectors.toList());
            quotationItemRepository.saveAll(items);
            savedQuotation.setItems(items);
        }

        return mapToDTO(savedQuotation);
    }

    @Override
    @Transactional
    public QuotationDTO updateQuotation(Integer id, QuotationDTO dto) {
        Quotation entity = quotationRepository.findById(id).orElseThrow();
        
        // Validation: Không sửa nếu đã Approve/Selected
        if ("APPROVED".equals(entity.getStatus()) || Boolean.TRUE.equals(entity.getIsSelected())) {
            throw new RuntimeException("Không thể chỉnh sửa báo giá đã được duyệt hoặc đã chọn");
        }

        mapToEntity(dto, entity);
        Quotation savedQuotation = quotationRepository.save(entity);

        // Update Items: Delete old & insert new (Simple strategy)
        if (dto.getItems() != null) {
            // Cần phương thức deleteByQuotation_QuotationId trong Repo
            // quotationItemRepository.deleteByQuotation_QuotationId(id);
            // Ở đây tạm dùng clear list và save lại nếu CascadeType.ALL hoạt động
            entity.getItems().clear();
            
            List<QuotationItem> newItems = dto.getItems().stream().map(itemDto -> {
                QuotationItem item = new QuotationItem();
                item.setQuotation(savedQuotation);
                item.setProduct(productRepository.getReferenceById(itemDto.getProductId()));
                item.setQuantity(itemDto.getQuantity());
                item.setUnitPrice(itemDto.getUnitPrice());
                return item;
            }).collect(Collectors.toList());
            
            entity.getItems().addAll(newItems);
            quotationItemRepository.saveAll(newItems);
        }

        return mapToDTO(savedQuotation);
    }

    @Override
    @Transactional
    public void deleteQuotation(Integer id) {
        quotationRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void selectQuotation(Integer id) {
        Quotation selected = quotationRepository.findById(id).orElseThrow();
        
        // Logic: Bỏ chọn các báo giá khác của cùng PR (nếu business rule yêu cầu chỉ chọn 1 NCC)
        // List<Quotation> others = quotationRepository.findByPurchaseRequest_PrId(selected.getPurchaseRequest().getPrId());
        // others.forEach(q -> q.setIsSelected(false));
        // quotationRepository.saveAll(others);

        selected.setIsSelected(true);
        selected.setStatus("APPROVED"); // Auto approve when selected
        quotationRepository.save(selected);
    }

    @Override
    @Transactional
    public void approveQuotation(Integer id) {
        Quotation entity = quotationRepository.findById(id).orElseThrow();
        entity.setStatus("APPROVED");
        quotationRepository.save(entity);
    }

    @Override
    @Transactional
    public void rejectQuotation(Integer id) {
        Quotation entity = quotationRepository.findById(id).orElseThrow();
        entity.setStatus("REJECTED");
        entity.setIsSelected(false);
        quotationRepository.save(entity);
    }

    @Override
    public QuotationDTO initQuotationFromPr(Integer prId) {
        // Logic hỗ trợ FE: Lấy items từ PR để điền vào Form tạo Báo giá
        PurchaseRequest pr = prRepository.findById(prId).orElseThrow();
        
        QuotationDTO dto = new QuotationDTO();
        dto.setPrId(prId);
        dto.setPrCode(pr.getPrCode());
        
        // Map PR Items -> Quotation Items DTO
        if (pr.getItems() != null) {
            List<QuotationItemDTO> items = pr.getItems().stream().map(prItem -> {
                QuotationItemDTO qItem = new QuotationItemDTO();
                qItem.setProductId(prItem.getProduct().getProductId());
                qItem.setProductName(prItem.getProduct().getProductName());
                qItem.setQuantity(prItem.getQuantityRequested());
                qItem.setUnitPrice(BigDecimal.ZERO); // Giá mặc định 0 chờ nhập
                return qItem;
            }).collect(Collectors.toList());
            dto.setItems(items);
        }
        return dto;
    }

    @Override
    public List<QuotationDTO> getAvailableQuotationsForPO() {
        // Query custom đã viết trong Repo: status='APPROVED' OR isSelected=true
        return quotationRepository.findAvailableForPo().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private QuotationDTO mapToDTO(Quotation entity) {
        QuotationDTO dto = new QuotationDTO();
        dto.setQuotationId(entity.getQuotationId());
        dto.setQuotationCode(entity.getQuotationCode());
        dto.setQuotationDate(entity.getQuotationDate());
        dto.setValidUntil(entity.getValidUntil());
        dto.setTotalAmount(entity.getTotalAmount());
        dto.setStatus(entity.getStatus());
        dto.setIsSelected(entity.getIsSelected());
        
        if (entity.getSupplier() != null) {
            dto.setSupplierId(entity.getSupplier().getSupplierId());
            dto.setSupplierName(entity.getSupplier().getSupplierName());
        }
        if (entity.getPurchaseRequest() != null) {
            dto.setPrId(entity.getPurchaseRequest().getPrId());
            dto.setPrCode(entity.getPurchaseRequest().getPrCode());
        }
        
        if (entity.getItems() != null) {
            dto.setItems(entity.getItems().stream().map(item -> {
                QuotationItemDTO itemDto = new QuotationItemDTO();
                itemDto.setQuotationItemId(item.getQuotationItemId());
                itemDto.setProductId(item.getProduct().getProductId());
                itemDto.setProductName(item.getProduct().getProductName());
                itemDto.setQuantity(item.getQuantity());
                itemDto.setUnitPrice(item.getUnitPrice());
                itemDto.setTotalLine(item.getTotalLine()); // Generated column
                return itemDto;
            }).collect(Collectors.toList()));
        }
        
        return dto;
    }

    private void mapToEntity(QuotationDTO dto, Quotation entity) {
        entity.setQuotationCode(dto.getQuotationCode());
        entity.setQuotationDate(dto.getQuotationDate());
        entity.setValidUntil(dto.getValidUntil());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setStatus(dto.getStatus());
        entity.setIsSelected(dto.getIsSelected());
        
        entity.setSupplier(supplierRepository.getReferenceById(dto.getSupplierId()));
        if (dto.getPrId() != null) {
            entity.setPurchaseRequest(prRepository.getReferenceById(dto.getPrId()));
        }
    }
}