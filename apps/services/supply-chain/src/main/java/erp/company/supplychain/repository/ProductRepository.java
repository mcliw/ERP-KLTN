package erp.company.supplychain.repository;

import erp.company.supplychain.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer>, JpaSpecificationExecutor<Product> {

    // Validation: Check trùng SKU (ProductForm)
    boolean existsBySku(String sku);

    // Lookup: Tìm theo SKU (Dùng khi import excel hoặc scan barcode)
    Optional<Product> findBySku(String sku);

    // Dropdown: Lấy sản phẩm đang hoạt động cho các Form mua hàng/kho
    List<Product> findByStatus(String status);
    
    // Filter nhanh
    List<Product> findByCategory_CategoryId(Integer categoryId);
}