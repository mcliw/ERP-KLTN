package erp.company.supplychain.repository;

import erp.company.supplychain.entity.ProductCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductCategoryRepository extends JpaRepository<ProductCategory, Integer>, JpaSpecificationExecutor<ProductCategory> {

    // Dropdown: Lấy danh mục hoạt động để chọn làm cha (ProductCategoryForm)
    // và chọn danh mục cho sản phẩm (ProductForm)
    List<ProductCategory> findByStatus(String status);

    // Filter: Lấy các danh mục con
    List<ProductCategory> findByParent_CategoryId(Integer parentId);
}