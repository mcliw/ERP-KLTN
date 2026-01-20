package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.InventoryDTO;
import erp.company.supplychain.entity.CurrentStock;
import erp.company.supplychain.entity.InventoryLog;
import erp.company.supplychain.entity.enums.TransactionType;
import erp.company.supplychain.repository.BinLocationRepository;
import erp.company.supplychain.repository.CurrentStockRepository;
import erp.company.supplychain.repository.InventoryLogRepository;
import erp.company.supplychain.repository.ProductRepository;
import erp.company.supplychain.repository.WarehouseRepository;
import erp.company.supplychain.services.InventoryService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final CurrentStockRepository stockRepository;
    private final InventoryLogRepository logRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final BinLocationRepository binRepository;

    @Override
    public Page<InventoryDTO> getCurrentStock(String keyword, Integer warehouseId, String stockStatus, Pageable pageable) {
        Specification<CurrentStock> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("product").get("productName")), like),
                        cb.like(cb.lower(root.get("product").get("sku")), like)
                ));
            }
            if (warehouseId != null) {
                predicates.add(cb.equal(root.get("warehouse").get("warehouseId"), warehouseId));
            }
            
            // Logic filter theo Status (AVAILABLE, OUT_OF_STOCK...)
            // Cột quantityAvailable là computed, nhưng trong JPA Criteria có thể query được
            if ("AVAILABLE".equals(stockStatus)) {
                predicates.add(cb.greaterThan(root.get("quantityAvailable"), 0));
            } else if ("OUT_OF_STOCK".equals(stockStatus)) {
                predicates.add(cb.equal(root.get("quantityAvailable"), 0));
            } else if ("LOW_STOCK".equals(stockStatus)) {
                predicates.add(cb.lessThan(root.get("quantityOnHand"), 10)); // Ví dụ threshold
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return stockRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public InventoryDTO getStockDetail(Integer stockId) {
        return mapToDTO(stockRepository.findById(stockId).orElseThrow());
    }

    @Override
    public InventoryDTO getStockByLocation(Integer warehouseId, Integer binId, Integer productId) {
        Optional<CurrentStock> stock;
        if (binId != null) {
            stock = stockRepository.findByWarehouse_WarehouseIdAndProduct_ProductIdAndBinLocation_BinId(warehouseId, productId, binId);
        } else {
            stock = stockRepository.findByWarehouse_WarehouseIdAndProduct_ProductIdAndBinLocationIsNull(warehouseId, productId);
        }
        return stock.map(this::mapToDTO).orElse(null);
    }

    @Override
    @Transactional
    public InventoryDTO adjustStock(InventoryDTO dto) {
        // 1. Tìm hoặc tạo mới record CurrentStock
        CurrentStock stock = null;
        if (dto.getStockId() != null) {
            stock = stockRepository.findById(dto.getStockId())
                    .orElseThrow(() -> new RuntimeException("Stock not found"));
        } else {
            // Check existing logic (unique constraint warehouse-bin-product)
            InventoryDTO existing = getStockByLocation(dto.getWarehouseId(), dto.getBinId(), dto.getProductId());
            if (existing != null) {
                stock = stockRepository.findById(existing.getStockId()).orElseThrow();
            } else {
                stock = new CurrentStock();
                stock.setWarehouse(warehouseRepository.getReferenceById(dto.getWarehouseId()));
                stock.setProduct(productRepository.getReferenceById(dto.getProductId()));
                if (dto.getBinId() != null) {
                    stock.setBinLocation(binRepository.getReferenceById(dto.getBinId()));
                }
            }
        }

        // 2. Tính chênh lệch để ghi log
        int oldQty = stock.getQuantityOnHand() != null ? stock.getQuantityOnHand() : 0;
        int newQty = dto.getQuantityOnHand();
        int diff = newQty - oldQty;

        // 3. Cập nhật Stock
        stock.setQuantityOnHand(newQty);
        stock.setQuantityAllocated(dto.getQuantityAllocated() != null ? dto.getQuantityAllocated() : 0);
        stock.setNotes(dto.getNotes());
        
        CurrentStock savedStock = stockRepository.save(stock);

        // 4. Ghi Log nếu có thay đổi
        if (diff != 0) {
            InventoryLog log = new InventoryLog();
            log.setTransactionType(TransactionType.ADJUSTMENT);
            log.setProduct(stock.getProduct());
            log.setWarehouse(stock.getWarehouse());
            log.setBinLocation(stock.getBinLocation());
            log.setQuantityChange(diff);
            log.setTransactionDate(LocalDateTime.now());
            log.setReferenceCode("MANUAL-ADJ-" + savedStock.getStockId());
            log.setPerformedBy(1); // Hardcode user ID hoặc lấy từ SecurityContext
            logRepository.save(log);
        }

        return mapToDTO(savedStock);
    }

    private InventoryDTO mapToDTO(CurrentStock entity) {
        InventoryDTO dto = new InventoryDTO();
        dto.setStockId(entity.getStockId());
        dto.setQuantityOnHand(entity.getQuantityOnHand());
        dto.setQuantityAllocated(entity.getQuantityAllocated());
        // Lấy từ DB generated column
        dto.setQuantityAvailable(entity.getQuantityAvailable()); 
        dto.setNotes(entity.getNotes());
        dto.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getWarehouse() != null) {
            dto.setWarehouseId(entity.getWarehouse().getWarehouseId());
            dto.setWarehouseName(entity.getWarehouse().getWarehouseName());
        }
        if (entity.getProduct() != null) {
            dto.setProductId(entity.getProduct().getProductId());
            dto.setProductName(entity.getProduct().getProductName());
            dto.setProductSku(entity.getProduct().getSku());
        }
        if (entity.getBinLocation() != null) {
            dto.setBinId(entity.getBinLocation().getBinId());
            dto.setBinCode(entity.getBinLocation().getBinCode());
        }
        return dto;
    }
}