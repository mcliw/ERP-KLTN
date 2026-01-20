package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.ProductDTO;
import erp.company.supplychain.entity.Product;
import erp.company.supplychain.entity.ProductCategory;
import erp.company.supplychain.repository.ProductCategoryRepository;
import erp.company.supplychain.repository.ProductRepository;
import erp.company.supplychain.services.ProductService;
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
import java.util.Random;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductCategoryRepository categoryRepository;

    @Override
    public Page<ProductDTO> getProducts(String keyword, Integer categoryId, String type, String status, Pageable pageable) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                String like = "%" + keyword.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("productName")), like),
                        cb.like(cb.lower(root.get("sku")), like)
                ));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("categoryId"), categoryId));
            }
            if (StringUtils.hasText(type)) {
                // FE gửi "Hàng hóa kinh doanh" -> Map sang Enum nếu cần, hoặc lưu String nếu DB chưa strict
                // Giả sử DB dùng Enum:
                // predicates.add(cb.equal(root.get("productType"), ProductType.valueOf(type)));
            }
            if (StringUtils.hasText(status)) {
                 predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return productRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public ProductDTO getProductById(Integer id) {
        return mapToDTO(productRepository.findById(id).orElseThrow());
    }

    @Override
    @Transactional
    public ProductDTO createProduct(ProductDTO dto) {
        if (checkSkuExists(dto.getSku())) {
            throw new RuntimeException("Mã SKU đã tồn tại");
        }
        Product entity = new Product();
        mapToEntity(dto, entity);
        return mapToDTO(productRepository.save(entity));
    }

    @Override
    @Transactional
    public ProductDTO updateProduct(Integer id, ProductDTO dto) {
        Product entity = productRepository.findById(id).orElseThrow();
        if (!entity.getSku().equals(dto.getSku()) && checkSkuExists(dto.getSku())) {
            throw new RuntimeException("Mã SKU đã tồn tại");
        }
        mapToEntity(dto, entity);
        return mapToDTO(productRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteProduct(Integer id) {
        Product entity = productRepository.findById(id).orElseThrow();
        // Soft delete logic
        entity.setStatus("Ngừng hoạt động");
        productRepository.save(entity);
    }

    @Override
    public String generateSku(Integer categoryId, String brand) {
        // Logic mô phỏng frontend logic
        ProductCategory cat = categoryRepository.findById(categoryId).orElse(null);
        String catPrefix = (cat != null && cat.getCategoryName().length() >= 3) 
                ? cat.getCategoryName().substring(0, 3).toUpperCase() : "CAT";
        String brandPrefix = (brand != null && brand.length() >= 3) 
                ? brand.substring(0, 3).toUpperCase() : "GEN";
        
        int randomNum = new Random().nextInt(9000) + 1000;
        return String.format("%s-%s-%d", catPrefix, brandPrefix, randomNum);
    }

    @Override
    public boolean checkSkuExists(String sku) {
        return productRepository.existsBySku(sku);
    }

    @Override
    public List<ProductDTO> getActiveProducts() {
        return productRepository.findByStatus("Hoạt động").stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private ProductDTO mapToDTO(Product entity) {
        ProductDTO dto = new ProductDTO();
        dto.setProductId(entity.getProductId());
        dto.setSku(entity.getSku());
        dto.setProductName(entity.getProductName());
        dto.setBrand(entity.getBrand());
        dto.setUnitOfMeasure(entity.getUnitOfMeasure());
        dto.setMinStockLevel(entity.getMinStockLevel());
        dto.setWarrantyMonths(entity.getWarrantyMonths());
        dto.setImageUrl(entity.getImageUrl());
        dto.setStatus(entity.getStatus());
        dto.setDescription(entity.getDescription());
        
        if (entity.getCategory() != null) {
            dto.setCategoryId(entity.getCategory().getCategoryId());
            dto.setCategoryName(entity.getCategory().getCategoryName());
        }
        
        // Map Enum to String for FE Form
        if (entity.getProductType() != null) {
            // Logic map ngược lại với FE Select options
            dto.setProductType(entity.getProductType().name()); 
        }
        return dto;
    }

    private void mapToEntity(ProductDTO dto, Product entity) {
        entity.setSku(dto.getSku());
        entity.setProductName(dto.getProductName());
        entity.setBrand(dto.getBrand());
        entity.setUnitOfMeasure(dto.getUnitOfMeasure());
        entity.setMinStockLevel(dto.getMinStockLevel());
        entity.setWarrantyMonths(dto.getWarrantyMonths());
        entity.setImageUrl(dto.getImageUrl());
        entity.setStatus(dto.getStatus());
        entity.setDescription(dto.getDescription());
        
        if (dto.getCategoryId() != null) {
            ProductCategory cat = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            entity.setCategory(cat);
        }
        
        // Map String from FE to Enum
        // FE gửi "Hàng hóa kinh doanh" -> Cần logic convert. Tạm thời set null hoặc default
        // entity.setProductType(ProductType.RAW_MATERIAL); 
    }
}