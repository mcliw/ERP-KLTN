package erp.company.supplychain.services;

import erp.company.supplychain.dto.ProductCategoryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductCategoryService {
    // Table + Filter: Lọc theo cha, từ khóa, trạng thái
    Page<ProductCategoryDTO> getCategories(String keyword, Integer parentId, String status, Pageable pageable);

    ProductCategoryDTO getCategoryById(Integer id);

    ProductCategoryDTO createCategory(ProductCategoryDTO categoryDTO);

    ProductCategoryDTO updateCategory(Integer id, ProductCategoryDTO categoryDTO);

    void deleteCategory(Integer id);

    // Dropdown (Form chọn cha, ProductForm): Lấy danh mục đang hoạt động
    List<ProductCategoryDTO> getActiveCategories();
}