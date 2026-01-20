package erp.company.supplychain.services.impl;

import erp.company.supplychain.dto.ProductCategoryDTO;
import erp.company.supplychain.entity.ProductCategory;
import erp.company.supplychain.repository.ProductCategoryRepository;
import erp.company.supplychain.services.ProductCategoryService;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductCategoryServiceImpl implements ProductCategoryService {

    private final ProductCategoryRepository categoryRepository;

    @Override
    public Page<ProductCategoryDTO> getCategories(String keyword, Integer parentId, String status, Pageable pageable) {
        Specification<ProductCategory> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (StringUtils.hasText(keyword)) {
                predicates.add(cb.like(cb.lower(root.get("categoryName")), "%" + keyword.toLowerCase() + "%"));
            }
            if (parentId != null) {
                predicates.add(cb.equal(root.get("parent").get("categoryId"), parentId));
            }
            if (StringUtils.hasText(status)) {
                // Giả sử status lưu dạng String trong DB như JS service (Hoạt động/Ngừng hoạt động)
                // Hoặc map sang Enum nếu Entity dùng Enum
                predicates.add(cb.equal(root.get("status"), status));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return categoryRepository.findAll(spec, pageable).map(this::mapToDTO);
    }

    @Override
    public ProductCategoryDTO getCategoryById(Integer id) {
        return mapToDTO(categoryRepository.findById(id).orElseThrow());
    }

    @Override
    @Transactional
    public ProductCategoryDTO createCategory(ProductCategoryDTO dto) {
        ProductCategory entity = new ProductCategory();
        mapToEntity(dto, entity);
        return mapToDTO(categoryRepository.save(entity));
    }

    @Override
    @Transactional
    public ProductCategoryDTO updateCategory(Integer id, ProductCategoryDTO dto) {
        ProductCategory entity = categoryRepository.findById(id).orElseThrow();
        
        // Business Rule: Circular Dependency Check
        if (dto.getParentId() != null && dto.getParentId().equals(id)) {
            throw new RuntimeException("Danh mục cha không thể là chính nó");
        }
        // Nâng cao: Check nếu parent mới là con cháu của category hiện tại (đệ quy) - Tạm bỏ qua cho đơn giản

        mapToEntity(dto, entity);
        return mapToDTO(categoryRepository.save(entity));
    }

    @Override
    @Transactional
    public void deleteCategory(Integer id) {
        // Soft delete logic: Update status to "Ngừng hoạt động"
        // Hoặc hard delete nếu chưa có sản phẩm con
        ProductCategory entity = categoryRepository.findById(id).orElseThrow();
        // entity.setStatus("Ngừng hoạt động"); // Nếu entity có trường status
        // categoryRepository.save(entity);
        categoryRepository.deleteById(id);
    }

    @Override
    public List<ProductCategoryDTO> getActiveCategories() {
        // Logic lấy danh mục hoạt động cho dropdown form
        return categoryRepository.findByStatus("Hoạt động").stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    private ProductCategoryDTO mapToDTO(ProductCategory entity) {
        ProductCategoryDTO dto = new ProductCategoryDTO();
        dto.setCategoryId(entity.getCategoryId());
        dto.setCategoryName(entity.getCategoryName());
        dto.setDescription(entity.getDescription());
        dto.setStatus(entity.getStatus());
        
        if (entity.getParent() != null) {
            dto.setParentId(entity.getParent().getCategoryId());
            dto.setParentName(entity.getParent().getCategoryName());
        }
        return dto;
    }

    private void mapToEntity(ProductCategoryDTO dto, ProductCategory entity) {
        entity.setCategoryName(dto.getCategoryName());
        entity.setDescription(dto.getDescription());
        entity.setStatus(dto.getStatus());
        
        if (dto.getParentId() != null) {
            ProductCategory parent = categoryRepository.findById(dto.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent category not found"));
            entity.setParent(parent);
        } else {
            entity.setParent(null);
        }
    }
}