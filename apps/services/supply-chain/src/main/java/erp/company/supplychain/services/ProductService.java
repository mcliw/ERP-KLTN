package erp.company.supplychain.services;

import erp.company.supplychain.dto.ProductDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {
    // Table + Filter: Lọc đa điều kiện
    Page<ProductDTO> getProducts(String keyword, Integer categoryId, String type, String status, Pageable pageable);

    ProductDTO getProductById(Integer id);

    ProductDTO createProduct(ProductDTO productDTO);

    ProductDTO updateProduct(Integer id, ProductDTO productDTO);

    void deleteProduct(Integer id);

    // Form Action: Sinh mã SKU tự động dựa trên Category và Brand
    String generateSku(Integer categoryId, String brand);

    // Validation: Check trùng SKU
    boolean checkSkuExists(String sku);

    // Dropdown (PR, PO, Inventory Form): Lấy sản phẩm active
    List<ProductDTO> getActiveProducts();
}